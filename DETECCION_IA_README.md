# Sistema de Detección de Fatiga con IA

## 🚀 Características Implementadas

### ✅ Completado

1. **Selección de Conductores**
   - Lista de conductores desde el backend
   - Botones con diseño unificado
   - Navegación con datos del conductor

2. **Sistema de Detección con IA**
   - Selección de múltiples cámaras conectadas
   - Detección facial en tiempo real con TensorFlow.js y MediaPipe
   - Detección de:
     - 👁️ **Parpadeos** (Eye Aspect Ratio)
     - 🥱 **Bostezos** (Mouth Aspect Ratio)
     - 😴 **Microsueños** (ojos cerrados > 3 segundos)
     - 🔄 **Inclinación excesiva de cabeza** (Head Pose Estimation)
     - 👤 **Contorno facial** (468 puntos de referencia)

3. **Tabla de Eventos en Tiempo Real**
   - Registro de todos los eventos detectados
   - Clasificación por severidad (bajo, medio, alto, crítico)
   - Timestamps precisos
   - Animaciones de entrada
   - Código de colores según severidad

4. **Panel de Estadísticas**
   - Contadores en tiempo real
   - Totales de parpadeos, bostezos, microsueños e inclinaciones
   - Diseño visual atractivo con gradientes

## 🛠️ Tecnologías Utilizadas

- **Angular 18** - Framework principal
- **TensorFlow.js** - Motor de IA
- **MediaPipe Face Mesh** - Detección de 468 puntos faciales
- **MediaDevices API** - Acceso a cámaras
- **RxJS** - Programación reactiva



## 🎯 Cómo Usar el Sistema

### 1. Iniciar el Backend

```bash
cd BackEnd
python main.py
```

### 2. Iniciar el Frontend

```bash
cd FrontEnd
ng serve
```

### 3. Flujo de Uso

1. **Página Home**: Click en "EMPEZAR"
2. **Selección de Conductor**:
   - Visualiza la lista de conductores
   - Click en "SELECCIONAR" en el conductor deseado
3. **Página de Detección**:
   - Espera a que el modelo de IA se cargue (aparecerá notificación)
   - Selecciona la cámara que deseas usar
   - Click en "Iniciar Cámara" para activar el video
   - Click en "Iniciar Detección" para comenzar el monitoreo
   - Observa los eventos detectados en tiempo real en la tabla

## 📊 Algoritmos de Detección

### Eye Aspect Ratio (EAR)

- **Parpadeos**: EAR < 0.21 con cooldown de 300ms
- **Ojos cerrados**: Detecta cuando los ojos permanecen cerrados

### Mouth Aspect Ratio (MAR)

- **Bostezos**: MAR > 0.6 con cooldown de 3 segundos
- Indicador de fatiga significativa

### Head Pose Estimation

- **Inclinación**: Detecta rotación > 20° en cualquier eje
- **Pitch**: Inclinación adelante/atrás
- **Yaw**: Rotación izquierda/derecha
- **Roll**: Inclinación lateral

### Detección de Microsueños

- Ojos cerrados continuamente por más de 3 segundos
- Alerta crítica automática
- Registro preciso del tiempo

## 🎨 Niveles de Severidad

- **🟢 Bajo**: Eventos normales (parpadeos normales, alertas informativas)
- **🟡 Medio**: Atención requerida (bostezos ocasionales)
- **🟠 Alto**: Advertencia (inclinación excesiva, múltiples bostezos)
- **🔴 Crítico**: Peligro inmediato (microsueños detectados)

## 🔧 Configuración Avanzada

### Ajustar Umbrales (en deteccion.component.ts)

```typescript
eyesClosedThreshold: number = 3000; // Tiempo para microsueño (ms)
blinkCooldown: number = 300; // Cooldown entre parpadeos (ms)
yawnCooldown: number = 3000; // Cooldown entre bostezos (ms)
tiltCooldown: number = 2000; // Cooldown entre inclinaciones (ms)
```

### Ajustar FPS de Detección

```typescript
this.detectionInterval = setInterval(() => {
  this.performDetection();
}, 100); // 100ms = 10 FPS (cambiar según necesidad)
```

## ⚡ Optimizaciones Implementadas

1. **Cooldowns**: Evitan eventos duplicados
2. **Límite de eventos**: Máximo 100 en tabla para conservar memoria
3. **Detección eficiente**: 10 FPS balanceando precisión y rendimiento
4. **Carga lazy del modelo**: Solo se carga cuando es necesario
5. **Limpieza automática**: Resources se liberan al salir

## 🎯 Próximas Mejoras Sugeridas

1. **Integración con Backend**:
   - Guardar sesiones de detección en BD
   - Reportes históricos por conductor
   - Análisis estadístico

2. **Notificaciones**:
   - Alertas sonoras en eventos críticos
   - Notificaciones del sistema

3. **Exportación de Datos**:
   - Exportar tabla de eventos a CSV/PDF
   - Gráficas de tendencias

4. **Calibración Personalizada**:
   - Ajustar umbrales por conductor
   - Aprendizaje adaptativo

## 📝 Notas Importantes

- El modelo de IA se descarga la primera vez (puede tardar unos segundos)
- Se requiere conexión a internet para cargar MediaPipe desde CDN
- La cámara debe tener buena iluminación para mejor precisión
- Funciona mejor con distancia de 50-100cm de la cámara




## 🎉 ¡Listo para Usar!

El sistema está completamente funcional y listo para detectar fatiga en tiempo real.

```

```
