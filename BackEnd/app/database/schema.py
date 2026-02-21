"""
Scripts SQL para crear las tablas iniciales
"""

CREAR_TABLA_CONDUCTORES = """
CREATE TABLE IF NOT EXISTS conductores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    numero_licencia VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    telefono VARCHAR(15),
    fecha_ultimo_registro DATETIME,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN DEFAULT TRUE
);
"""

CREAR_TABLA_SESIONES = """
CREATE TABLE IF NOT EXISTS sesiones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conductor_id INT NOT NULL,
    fecha_inicio DATETIME NOT NULL,
    fecha_fin DATETIME,
    duracion_minutos INT,
    distancia_km FLOAT,
    estado VARCHAR(50) DEFAULT 'en_progreso',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conductor_id) REFERENCES conductores(id) ON DELETE CASCADE
);
"""

CREAR_TABLA_TELEMETRIA = """
CREATE TABLE IF NOT EXISTS telemetria (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sesion_id INT NOT NULL,
    conductor_id INT NOT NULL,
    timestamp DATETIME NOT NULL,
    parpadeos_por_minuto FLOAT,
    apertura_ojos FLOAT,
    movimiento_cabeza FLOAT,
    nivel_fatiga INT,
    alerta BOOLEAN DEFAULT FALSE,
    datos_adicionales JSON,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sesion_id) REFERENCES sesiones(id) ON DELETE CASCADE,
    FOREIGN KEY (conductor_id) REFERENCES conductores(id) ON DELETE CASCADE
);
"""

TABLAS = [
    CREAR_TABLA_CONDUCTORES,
    CREAR_TABLA_SESIONES,
    CREAR_TABLA_TELEMETRIA
]
