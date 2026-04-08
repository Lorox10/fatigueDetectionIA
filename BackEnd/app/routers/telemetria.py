from fastapi import APIRouter, HTTPException
from app.database.database import get_connection
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
import json

router = APIRouter(prefix="/api/telemetria", tags=["telemetria"])

# ==================== MODELOS ====================

class TelemetriaCreate(BaseModel):
    sesion_id: int
    conductor_id: int
    tipo_evento: str  # 'parpadeo', 'bostezo', 'microsueño', 'inclinación'
    severidad: str    # 'bajo', 'medio', 'alto', 'crítico'
    datos_adicionales: Optional[dict] = None

class TelemetriaResponse(BaseModel):
    id: int
    sesion_id: int
    conductor_id: int
    timestamp: str
    tipo_evento: str
    severidad: str
    datos_adicionales: Optional[dict] = None

    class Config:
        from_attributes = True

class EstadisticasSesion(BaseModel):
    sesion_id: int
    total_parpadeos: int
    total_bostezos: int
    total_microsuenos: int
    total_inclinaciones: int
    eventos_criticos: int
    parpadeos_por_minuto: float
    nivel_fatiga_promedio: float
    recomendacion: str

# ==================== ENDPOINTS ====================

@router.post("/guardar", response_model=dict)
async def guardar_telemetria(data: TelemetriaCreate):
    """Guarda un evento de telemetría durante el monitoreo"""
    try:
        connection = get_connection()
        cursor = connection.cursor()
        
        # Verificar que la sesión existe
        cursor.execute("SELECT id FROM sesiones WHERE id = %s", (data.sesion_id,))
        if not cursor.fetchone():
            cursor.close()
            connection.close()
            raise HTTPException(status_code=404, detail="Sesión no encontrada")
        
        # Insertar evento
        datos_json = json.dumps(data.datos_adicionales) if data.datos_adicionales else None
        
        query = """
            INSERT INTO telemetria 
            (sesion_id, conductor_id, timestamp, tipo_evento, severidad, datos_adicionales)
            VALUES (%s, %s, NOW(), %s, %s, %s)
        """
        
        cursor.execute(query, (
            data.sesion_id,
            data.conductor_id,
            data.tipo_evento,
            data.severidad,
            datos_json
        ))
        connection.commit()
        
        evento_id = cursor.lastrowid
        
        cursor.close()
        connection.close()
        
        return {
            "success": True,
            "evento_id": evento_id,
            "mensaje": "Evento guardado exitosamente"
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error al guardar telemetría: {e}")
        raise HTTPException(status_code=500, detail=f"Error al guardar telemetría: {str(e)}")


@router.get("/sesion/{sesion_id}", response_model=List[TelemetriaResponse])
async def obtener_telemetria_sesion(sesion_id: int):
    """Obtiene todos los eventos de telemetría de una sesión"""
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        
        query = """
            SELECT id, sesion_id, conductor_id, timestamp, tipo_evento, severidad, datos_adicionales
            FROM telemetria
            WHERE sesion_id = %s
            ORDER BY timestamp ASC
        """
        
        cursor.execute(query, (sesion_id,))
        eventos = cursor.fetchall()
        
        # Parsear JSON en datos_adicionales
        for evento in eventos:
            if evento['datos_adicionales']:
                evento['datos_adicionales'] = json.loads(evento['datos_adicionales'])
        
        cursor.close()
        connection.close()
        
        return eventos if eventos else []
    except Exception as e:
        print(f"Error al obtener telemetría: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener telemetría")


@router.get("/estadisticas/{sesion_id}", response_model=EstadisticasSesion)
async def obtener_estadisticas_sesion(sesion_id: int):
    """Calcula estadísticas y da recomendación para una sesión"""
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        
        # Obtener info de la sesión
        cursor.execute("""
            SELECT conductor_id, 
                   TIMESTAMPDIFF(MINUTE, fecha_inicio, COALESCE(fecha_fin, NOW())) as duracion_minutos
            FROM sesiones
            WHERE id = %s
        """, (sesion_id,))
        
        sesion_info = cursor.fetchone()
        if not sesion_info:
            cursor.close()
            connection.close()
            raise HTTPException(status_code=404, detail="Sesión no encontrada")
        
        duracion_minutos = max(sesion_info['duracion_minutos'], 1)  # Evitar división por 0
        
        # Contar eventos por tipo
        cursor.execute("""
            SELECT tipo_evento, COUNT(*) as cantidad, severidad
            FROM telemetria
            WHERE sesion_id = %s
            GROUP BY tipo_evento, severidad
        """, (sesion_id,))
        
        resultados = cursor.fetchall()
        
        # Procesar conteos
        parpadeos = 0
        bostezos = 0
        microsuenos = 0
        inclinaciones = 0
        eventos_criticos = 0
        
        for resultado in resultados:
            tipo = resultado['tipo_evento']
            cantidad = resultado['cantidad']
            severidad = resultado['severidad']
            
            if tipo == 'parpadeo':
                parpadeos = cantidad
            elif tipo == 'bostezo':
                bostezos = cantidad
            elif tipo == 'microsueño':
                microsuenos = cantidad
            elif tipo == 'inclinación':
                inclinaciones = cantidad
            
            if severidad == 'crítico':
                eventos_criticos += cantidad
        
        # Calcular métricas
        parpadeos_por_minuto = parpadeos / duracion_minutos
        
        # Calcular nivel de fatiga (0-10)
        # - Bostezos: muy importante (3 puntos por)
        # - Microsueños: crítico (5 puntos por)
        # - Inclinaciones: importante (1 punto por)
        # - Parpadeos frecentes: normal entre 15-25 por minuto
        nivel_fatiga = min(10, (
            (microsuenos * 5) +
            (bostezos * 3) +
            (inclinaciones * 1) +
            (max(0, parpadeos_por_minuto - 25) * 0.1)
        ) / duracion_minutos)
        
        # Generar recomendación
        if eventos_criticos > 0 or nivel_fatiga >= 8:
            recomendacion = "🔴 CRÍTICO: El conductor debe descansar INMEDIATAMENTE. Riesgo de accidente muy alto."
        elif nivel_fatiga >= 6 or microsuenos > 0:
            recomendacion = "🟠 ALTO: Se recomienda descansar urgentemente. Fatiga severa detectada."
        elif nivel_fatiga >= 4 or bostezos >= 5:
            recomendacion = "🟡 MEDIO: Se recomienda descansar pronto. Signos de fatiga moderada."
        elif nivel_fatiga >= 2:
            recomendacion = "🟢 BAJO: Sin signos críticos de fatiga. Monitoreo normal."
        else:
            recomendacion = "🟢 ÓPTIMO: Conductor en buen estado. Puede continuar viajando."
        
        cursor.close()
        connection.close()
        
        return EstadisticasSesion(
            sesion_id=sesion_id,
            total_parpadeos=parpadeos,
            total_bostezos=bostezos,
            total_microsuenos=microsuenos,
            total_inclinaciones=inclinaciones,
            eventos_criticos=eventos_criticos,
            parpadeos_por_minuto=round(parpadeos_por_minuto, 2),
            nivel_fatiga_promedio=round(nivel_fatiga, 2),
            recomendacion=recomendacion
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error al calcular estadísticas: {e}")
        raise HTTPException(status_code=500, detail=f"Error al calcular estadísticas: {str(e)}")


@router.get("/conductor/{conductor_id}/resumen", response_model=dict)
async def obtener_resumen_conductor(conductor_id: int):
    """Obtiene estadísticas globales de un conductor (todas sus sesiones)"""
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        
        # Total de sesiones
        cursor.execute("""
            SELECT COUNT(*) as total_sesiones FROM sesiones WHERE conductor_id = %s
        """, (conductor_id,))
        sesiones_count = cursor.fetchone()['total_sesiones']
        
        # Eventos totales
        cursor.execute("""
            SELECT 
                COUNT(*) as total_eventos,
                SUM(CASE WHEN tipo_evento = 'parpadeo' THEN 1 ELSE 0 END) as parpadeos,
                SUM(CASE WHEN tipo_evento = 'bostezo' THEN 1 ELSE 0 END) as bostezos,
                SUM(CASE WHEN tipo_evento = 'microsueño' THEN 1 ELSE 0 END) as microsuenos,
                SUM(CASE WHEN tipo_evento = 'inclinación' THEN 1 ELSE 0 END) as inclinaciones,
                SUM(CASE WHEN severidad = 'crítico' THEN 1 ELSE 0 END) as eventos_criticos
            FROM telemetria
            WHERE conductor_id = %s
        """, (conductor_id,))
        
        stats = cursor.fetchone()
        
        cursor.close()
        connection.close()
        
        return {
            "conductor_id": conductor_id,
            "total_sesiones": sesiones_count,
            "estadisticas": {
                "total_eventos": int(stats['total_eventos'] or 0),
                "parpadeos": int(stats['parpadeos'] or 0),
                "bostezos": int(stats['bostezos'] or 0),
                "microsuenos": int(stats['microsuenos'] or 0),
                "inclinaciones": int(stats['inclinaciones'] or 0),
                "eventos_criticos": int(stats['eventos_criticos'] or 0)
            }
        }
    except Exception as e:
        print(f"Error al obtener resumen: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener resumen")
