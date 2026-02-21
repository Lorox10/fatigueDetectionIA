import mysql.connector
from mysql.connector import Error
from config import settings
from typing import Optional

class Database:
    def __init__(self):
        self.connection = None
    
    def conectar(self):
        """Conectar a la base de datos MySQL"""
        try:
            self.connection = mysql.connector.connect(
                host=settings.DB_HOST,
                port=settings.DB_PORT,
                user=settings.DB_USER,
                password=settings.DB_PASSWORD,
                database=settings.DB_NAME
            )
            if self.connection.is_connected():
                print(f"[OK] Conectado a {settings.DB_NAME}")
                return True
        except Error as e:
            print(f"[ERROR] Error al conectar: {e}")
            return False
    
    def desconectar(self):
        """Desconectar de la base de datos"""
        if self.connection and self.connection.is_connected():
            self.connection.close()
            print("[OK] Desconectado de la BD")
    
    def ejecutar(self, query: str, params: tuple = None):
        """Ejecutar una consulta (INSERT, UPDATE, DELETE)"""
        try:
            cursor = self.connection.cursor()
            if params:
                cursor.execute(query, params)
            else:
                cursor.execute(query)
            self.connection.commit()
            return cursor.lastrowid
        except Error as e:
            print(f"Error en ejecutar: {e}")
            self.connection.rollback()
            return None
    
    def consultar(self, query: str, params: tuple = None):
        """Ejecutar una consulta SELECT"""
        try:
            cursor = self.connection.cursor(dictionary=True)
            if params:
                cursor.execute(query, params)
            else:
                cursor.execute(query)
            resultado = cursor.fetchall()
            return resultado
        except Error as e:
            print(f"Error en consultar: {e}")
            return None

def get_connection():
    """Crea y retorna una nueva conexión a la base de datos"""
    try:
        connection = mysql.connector.connect(
            host=settings.DB_HOST,
            port=settings.DB_PORT,
            user=settings.DB_USER,
            password=settings.DB_PASSWORD,
            database=settings.DB_NAME
        )
        return connection
    except Error as e:
        print(f"Error al conectar: {e}")
        return None

# Instancia global
db = Database()
