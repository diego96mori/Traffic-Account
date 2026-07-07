import pymysql
from config import *

def conectar():
    if not all([DB_HOST, DB_USER, DB_PASS, DB_NAME]):
        raise RuntimeError("Faltan variables de entorno de base de datos")

    return pymysql.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASS,
        database=DB_NAME
    )
