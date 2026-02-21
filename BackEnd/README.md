# Backend - Detección de Fatiga en Conductores

API REST con FastAPI para detectar fatiga en conductores mediante análisis facial.

## 📋 Requisitos previos

- Python 3.10+
- MySQL 8.0+
- pip

## 🚀 Instalación

### 1. Crear entorno virtual

```bash
python -m venv venv
```

### 2. Activar entorno virtual

**Windows:**

```bash
venv\Scripts\activate
```

**Linux/Mac:**

```bash
source venv/bin/activate
```

### 3. Instalar dependencias

```bash
pip install -r requirements.txt
```

### 4. Configurar variables de entorno

Editar `.env` con tus credenciales MySQL:

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_contraseña_aqui
DB_NAME=fatigue_detection
PORT=8000
```

### 5. Inicializar base de datos

```bash
python init_db.py
```

## 🏃 Ejecutar servidor

```bash
python main.py
```

El servidor estará disponible en: `http://localhost:8000`

### Documentación interactiva

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## 📁 Estructura del proyecto

```
├── main.py                 # Archivo principal
├── config.py              # Configuración de la app
├── requirements.txt       # Dependencias Python
├── init_db.py            # Script para inicializar BD
├── .env                  # Variables de entorno
└── app/
    ├── routers/          # Rutas de la API
    ├── models/           # Modelos de datos
    ├── schemas/          # Esquemas Pydantic
    └── database/         # Conexión a BD
        ├── database.py   # Clase de conexión
        └── schema.py     # Scripts SQL
```

## 🔌 API Endpoints (por agregar)

- `GET /api/salud` - Verificar estado
- `POST /api/usuarios` - Registrar usuario
- `POST /api/sesiones` - Iniciar sesión
- `POST /api/telemetria` - Enviar datos de telemetría

## 📝 Notas

- Reemplaza `tu_contraseña_aqui` con tu contraseña MySQL real
- La BD se crea automáticamente al ejecutar `init_db.py`
