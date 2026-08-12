import json
import os
from contextlib import contextmanager
from pathlib import Path
from datetime import datetime, timezone
from threading import Lock
from time import monotonic, sleep

import pandas as pd
import pymysql
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from database import conectar
from config import CORS_ORIGINS

app = FastAPI()

BASE_DIR = Path(__file__).resolve().parent
CLASIFICACION_PATH = BASE_DIR / "clasificacion.csv"
INVENTARIO_ENLACES_PATH = BASE_DIR / "data" / "inventario_trafico_enlaces.json"
CACHE_TTL_SEGUNDOS = max(1, int(os.getenv("CACHE_TTL_SEGUNDOS", "180")))
TRAFICO_CACHE = {"datos": None, "vence": 0.0}
TRAFICO_CACHE_LOCK = Lock()
BILLS_CACHE = {"datos": None, "vence": 0.0}
BILLS_CACHE_LOCK = Lock()
INVENTARIO_SQL_CACHE = {"datos": None, "vence": 0.0}
INVENTARIO_SQL_CACHE_LOCK = Lock()

RUTA_CPU_CONFIGURADA = os.getenv("INVENTARIO_CPU_FILE", "").strip()
if RUTA_CPU_CONFIGURADA:
    INVENTARIO_CPU_PATH = Path(RUTA_CPU_CONFIGURADA).expanduser()
    if not INVENTARIO_CPU_PATH.is_absolute():
        INVENTARIO_CPU_PATH = BASE_DIR / INVENTARIO_CPU_PATH
else:
    INVENTARIO_CPU_PATH = BASE_DIR / "data" / "inventario_trafico_cpu.json"
INVENTARIO_CPU_PATH = INVENTARIO_CPU_PATH.resolve()
INVENTARIO_CPU_LOCK_PATH = Path(f"{INVENTARIO_CPU_PATH}.lock")


@contextmanager
def bloquear_cpu_inventario(timeout=15):
    INVENTARIO_CPU_LOCK_PATH.parent.mkdir(parents=True, exist_ok=True)
    archivo_lock = INVENTARIO_CPU_LOCK_PATH.open("a+b")
    limite = monotonic() + timeout
    bloqueado = False

    try:
        if os.name == "nt":
            import msvcrt

            archivo_lock.seek(0, os.SEEK_END)
            if archivo_lock.tell() == 0:
                archivo_lock.write(b"0")
                archivo_lock.flush()

            while not bloqueado:
                try:
                    archivo_lock.seek(0)
                    msvcrt.locking(archivo_lock.fileno(), msvcrt.LK_NBLCK, 1)
                    bloqueado = True
                except OSError:
                    if monotonic() >= limite:
                        raise TimeoutError("No se pudo bloquear el archivo de CPU")
                    sleep(0.05)
        else:
            import fcntl

            while not bloqueado:
                try:
                    fcntl.flock(archivo_lock.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
                    bloqueado = True
                except BlockingIOError:
                    if monotonic() >= limite:
                        raise TimeoutError("No se pudo bloquear el archivo de CPU")
                    sleep(0.05)

        yield
    finally:
        if bloqueado:
            archivo_lock.seek(0)
            if os.name == "nt":
                import msvcrt
                msvcrt.locking(archivo_lock.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                import fcntl
                fcntl.flock(archivo_lock.fileno(), fcntl.LOCK_UN)
        archivo_lock.close()


def cargar_clasificacion():
    clasificacion = pd.read_csv(CLASIFICACION_PATH)
    return clasificacion.fillna("")


def obtener_ids_clasificados(clasificacion):
    return clasificacion["bill_id"].astype(int).tolist()


def crear_mapa_clasificacion(clasificacion):
    return clasificacion.set_index("bill_id").to_dict("index")


def consultar_bd(sql, parametros=None):
    conn = conectar()
    cursor = conn.cursor(pymysql.cursors.DictCursor)

    try:
        cursor.execute(sql, parametros)
        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()


def obtener_con_cache(cache, lock, cargador):
    ahora = monotonic()
    if cache["datos"] is not None and ahora < cache["vence"]:
        return cache["datos"]

    with lock:
        ahora = monotonic()
        if cache["datos"] is not None and ahora < cache["vence"]:
            return cache["datos"]

        datos = cargador()
        cache["datos"] = datos
        cache["vence"] = monotonic() + CACHE_TTL_SEGUNDOS
        return datos


def cargar_enlaces_inventario():
    try:
        contenido = json.loads(
            INVENTARIO_ENLACES_PATH.read_text(encoding="utf-8")
        )
        lugares = {
            "Lima": contenido["nodos"],
            "Provincia": contenido.get("provincia", {})
        }
    except (OSError, json.JSONDecodeError, KeyError) as error:
        raise RuntimeError(
            "El catálogo de enlaces del inventario no se puede leer"
        ) from error

    if not all(isinstance(nodos, dict) for nodos in lugares.values()):
        raise RuntimeError("El catálogo de enlaces tiene un formato inválido")

    resultado = {}
    for lugar, nodos in lugares.items():
        resultado[lugar] = {}
        for nodo, bill_ids in nodos.items():
            if not isinstance(nodo, str) or not isinstance(bill_ids, list):
                raise RuntimeError("El catálogo de enlaces tiene un formato inválido")
            resultado[lugar][nodo] = [int(bill_id) for bill_id in bill_ids]

    return resultado


INVENTARIO_ENLACES_POR_LUGAR = cargar_enlaces_inventario()
INVENTARIO_BILL_IDS = tuple(dict.fromkeys(
    bill_id
    for nodos in INVENTARIO_ENLACES_POR_LUGAR.values()
    for bill_ids in nodos.values()
    for bill_id in bill_ids
))
INVENTARIO_NODOS_POR_BILL = {
    bill_id: [
        nodo
        for nodos in INVENTARIO_ENLACES_POR_LUGAR.values()
        for nodo, bill_ids in nodos.items()
        if bill_id in bill_ids
    ]
    for bill_id in INVENTARIO_BILL_IDS
}
INVENTARIO_LUGARES_POR_BILL = {
    bill_id: [
        lugar
        for lugar, nodos in INVENTARIO_ENLACES_POR_LUGAR.items()
        if any(bill_id in bill_ids for bill_ids in nodos.values())
    ]
    for bill_id in INVENTARIO_BILL_IDS
}


class CpuInventario(BaseModel):
    bill_id: int
    anio: int = Field(ge=2000, le=2100)
    mes: int = Field(ge=1, le=12)
    cpu_maximo: float | None = Field(default=None, ge=0, le=100)
    cpu_promedio: float | None = Field(default=None, ge=0, le=100)


class CpuInventarioLote(BaseModel):
    registros: list[CpuInventario]


def leer_cpu_inventario():
    if not INVENTARIO_CPU_PATH.exists():
        return {"version": 1, "actualizado_en": None, "registros": {}}

    try:
        contenido = json.loads(INVENTARIO_CPU_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise RuntimeError("El archivo de CPU no se puede leer") from error

    if not isinstance(contenido, dict) or not isinstance(contenido.get("registros"), dict):
        raise RuntimeError("El archivo de CPU tiene un formato inválido")

    return contenido


def escribir_cpu_inventario(contenido):
    INVENTARIO_CPU_PATH.parent.mkdir(parents=True, exist_ok=True)
    temporal = Path(f"{INVENTARIO_CPU_PATH}.tmp")
    with temporal.open("w", encoding="utf-8") as archivo:
        json.dump(contenido, archivo, ensure_ascii=False, indent=2)
        archivo.write("\n")
        archivo.flush()
        os.fsync(archivo.fileno())
    os.replace(temporal, INVENTARIO_CPU_PATH)


app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def inicio():
    return {
        "mensaje": "Traffic Accounting API"
    }


def consultar_bills_bd():
    try:
        clasificacion = cargar_clasificacion()
        ids_clasificados = obtener_ids_clasificados(clasificacion)
        clasificacion_map = crear_mapa_clasificacion(clasificacion)

        if not ids_clasificados:
            return []

        sql = f"""
            SELECT
                bill_id,
                bill_name
            FROM bills
            WHERE bill_id IN ({','.join(map(str, ids_clasificados))})
            ORDER BY bill_name
        """

        bills_bd = consultar_bd(sql)

        resultado = []

        for bill in bills_bd:
            datos_clasificacion = clasificacion_map.get(bill["bill_id"], {})

            resultado.append({
                "bill_id": bill["bill_id"],
                "bill_name": bill["bill_name"],
                "grupo": datos_clasificacion.get("grupo", "SIN CLASIFICAR"),
                "subgrupo": datos_clasificacion.get("subgrupo", ""),
                "anillo": datos_clasificacion.get("anillo", "")
            })

        return resultado

    except Exception as error:
        print(f"Error al consultar bills: {error}")
        raise HTTPException(
            status_code=500,
            detail="No se pudo consultar la lista de enlaces"
        ) from error


@app.get("/bills")
def bills():
    return obtener_con_cache(
        BILLS_CACHE,
        BILLS_CACHE_LOCK,
        consultar_bills_bd
    )


def consultar_trafico_bd():
    clasificacion = cargar_clasificacion()
    ids_clasificados = obtener_ids_clasificados(clasificacion)
    clasificacion_map = crear_mapa_clasificacion(clasificacion)

    if not ids_clasificados:
        return []

    sql = f"""
        SELECT
            b.bill_name,
            bh.bill_id,
            YEAR(bh.bill_datefrom) AS anio,
            MONTH(bh.bill_datefrom) AS mes,
            DATE_FORMAT(bh.bill_datefrom, '%b-%Y') AS periodo,
            CONCAT(
                DATE_FORMAT(bh.bill_datefrom, '%Y-%m-%d'),
                ' hasta ',
                DATE_FORMAT(bh.bill_dateto, '%Y-%m-%d')
            ) AS periodo_completo,
            ROUND(bh.bill_allowed / (1000 * 1000 * 1000), 3) AS capacidad,
            ROUND(bh.rate_95th_in / (1000 * 1000 * 1000), 9) AS inbound,
            ROUND(bh.rate_95th_out / (1000 * 1000 * 1000), 9) AS outbound,
            ROUND(bh.rate_95th / (1000 * 1000 * 1000), 9) AS uso,
            ROUND(bh.bill_percent, 2) AS porcentaje_uso
        FROM bill_history bh
        JOIN bills b
            ON bh.bill_id = b.bill_id
        WHERE bh.bill_id IN ({','.join(map(str, ids_clasificados))})
        ORDER BY
            bh.bill_id,
            bh.bill_datefrom DESC
    """

    datos = consultar_bd(sql)

    resultado = []

    for item in datos:
        datos_clasificacion = clasificacion_map.get(item["bill_id"], {})

        resultado.append({
            "bill_id": item["bill_id"],
            "bill_name": item["bill_name"],
            "grupo": datos_clasificacion.get("grupo", "SIN CLASIFICAR"),
            "subgrupo": datos_clasificacion.get("subgrupo", ""),
            "anillo": datos_clasificacion.get("anillo", ""),
            "anio": item["anio"],
            "mes": item["mes"],
            "periodo": item["periodo"],
            "periodo_completo": item["periodo_completo"],
            "capacidad": item["capacidad"],
            "inbound": item["inbound"],
            "outbound": item["outbound"],
            "uso": item["uso"],
            "porcentaje_uso": item["porcentaje_uso"]
        })

    return resultado


def obtener_trafico():
    return obtener_con_cache(
        TRAFICO_CACHE,
        TRAFICO_CACHE_LOCK,
        consultar_trafico_bd
    )


@app.get("/trafico")
def trafico():
    try:
        return obtener_trafico()
    except Exception as error:
        print(f"Error al consultar tráfico: {error}")
        raise HTTPException(
            status_code=500,
            detail="No se pudieron consultar los datos de tráfico"
        ) from error


def consultar_inventario_bd():
    if not INVENTARIO_BILL_IDS:
        return {"trafico": [], "enlaces": []}

    ids = ",".join(map(str, INVENTARIO_BILL_IDS))
    sql = f"""
        SELECT
            b.bill_id,
            b.bill_name,
            YEAR(bh.bill_datefrom) AS anio,
            MONTH(bh.bill_datefrom) AS mes,
            ROUND(bh.bill_allowed / 1000000000, 3) AS capacidad,
            ROUND(bh.rate_95th / 1000000000, 9) AS consumo,
            ROUND(
                CASE
                    WHEN bh.bill_allowed > 0
                    THEN (bh.rate_95th / bh.bill_allowed) * 100
                    ELSE NULL
                END,
                2
            ) AS porcentaje_uso
        FROM bill_history bh
        JOIN bills b ON b.bill_id = bh.bill_id
        WHERE bh.bill_id IN ({ids})
        ORDER BY bh.bill_datefrom DESC, b.bill_name
    """
    trafico = consultar_bd(sql)

    enlaces_bd = consultar_bd(f"""
        SELECT bill_id, bill_name
        FROM bills
        WHERE bill_id IN ({ids})
        ORDER BY bill_name
    """)
    enlaces = [
        {
            "bill_id": enlace["bill_id"],
            "bill_name": enlace["bill_name"],
            "nodos": INVENTARIO_NODOS_POR_BILL.get(enlace["bill_id"], []),
            "lugares": INVENTARIO_LUGARES_POR_BILL.get(enlace["bill_id"], [])
        }
        for enlace in enlaces_bd
    ]
    return {"trafico": trafico, "enlaces": enlaces}


@app.get("/inventario-trafico")
def inventario_trafico():
    try:
        datos_sql = obtener_con_cache(
            INVENTARIO_SQL_CACHE,
            INVENTARIO_SQL_CACHE_LOCK,
            consultar_inventario_bd
        )

        with bloquear_cpu_inventario():
            archivo_cpu = leer_cpu_inventario()

        return {
            "trafico": datos_sql["trafico"],
            "cpu": list(archivo_cpu["registros"].values()),
            "enlaces": datos_sql["enlaces"],
            "bill_ids": list(INVENTARIO_BILL_IDS)
        }
    except Exception as error:
        print(f"Error al consultar inventario de tráfico: {error}")
        raise HTTPException(
            status_code=500,
            detail="No se pudo consultar el inventario de tráfico"
        ) from error


@app.put("/inventario-trafico/cpu")
def guardar_cpu_inventario(datos: CpuInventarioLote):
    ids_invalidos = [
        registro.bill_id
        for registro in datos.registros
        if registro.bill_id not in INVENTARIO_BILL_IDS
    ]
    if ids_invalidos:
        raise HTTPException(status_code=400, detail="Uno o más enlaces no pertenecen al inventario")

    try:
        with bloquear_cpu_inventario():
            contenido = leer_cpu_inventario()
            registros = contenido["registros"]

            for registro in datos.registros:
                clave = f"{registro.bill_id}-{registro.anio}-{registro.mes:02d}"
                if registro.cpu_maximo is None and registro.cpu_promedio is None:
                    registros.pop(clave, None)
                    continue

                registros[clave] = {
                    "bill_id": registro.bill_id,
                    "anio": registro.anio,
                    "mes": registro.mes,
                    "cpu_maximo": registro.cpu_maximo,
                    "cpu_promedio": registro.cpu_promedio
                }

            contenido["actualizado_en"] = datetime.now(timezone.utc).isoformat()
            escribir_cpu_inventario(contenido)

        return {
            "mensaje": "Datos de CPU guardados en el servidor",
            "registros_actualizados": len(datos.registros)
        }
    except Exception as error:
        print(f"Error al guardar CPU del inventario: {error}")
        raise HTTPException(
            status_code=500,
            detail="No se pudieron guardar los datos de CPU en el servidor"
        ) from error
