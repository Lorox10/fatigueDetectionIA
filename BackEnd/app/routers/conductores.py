from fastapi import APIRouter, HTTPException
from app.database.database import get_connection
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

router = APIRouter(prefix="/api/conductores", tags=["conductores"])

class ConductorResponse(BaseModel):
    id: int
    nombre: str
    apellidos: str
    numero_licencia: str
    email: str
    telefono: Optional[str] = None
    activo: bool

    class Config:
        from_attributes = True


@router.get("/", response_model=list[ConductorResponse])
async def obtener_conductores():
    """Obtiene todos los conductores de la base de datos"""
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        
        query = """
            SELECT id, nombre, apellidos, numero_licencia, email, telefono, activo
            FROM conductores
            WHERE activo = TRUE
            ORDER BY nombre ASC
        """
        
        cursor.execute(query)
        conductores = cursor.fetchall()
        
        cursor.close()
        connection.close()
        
        if not conductores:
            return []
        
        return conductores
    except Exception as e:
        print(f"Error al obtener conductores: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener conductores")


@router.get("/{conductor_id}", response_model=ConductorResponse)
async def obtener_conductor(conductor_id: int):
    """Obtiene un conductor específico por su ID"""
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        
        query = """
            SELECT id, nombre, apellidos, numero_licencia, email, telefono, activo
            FROM conductores
            WHERE id = %s AND activo = TRUE
        """
        
        cursor.execute(query, (conductor_id,))
        conductor = cursor.fetchone()
        
        cursor.close()
        connection.close()
        
        if not conductor:
            raise HTTPException(status_code=404, detail="Conductor no encontrado")
        
        return conductor
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error al obtener conductor: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener conductor")


class ConductorCreate(BaseModel):
    nombre: str
    apellidos: str
    numero_licencia: str
    email: str
    telefono: Optional[str] = None


@router.post("/", response_model=ConductorResponse)
async def crear_conductor(conductor: ConductorCreate):
    """Crea un nuevo conductor"""
    try:
        connection = get_connection()
        cursor = connection.cursor()
        
        query = """
            INSERT INTO conductores (nombre, apellidos, numero_licencia, email, telefono, activo)
            VALUES (%s, %s, %s, %s, %s, TRUE)
        """
        
        cursor.execute(query, (
            conductor.nombre,
            conductor.apellidos,
            conductor.numero_licencia,
            conductor.email,
            conductor.telefono
        ))
        
        connection.commit()
        conductor_id = cursor.lastrowid
        
        cursor.close()
        connection.close()
        
        # Retornar el conductor creado
        return await obtener_conductor(conductor_id)
    except Exception as e:
        print(f"Error al crear conductor: {e}")
        raise HTTPException(status_code=500, detail="Error al crear conductor")


class ConductorUpdate(BaseModel):
    nombre: Optional[str] = None
    apellidos: Optional[str] = None
    email: Optional[str] = None
    telefono: Optional[str] = None
    activo: Optional[bool] = None


@router.put("/{conductor_id}", response_model=ConductorResponse)
async def actualizar_conductor(conductor_id: int, conductor: ConductorUpdate):
    """Actualiza un conductor existente"""
    try:
        connection = get_connection()
        cursor = connection.cursor()
        
        # Construir la query dinámicamente
        updates = []
        values = []
        
        if conductor.nombre is not None:
            updates.append("nombre = %s")
            values.append(conductor.nombre)
        if conductor.apellidos is not None:
            updates.append("apellidos = %s")
            values.append(conductor.apellidos)
        if conductor.email is not None:
            updates.append("email = %s")
            values.append(conductor.email)
        if conductor.telefono is not None:
            updates.append("telefono = %s")
            values.append(conductor.telefono)
        if conductor.activo is not None:
            updates.append("activo = %s")
            values.append(conductor.activo)
        
        if not updates:
            raise HTTPException(status_code=400, detail="No hay campos para actualizar")
        
        values.append(conductor_id)
        query = f"UPDATE conductores SET {', '.join(updates)} WHERE id = %s"
        
        cursor.execute(query, values)
        connection.commit()
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Conductor no encontrado")
        
        cursor.close()
        connection.close()
        
        return await obtener_conductor(conductor_id)
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error al actualizar conductor: {e}")
        raise HTTPException(status_code=500, detail="Error al actualizar conductor")


@router.delete("/{conductor_id}")
async def eliminar_conductor(conductor_id: int):
    """Elimina un conductor (soft delete)"""
    try:
        connection = get_connection()
        cursor = connection.cursor()
        
        query = "UPDATE conductores SET activo = FALSE WHERE id = %s"
        cursor.execute(query, (conductor_id,))
        connection.commit()
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Conductor no encontrado")
        
        cursor.close()
        connection.close()
        
        return {"mensaje": "Conductor eliminado exitosamente"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error al eliminar conductor: {e}")
        raise HTTPException(status_code=500, detail="Error al eliminar conductor")
