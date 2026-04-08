from fastapi import APIRouter, HTTPException
from app.database.database import get_connection
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

router = APIRouter(prefix="/api/sesiones", tags=["sesiones"])

# ==================== MODELOS ====================

class SesionCreate(BaseModel):
    conductor_id: int

class SesionUpdate(BaseModel):
    duracion_minutos: Optional[int] = None
    distancia_km: Optional[float] = None
    estado: Optional[str] = None

class SesionResponse(BaseModel):
    id: int
    conductor_id: int
    fecha_inicio: datetime
    fecha_fin: Optional[datetime] = None
    duracion_minutos: Optional[int] = None
    distancia_km: Optional[float] = None
    estado: str

    class Config:
        from_attributes = True

class SesionDetailResponse(SesionResponse):
    conductor_nombre: Optional[str] = None
    conductor_apellidos: Optional[str] = None

# ==================== ENDPOINTS ====================

@router.post("/", response_model=dict)
async def crear_sesion(data: SesionCreate):
    """Crea una nueva sesión de monitoreo para un conductor"""
    try:
        connection = get_connection()
        cursor = connection.cursor()
        
        # Verificar que el conductor existe
        cursor.execute("SELECT id FROM conductores WHERE id = %s", (data.conductor_id,))
        if not cursor.fetchone():
            cursor.close()
            connection.close()
            raise HTTPException(status_code=404, detail="Conductor no encontrado")
        
        # Crear sesión
        query = """
            INSERT INTO sesiones (conductor_id, fecha_inicio, estado)
            VALUES (%s, NOW(), 'en_progreso')
        """
        cursor.execute(query, (data.conductor_id,))
        connection.commit()
        
        sesion_id = cursor.lastrowid
        
        cursor.close()
        connection.close()
        
        return {
            "success": True,
            "sesion_id": sesion_id,
            "mensaje": "Sesión iniciada exitosamente"
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error al crear sesión: {e}")
        raise HTTPException(status_code=500, detail=f"Error al crear sesión: {str(e)}")


@router.get("/{sesion_id}", response_model=SesionDetailResponse)
async def obtener_sesion(sesion_id: int):
    """Obtiene los detalles de una sesión específica"""
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        
        query = """
            SELECT 
                s.id, s.conductor_id, s.fecha_inicio, s.fecha_fin, 
                s.duracion_minutos, s.distancia_km, s.estado,
                c.nombre as conductor_nombre, c.apellidos as conductor_apellidos
            FROM sesiones s
            LEFT JOIN conductores c ON s.conductor_id = c.id
            WHERE s.id = %s
        """
        
        cursor.execute(query, (sesion_id,))
        sesion = cursor.fetchone()
        
        cursor.close()
        connection.close()
        
        if not sesion:
            raise HTTPException(status_code=404, detail="Sesión no encontrada")
        
        return sesion
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error al obtener sesión: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener sesión")


@router.get("/conductor/{conductor_id}", response_model=List[SesionResponse])
async def obtener_sesiones_conductor(conductor_id: int):
    """Obtiene todas las sesiones de un conductor"""
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)

        # Algunos despliegues antiguos no tienen la columna distancia_km.
        # Intentamos primero con ella y, si falla, hacemos fallback sin esa columna.
        query_with_distance = """
            SELECT id, conductor_id, fecha_inicio, fecha_fin,
                   duracion_minutos, distancia_km, estado
            FROM sesiones
            WHERE conductor_id = %s
            ORDER BY fecha_inicio DESC
        """

        query_without_distance = """
            SELECT id, conductor_id, fecha_inicio, fecha_fin,
                   duracion_minutos, estado
            FROM sesiones
            WHERE conductor_id = %s
            ORDER BY fecha_inicio DESC
        """

        try:
            cursor.execute(query_with_distance, (conductor_id,))
        except Exception:
            cursor.execute(query_without_distance, (conductor_id,))

        sesiones = cursor.fetchall()
        
        cursor.close()
        connection.close()
        
        return sesiones if sesiones else []
    except Exception as e:
        print(f"Error al obtener sesiones: {e}")
        raise HTTPException(status_code=500, detail=f"Error al obtener sesiones: {str(e)}")


@router.put("/{sesion_id}/finalizar", response_model=dict)
async def finalizar_sesion(sesion_id: int, data: SesionUpdate):
    """Finaliza una sesión de monitoreo"""
    try:
        connection = get_connection()
        cursor = connection.cursor()
        
        # Verificar que la sesión existe
        cursor.execute("SELECT estado FROM sesiones WHERE id = %s", (sesion_id,))
        result = cursor.fetchone()
        if not result:
            cursor.close()
            connection.close()
            raise HTTPException(status_code=404, detail="Sesión no encontrada")
        
        # Actualizar sesión
        query = """
            UPDATE sesiones 
            SET fecha_fin = NOW(), 
                estado = %s,
                duracion_minutos = %s,
                distancia_km = %s
            WHERE id = %s
        """
        
        estado = data.estado if data.estado else 'finalizado'
        cursor.execute(query, (
            estado,
            data.duracion_minutos,
            data.distancia_km,
            sesion_id
        ))
        connection.commit()
        
        cursor.close()
        connection.close()
        
        return {
            "success": True,
            "mensaje": "Sesión finalizada exitosamente"
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error al finalizar sesión: {e}")
        raise HTTPException(status_code=500, detail=f"Error al finalizar sesión: {str(e)}")
