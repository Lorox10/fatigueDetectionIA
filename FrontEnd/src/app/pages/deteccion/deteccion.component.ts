import { Component, OnInit, OnDestroy, ViewChild, ElementRef, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FaceDetectionService, FaceDetectionResult } from '../../services/face-detection.service';
import { BubbleBackgroundComponent } from '../../shared/components/bubble-background/bubble-background.component';

type EventType = 'parpadeo' | 'bostezo' | 'microsueño' | 'inclinación' | 'alerta';
type EventSeverity = 'bajo' | 'medio' | 'alto' | 'crítico';

interface CameraDevice {
  deviceId: string;
  label: string;
}

@Component({
  selector: 'app-deteccion',
  standalone: true,
  imports: [CommonModule, FormsModule, BubbleBackgroundComponent],
  templateUrl: './deteccion.component.html',
  styleUrl: './deteccion.component.css'
})
export class DeteccionComponent implements OnInit, OnDestroy {
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;

  // Datos del conductor
  conductorNombre: string = '';
  conductorApellidos: string = '';

  // Cámaras disponibles
  availableCameras: CameraDevice[] = [];
  selectedCameraId: string = '';
  
  // Estado de la cámara
  cameraActive: boolean = false;
  mediaStream: MediaStream | null = null;
  
  // Detección
  detectionActive: boolean = false;
  detectionInterval: any = null;
  

  // Estado de ojos cerrados para microsueños
  eyesClosedStartTime: number | null = null;
  eyesClosedThreshold: number = 3000; // 3 segundos
  lastBlinkTime: number = 0;
  blinkCooldown: number = 300; // Cooldown de 300ms entre parpadeos
  lastYawnTime: number = 0;
  yawnCooldown: number = 3000; // Cooldown de 3s entre bostezos
  lastTiltTime: number = 0;
  tiltCooldown: number = 2000; // Cooldown de 2s entre inclinaciones

  // Contadores
  totalBlinks: number = 0;
  totalYawns: number = 0;
  totalMicrosleeps: number = 0;
  totalHeadTilts: number = 0;

  // Estado del modelo
  modelLoaded: boolean = false;
  modelLoading: boolean = false;
  isBrowser: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private faceDetectionService: FaceDetectionService,
    @Inject(PLATFORM_ID) private platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  async ngOnInit() {
    // Obtener datos del conductor de los query params
    this.route.queryParams.subscribe(params => {
      this.conductorNombre = params['nombre'] || 'Conductor';
      this.conductorApellidos = params['apellidos'] || '';
    });

    if (!this.isBrowser) {
      return;
    }

    // Cargar cámaras disponibles
    await this.loadAvailableCameras();

    // Cargar modelo de detección facial
    await this.loadDetectionModel();
  }

  ngOnDestroy() {
    this.stopCamera();
    this.stopDetection();
    this.faceDetectionService.dispose();
  }

  async loadDetectionModel() {
    this.modelLoading = true;
    this.addEvent('alerta', 'Cargando modelo de IA...', 'medio');

    const loaded = await this.faceDetectionService.loadModel();
    
    if (loaded) {
      this.modelLoaded = true;
      this.modelLoading = false;
      this.addEvent('alerta', 'Modelo de IA cargado correctamente', 'bajo');
    } else {
      this.modelLoading = false;
      this.addEvent('alerta', 'Error al cargar el modelo de IA', 'alto');
    }
  }

  async loadAvailableCameras() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.availableCameras = devices
        .filter(device => device.kind === 'videoinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Cámara ${this.availableCameras.length + 1}`
        }));

      if (this.availableCameras.length > 0) {
        this.selectedCameraId = this.availableCameras[0].deviceId;
      }
    } catch (error) {
      console.error('Error al cargar cámaras:', error);
      this.addEvent('alerta', 'No se pudieron cargar las cámaras', 'alto');
    }
  }

  async startCamera() {
    if (!this.isBrowser) {
      this.addEvent('alerta', 'La camara solo esta disponible en el navegador', 'medio');
      return;
    }

    try {
      // Detener cámara anterior si existe
      this.stopCamera();

      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: this.selectedCameraId ? { exact: this.selectedCameraId } : undefined,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (this.videoElement?.nativeElement) {
        const video = this.videoElement.nativeElement;
        video.srcObject = this.mediaStream;
        video.onloadedmetadata = () => {
          this.syncCanvasWithVideo();
        };
        this.cameraActive = true;
        this.addEvent('alerta', 'Cámara iniciada correctamente', 'bajo');
      }
    } catch (error) {
      console.error('Error al iniciar cámara:', error);
      this.addEvent('alerta', 'Error al iniciar la cámara', 'alto');
    }
  }

  stopCamera() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
      this.cameraActive = false;
    }
    if (this.isBrowser) {
      this.clearCanvas();
    }
  }

  async onCameraChange() {
    if (this.cameraActive) {
      await this.startCamera();
    }
  }

  startDetection() {
    if (!this.cameraActive) {
      this.addEvent('alerta', 'Primero debes iniciar la cámara', 'medio');
      return;
    }

    if (!this.modelLoaded) {
      this.addEvent('alerta', 'El modelo de IA aún no está cargado', 'medio');
      return;
    }

    this.detectionActive = true;
    this.addEvent('alerta', 'Detección de fatiga iniciada', 'bajo');

    // Detección en tiempo real con TensorFlow.js
    this.detectionInterval = setInterval(() => {
      this.performDetection();
    }, 100); // 10 FPS
  }

  stopDetection() {
    this.detectionActive = false;
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = null;
    }
    this.eyesClosedStartTime = null;
    this.addEvent('alerta', 'Detección detenida', 'bajo');
  }

  async performDetection() {
    if (!this.videoElement?.nativeElement || !this.detectionActive) {
      return;
    }

    const video = this.videoElement.nativeElement;
    
    // Verificar que el video esté listo
    if (video.readyState !== 4) {
      return;
    }

    try {
      const result: FaceDetectionResult | null = await this.faceDetectionService.detectFace(video);

      if (!result || !result.hasface) {
        // No se detectó cara
        this.eyesClosedStartTime = null;
        this.clearCanvas();
        return;
      }

      this.drawFaceOverlay(result.keypoints);

      // Detectar parpadeos (transición de ojos abiertos a cerrados)
      if (result.eyesClosed) {
        const now = Date.now();
        if (now - this.lastBlinkTime > this.blinkCooldown) {
          this.detectBlink();
          this.lastBlinkTime = now;
        }
      }

      // Detectar bostezos
      if (result.yawning) {
        const now = Date.now();
        if (now - this.lastYawnTime > this.yawnCooldown) {
          this.detectYawn();
          this.lastYawnTime = now;
        }
      }

      // Detectar inclinación de cabeza
      if (result.headTilted) {
        const now = Date.now();
        if (now - this.lastTiltTime > this.tiltCooldown) {
          this.detectHeadTilt();
          this.lastTiltTime = now;
        }
      }

      // Detectar microsueños (ojos cerrados por más de 3 segundos)
      this.checkForMicrosleep(result.eyesClosed);

    } catch (error) {
      console.error('Error en detección:', error);
    }
  }

  detectBlink() {
    this.totalBlinks++;
    this.addEvent('parpadeo', 'Parpadeo detectado', 'bajo');
  }

  detectYawn() {
    this.totalYawns++;
    this.addEvent('bostezo', 'Bostezo detectado - Posible fatiga', 'medio');
  }

  detectHeadTilt() {
    this.totalHeadTilts++;
    this.addEvent('inclinación', 'Inclinación excesiva de cabeza detectada', 'alto');
  }

  checkForMicrosleep(eyesClosed: boolean) {
    if (eyesClosed) {
      if (this.eyesClosedStartTime === null) {
        this.eyesClosedStartTime = Date.now();
      } else {
        const duration = Date.now() - this.eyesClosedStartTime;
        if (duration >= this.eyesClosedThreshold) {
          // Solo registrar una vez cuando se alcanza el umbral
          if (duration < this.eyesClosedThreshold + 200) { // Ventana de 200ms
            this.totalMicrosleeps++;
            this.addEvent('microsueño', `¡ALERTA! Microsueño detectado (${(duration / 1000).toFixed(1)}s)`, 'crítico');
          }
        }
      }
    } else {
      this.eyesClosedStartTime = null;
    }
  }

  addEvent(
    eventType: EventType,
    description: string,
    severity: EventSeverity
  ) {
    const timestamp = new Date().toISOString();
    if (eventType === 'alerta') {
      console.info(`[IA] ${timestamp} - ${description}`);
      return;
    }

    console.info(`[IA] ${timestamp} - ${eventType} (${severity}) - ${description}`);
  }

  getSeverityClass(severity: EventSeverity): string {
    return `severity-${severity}`;
  }

  getEventIcon(eventType: EventType): string {
    const icons = {
      'parpadeo': '👁️',
      'bostezo': '🥱',
      'microsueño': '😴',
      'inclinación': '🔄',
      'alerta': 'ℹ️'
    };
    return icons[eventType];
  }

  clearEvents() {
    this.totalBlinks = 0;
    this.totalYawns = 0;
    this.totalMicrosleeps = 0;
    this.totalHeadTilts = 0;
    this.addEvent('alerta', 'Contadores reiniciados', 'bajo');
  }

  private syncCanvasWithVideo() {
    if (!this.isBrowser) {
      return;
    }

    const video = this.videoElement?.nativeElement;
    const canvas = this.canvasElement?.nativeElement;
    if (!video || !canvas) {
      return;
    }

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
  }

  private clearCanvas() {
    if (!this.isBrowser) {
      return;
    }

    const canvas = this.canvasElement?.nativeElement;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  private drawFaceOverlay(keypoints: Array<{ x: number; y: number }>) {
    if (!this.isBrowser) {
      return;
    }

    const canvas = this.canvasElement?.nativeElement;
    if (!canvas || keypoints.length === 0) {
      return;
    }

    if (canvas.width === 0 || canvas.height === 0) {
      this.syncCanvasWithVideo();
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    // Dibujar puntos faciales
    ctx.fillStyle = 'rgba(0, 255, 255, 0.7)';
    for (const point of keypoints) {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Dibujar contorno de la cara (face oval)
    const faceOvalIndices = [
      10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
      397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
      172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109
    ];

    ctx.strokeStyle = 'rgba(0, 255, 255, 0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    faceOvalIndices.forEach((index, i) => {
      const point = keypoints[index];
      if (!point) {
        return;
      }
      if (i === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
  }
}
