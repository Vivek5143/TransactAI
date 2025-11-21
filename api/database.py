import psycopg2
from psycopg2.pool import SimpleConnectionPool
from .config import DB_CONFIG

# Create a connection pool (min=1, max=10 connections)
pool = SimpleConnectionPool(
    1,
    10,
    host=DB_CONFIG["host"],
    database=DB_CONFIG["dbname"],
    user=DB_CONFIG["user"],
    password=DB_CONFIG["password"],
    port=DB_CONFIG["port"]
)

def get_conn():
    return pool.getconn()

def release_conn(conn):
    pool.putconn(conn)
