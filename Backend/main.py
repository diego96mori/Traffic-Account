from pathlib import Path

import pandas as pd
import pymysql
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from database import conectar
from config import CORS_ORIGINS

app = FastAPI()

BASE_DIR = Path(__file__).resolve().parent
CLASIFICACION_PATH = BASE_DIR / "clasificacion.csv"


def cargar_clasificacion():
    clasificacion = pd.read_csv(CLASIFICACION_PATH)
    return clasificacion.fillna("")


def obtener_ids_clasificados(clasificacion):
    return clasificacion["bill_id"].astype(int).tolist()


def crear_mapa_clasificacion(clasificacion):
    return clasificacion.set_index("bill_id").to_dict("index")


def consultar_bd(sql):
    conn = conectar()
    cursor = conn.cursor(pymysql.cursors.DictCursor)

    try:
        cursor.execute(sql)
        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()


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


@app.get("/bills")
def bills():
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


@app.get("/trafico")
def trafico():
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
