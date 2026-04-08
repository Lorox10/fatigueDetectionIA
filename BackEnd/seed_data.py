"""
Script para insertar datos de ejemplo (seed) en la base de datos.
Crea conductores con sesiones y telemetría realista.
"""
import sys
sys.path.insert(0, '/d/LORENZO/Escritorio/fatigueDetectionIA/BackEnd')

import mysql.connector
from datetime import datetime, timedelta
import random
from config import settings

# Configurar conexión
def get_connection():
    return mysql.connector.connect(
        host=settings.DB_HOST,
        user=settings.DB_USER,
        password=settings.DB_PASSWORD or "",
        database=settings.DB_NAME
    )

def clear_existing_data():
    """Limpia datos anteriores para evitar conflictos"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("DELETE FROM telemetria")
        cursor.execute("DELETE FROM sesiones")
        cursor.execute("DELETE FROM conductores")
        conn.commit()
        print("✓ Datos anteriores eliminados")
    except Exception as e:
        print(f"Error limpiando datos: {e}")
    finally:
        cursor.close()
        conn.close()

def create_sample_conductores():
    """Crea conductores de ejemplo"""
    conn = get_connection()
    cursor = conn.cursor()
    
    conductores = [
        ("Juan", "García López", "LIC001", "juan.garcia@transport.com", "555-1001"),
        ("Maria", "Rodríguez Pérez", "LIC002", "maria.rodriguez@transport.com", "555-1002"),
        ("Carlos", "Martínez Sánchez", "LIC003", "carlos.martinez@transport.com", "555-1003"),
        ("Ana", "López González", "LIC004", "ana.lopez@transport.com", "555-1004"),
        ("Pedro", "Fernández Ruiz", "LIC005", "pedro.fernandez@transport.com", "555-1005"),
    ]
    
    try:
        for nombre, apellidos, licencia, email, telefono in conductores:
            cursor.execute(
                """
                INSERT INTO conductores (nombre, apellidos, numero_licencia, email, telefono, activo)
                VALUES (%s, %s, %s, %s, %s, TRUE)
                """,
                (nombre, apellidos, licencia, email, telefono)
            )
        conn.commit()
        print(f"✓ {len(conductores)} conductores creados")
        return [i for i in range(1, len(conductores) + 1)]
    except Exception as e:
        print(f"Error creando conductores: {e}")
        conn.rollback()
        return []
    finally:
        cursor.close()
        conn.close()

def create_sample_sessions(conductor_ids):
    """Crea sesiones de ejemplo (viajes registrados)"""
    conn = get_connection()
    cursor = conn.cursor()
    
    sessions = []
    base_date = datetime.now() - timedelta(days=30)
    
    try:
        for conductor_id in conductor_ids:
            # Crear 4-6 sesiones por conductor
            num_sessions = random.randint(4, 6)
            
            for i in range(num_sessions):
                fecha_inicio = base_date + timedelta(days=random.randint(0, 30), hours=random.randint(6, 20))
                duracion_minutos = random.randint(45, 240)
                fecha_fin = fecha_inicio + timedelta(minutes=duracion_minutos)
                
                cursor.execute(
                    """
                    INSERT INTO sesiones (conductor_id, fecha_inicio, fecha_fin, duracion_minutos, estado)
                    VALUES (%s, %s, %s, %s, 'finalizada')
                    """,
                    (conductor_id, fecha_inicio, fecha_fin, duracion_minutos)
                )
                sessions.append((cursor.lastrowid, conductor_id, duracion_minutos))
        
        conn.commit()
        print(f"✓ {len(sessions)} sesiones creadas")
        return sessions
    except Exception as e:
        print(f"Error creando sesiones: {e}")
        conn.rollback()
        return []
    finally:
        cursor.close()
        conn.close()

def create_sample_telemetry(sessions):
    """Crea datos de telemetría realista para cada sesión"""
    conn = get_connection()
    cursor = conn.cursor()
    
    total_eventos = 0
    
    try:
        for sesion_id, conductor_id, duracion_minutos in sessions:
            # Generar eventos realistas basados en duración
            
            # Parpadeos: 15-25 por minuto
            num_parpadeos = int(duracion_minutos * random.uniform(15, 25))
            for _ in range(num_parpadeos):
                cursor.execute(
                    """
                    INSERT INTO telemetria (sesion_id, conductor_id, timestamp, tipo_evento, severidad, datos_adicionales)
                    VALUES (%s, %s, NOW(), %s, %s, NULL)
                    """,
                    (sesion_id, conductor_id, 'parpadeo', random.choice(['bajo', 'medio']))
                )
            
            # Bostezos: 0-8
            num_bostezos = random.randint(0, 8)
            for _ in range(num_bostezos):
                cursor.execute(
                    """
                    INSERT INTO telemetria (sesion_id, conductor_id, timestamp, tipo_evento, severidad, datos_adicionales)
                    VALUES (%s, %s, NOW(), %s, %s, NULL)
                    """,
                    (sesion_id, conductor_id, 'bostezo', random.choice(['medio', 'alto']))
                )
            
            # Microsueños: 0-5 (muy peligrosos)
            num_microsueños = random.randint(0, 5)
            for _ in range(num_microsueños):
                cursor.execute(
                    """
                    INSERT INTO telemetria (sesion_id, conductor_id, timestamp, tipo_evento, severidad, datos_adicionales)
                    VALUES (%s, %s, NOW(), %s, %s, NULL)
                    """,
                    (sesion_id, conductor_id, 'microsueño', 'critico')
                )
            
            # Inclinaciones de cabeza: 5-15
            num_inclinaciones = random.randint(5, 15)
            for _ in range(num_inclinaciones):
                cursor.execute(
                    """
                    INSERT INTO telemetria (sesion_id, conductor_id, timestamp, tipo_evento, severidad, datos_adicionales)
                    VALUES (%s, %s, NOW(), %s, %s, NULL)
                    """,
                    (sesion_id, conductor_id, 'inclinacion', random.choice(['bajo', 'medio']))
                )
            
            total_eventos += num_parpadeos + num_bostezos + num_microsueños + num_inclinaciones
        
        conn.commit()
        print(f"✓ {total_eventos} eventos de telemetría creados")
    except Exception as e:
        print(f"Error creando telemetría: {e}")
        conn.rollback()
    finally:
        cursor.close()
        conn.close()

def main():
    """Ejecuta el seed completo"""
    print("\n🔄 Iniciando seed de datos...\n")
    
    # 1. Limpiar datos anteriores
    clear_existing_data()
    
    # 2. Crear conductores
    conductor_ids = create_sample_conductores()
    if not conductor_ids:
        print("Error: No se pudieron crear conductores")
        return
    
    # 3. Crear sesiones
    sessions = create_sample_sessions(conductor_ids)
    if not sessions:
        print("Error: No se pudieron crear sesiones")
        return
    
    # 4. Crear telemetría
    create_sample_telemetry(sessions)
    
    print("\n✅ Seed completado exitosamente!\n")
    print(f"Conductores listos: {conductor_ids}")
    print(f"Puedes acceder a la aplicación y verás datos de ejemplo")

if __name__ == "__main__":
    main()
