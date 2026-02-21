"""
Script para inicializar la base de datos
Ejecutar: python init_db.py
"""

import mysql.connector
from mysql.connector import Error
from config import settings
from app.database.schema import TABLAS

def crear_base_datos(drop_existing: bool = False):
    """Crear base de datos y todas las tablas"""
    print("Iniciando creacion de base de datos y tablas...\n")
    
    # Primero conectar SIN especificar BD para crear la BD
    try:
        print(f"1. Conectando a MySQL como {settings.DB_USER}...")
        connection = mysql.connector.connect(
            host=settings.DB_HOST,
            port=settings.DB_PORT,
            user=settings.DB_USER,
            password=settings.DB_PASSWORD
        )
        
        if connection.is_connected():
            print("[OK] Conectado a MySQL\n")
            cursor = connection.cursor()
            
            if drop_existing:
                # Eliminar BD existente si existe
                print(f"2. Eliminando base de datos existente '{settings.DB_NAME}' (si existe)...")
                cursor.execute(f"DROP DATABASE IF EXISTS {settings.DB_NAME}")
                print(f"[OK] Limpieza realizada\n")
            
            # Crear BD
            print(f"3. Creando base de datos '{settings.DB_NAME}'...")
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS {settings.DB_NAME}")
            print(f"[OK] Base de datos '{settings.DB_NAME}' creada\n")
            
            # Seleccionar BD
            cursor.execute(f"USE {settings.DB_NAME}")
            print(f"[OK] Usando base de datos '{settings.DB_NAME}'\n")
            
            # Crear tablas
            print("4. Creando tablas con asociaciones...")
            for i, tabla in enumerate(TABLAS, 1):
                try:
                    cursor.execute(tabla)
                    print(f"   [OK] Tabla {i} creada exitosamente")
                except Error as e:
                    print(f"   [ERROR] Error en tabla {i}: {e}")
            
            connection.commit()
            cursor.close()
            connection.close()
            print("\n[OK] Base de datos inicializada correctamente con asociaciones")
            return True
            
    except Error as e:
        print(f"[ERROR] Error: {e}")
        return False

if __name__ == "__main__":
    crear_base_datos(drop_existing=True)
