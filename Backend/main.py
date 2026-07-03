from fastapi import FastAPI
from database import conectar
import pymysql
import pandas as pd
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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

        # Leer clasificación
        clasificacion = pd.read_csv("clasificacion.csv")

        # Reemplazar vacíos
        clasificacion = clasificacion.fillna("")

        # Obtener lista de bill_id del CSV
        ids_clasificados = clasificacion["bill_id"].tolist()

        # Conexión BD
        conn = conectar()

        cursor = conn.cursor(pymysql.cursors.DictCursor)

        sql = f"""
            SELECT
                bill_id,
                bill_name
            FROM bills
            WHERE bill_id IN ({','.join(map(str, ids_clasificados))})
            ORDER BY bill_name
        """

        cursor.execute(sql)

        bills_bd = cursor.fetchall()

        cursor.close()
        conn.close()

        resultado = []

        for bill in bills_bd:

            fila = clasificacion[
                clasificacion["bill_id"] == bill["bill_id"]
            ]

            grupo = fila.iloc[0]["grupo"]
            subgrupo = fila.iloc[0]["subgrupo"]

            resultado.append({
                "bill_id": bill["bill_id"],
                "bill_name": bill["bill_name"],
                "grupo": grupo,
                "subgrupo": subgrupo
            })

        return resultado

    except Exception as e:

        return {
            "error": str(e)
        }
    

@app.get("/trafico")
def trafico():

    # Leer clasificación
    clasificacion = pd.read_csv("clasificacion.csv")
    clasificacion = clasificacion.fillna("")

    ids_clasificados = clasificacion["bill_id"].tolist()

    conn = conectar()

    cursor = conn.cursor(pymysql.cursors.DictCursor)

    sql = f"""
       SELECT
    b.bill_name,
    bh.bill_id,

    YEAR(bh.bill_datefrom) AS anio,

    MONTH(bh.bill_datefrom) AS mes,

    DATE_FORMAT(
        bh.bill_datefrom,
        '%b-%Y'
    ) AS periodo,

    CONCAT(
        DATE_FORMAT(bh.bill_datefrom,'%Y-%m-%d'),
        ' hasta ',
        DATE_FORMAT(bh.bill_dateto,'%Y-%m-%d')
    ) AS periodo_completo,

    ROUND(
        bh.bill_allowed/(1000*1000*1000),
        3
    ) AS capacidad,

    ROUND(
        bh.rate_95th_in/(1000*1000*1000),
        9
    ) AS inbound,

    ROUND(
        bh.rate_95th_out/(1000*1000*1000),
        9
    ) AS outbound,

    ROUND(
        bh.rate_95th/(1000*1000*1000),
        9
    ) AS uso,

    ROUND(
        bh.bill_percent,
        2
    ) AS porcentaje_uso

FROM bill_history bh

JOIN bills b
    ON bh.bill_id = b.bill_id

WHERE bh.bill_id IN ({','.join(map(str, ids_clasificados))})

ORDER BY
    bh.bill_id,
    bh.bill_datefrom DESC
    """

    cursor.execute(sql)

    datos = cursor.fetchall()

    cursor.close()
    conn.close()

    resultado = []

    for item in datos:

        fila = clasificacion[
            clasificacion["bill_id"] == item["bill_id"]
        ]

        if not fila.empty:

            grupo = fila.iloc[0]["grupo"]
            subgrupo = fila.iloc[0]["subgrupo"]

        else:

            grupo = "SIN CLASIFICAR"
            subgrupo = ""

        resultado.append({
            "bill_id": item["bill_id"],
    "bill_name": item["bill_name"],

    "grupo": grupo,
    "subgrupo": subgrupo,

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
