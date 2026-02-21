from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
from init_db import crear_base_datos
from app.routers import conductores

# Cargar variables de entorno
load_dotenv()

# Crear aplicación FastAPI
app = FastAPI(
    title="Detección de Fatiga en Conductores",
    description="API para detectar fatiga en conductores mediante análisis facial",
    version="1.0.0"
)

# Configurar CORS
origins = [
    "http://localhost:4200",  # Angular dev server
    "http://127.0.0.1:4200",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir routers
app.include_router(conductores.router)

@app.on_event("startup")
def startup_init_db():
    crear_base_datos(drop_existing=False)

# Rutas básicas
@app.get("/")
async def root():
    return {
        "mensaje": "Bienvenido a la API de Detección de Fatiga",
        "versión": "1.0.0",
        "estado": "En funcionamiento"
    }

@app.get("/api/salud")
async def salud():
    return {"estado": "OK"}

# Punto de entrada
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
