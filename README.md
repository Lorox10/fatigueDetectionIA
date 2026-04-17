# 🚗 Sistema de Detección de Fatiga en Conductores - fatigueDetectionIA

Sistema web integrado que utiliza inteligencia artificial para analizar en tiempo real las facciones del conductor, detectando señales de fatiga y microsueños. Genera alertas preventivas para mejorar la seguridad vial y reducir riesgos de accidentes.

---


## ✨ Características

- ✅ **Interfaz Moderna**: Frontend con Angular 18+ con animaciones fluidas
- ✅ **Detección en Tiempo Real**: Análisis de expresiones faciales del conductor
- ✅ **Base de Datos Integrada**: MySQL para almacenamiento de conductores y sesiones
- ✅ **API RESTful**: Backend robusto con FastAPI
- ✅ **Gestión de Conductores**: CRUD completo de conductores desde la BD
- ✅ **Responsive Design**: Compatible con diferentes dispositivos
- ✅ **Manejo de Errores**: Validaciones completas en frontend y backend

---

## 🛠️ Tecnologías

### Frontend

- **Angular 18+**: Framework moderno con componentes standalone
- **TypeScript**: Tipado estático para JavaScript
- **CSS3**: Estilos avanzados con animaciones
- **HttpClient**: Comunicación con API REST
- **RxJS**: Programación reactiva con Observables

### Backend

- **FastAPI**: Framework moderno y rápido para APIs Python
- **Python 3.10+**: Lenguaje de servidor
- **MySQL**: Base de datos relacional
- **mysql-connector-python**: Conector para MySQL
- **CORS**: Habilitado para comunicación cross-origin
- **Uvicorn**: Servidor ASGI

### Base de Datos

- **MySQL 8.0+**: Sistema gestor de base de datos

### DevOps

- **Node.js & npm**: Gestor de dependencias frontend
- **pip**: Gestor de dependencias Python
- **Git**: Control de versiones

---

## 📦 Requisitos Previos

Asegúrate de tener instalado:

1. **Node.js** (v18+) - [Descargar](https://nodejs.org/)
2. **Python** (v3.10+) - [Descargar](https://www.python.org/)
3. **MySQL** (v8.0+) - [Descargar](https://www.mysql.com/)
4. **Git** - [Descargar](https://git-scm.com/)

Verifica las instalaciones:

```powershell
node --version
python --version
mysql --version
git --version
```

---

## 📥 Instalación

### 1. Clonar el Repositorio

```powershell
git clone git clone git clone https://github.com/Lorox10/fatigueDetectionIA
cd fatigueDetectionIA
```



### 2. Instalar Dependencias del Backend

```powershell
cd BackEnd
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

**Dependencias principales:**

- `fastapi==0.104.1`
- `uvicorn==0.24.0`
- `mysql-connector-python==8.2.0`
- `python-dotenv==1.0.0`

### 3. Configurar Variables de Entorno (Backend)

Crea un archivo `.env` en la carpeta `BackEnd`:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_contraseña
DB_NAME=fatigue_detection

# Server Configuration
SERVER_HOST=0.0.0.0
SERVER_PORT=8000
```

### 4. Inicializar Base de Datos

```powershell
# Desde la carpeta BackEnd
python init_db.py
```

Este script creará:

- Base de datos `fatigue_detection`
- Tabla `conductores` (id, nombre, apellidos, numero_licencia, email, telefono, activo)
- Tabla `sesiones` (id, conductor_id, fecha_inicio, fecha_fin, duracion, estado)
- Tabla `telemetria` (id, sesion_id, timestamp, estado_ojo, pose_cabeza, nivel_fatiga)

### 5. Instalar Dependencias del Frontend

```powershell
cd ../FrontEnd
npm install
```

---

## 🚀 Ejecución

#### Terminal 1 - Backend (FastAPI)

```powershell
cd BackEnd
.\venv\Scripts\Activate.ps1  # Activar entorno virtual
python main.py
```

**Salida esperada:**

```
[OK] Conectado a fatigue_detection
INFO:     Started server process [XXXX]
INFO:     Uvicorn running on http://127.0.0.1:8000}
INFO:     Application startup complete
```

✅ Backend listo en: `http://localhost:8000`

---

#### Terminal 2 - Frontend (Angular)

```powershell
cd FrontEnd
ng serve
```

O si prefieres que se abra automáticamente en el navegador:

```powershell
ng serve --open
```

**Salida esperada:**

```
✔ Compiled successfully.
✔ Built successfully.
  ➜  Local: http://localhost:4200/
```

✅ Frontend listo en: `http://localhost:4200`

---






## 📝 Notas Importantes

- El backend debe estar corriendo antes de usar el frontend
- La base de datos debe existir y estar configurada antes de iniciar el backend
- Las credenciales de MySQL deben estar en el archivo `.env`
- El CORS está configurado para `localhost:4200`

---

## 👨‍💻 Autor

**Lorenzo Vargas Sala**
https://github.com/Lorox10

**Juan Camilo Fernandez Londoño**
https://github.com/JuanDevFL

---


## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor, abre un issue o pull request.

---

**Última actualización:** Febrero 2026
