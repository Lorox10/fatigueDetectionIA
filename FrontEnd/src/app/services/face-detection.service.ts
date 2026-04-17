import { Injectable } from '@angular/core';

type FaceLandmarksDetector = import('@tensorflow-models/face-landmarks-detection').FaceLandmarksDetector;
type FaceLandmarksModule = typeof import('@tensorflow-models/face-landmarks-detection');

export interface FaceDetectionResult {
  hasface: boolean;
  eyesClosed: boolean;
  yawning: boolean;
  headTilted: boolean;
  leftEyeRatio: number;
  rightEyeRatio: number;
  mouthRatio: number;
  headPose: { pitch: number; yaw: number; roll: number };
  keypoints: Array<{ x: number; y: number; z?: number }>;
}

@Injectable({
  providedIn: 'root'
})
export class FaceDetectionService {
  private detector: FaceLandmarksDetector | null = null;
  private faceLandmarksDetection: FaceLandmarksModule | null = null;
  private isModelLoaded = false;

  // ── Umbrales base ──
  private readonly BASE_EYE_ASPECT_RATIO_THRESHOLD = 0.21;
  private readonly BASE_MOUTH_ASPECT_RATIO_THRESHOLD = 0.65;
  private readonly HEAD_TILT_THRESHOLD = 18; // Grados — balanceado

  // ── Calibración adaptativa (primeros N frames con ojos abiertos) ──
  private eyeOpenAvg: number = 0.28;
  private mouthClosedAvg: number = 0.15;
  private baseRoll: number = 0;
  private basePitch: number = 0;
  private baseYaw: number = 0;
  private calibrationCount: number = 0;
  private readonly CALIBRATION_FRAMES = 45;

  // ── Suavizado con media móvil exponencial (EMA) ──
  private smoothedEAR: number = 0.28;
  private smoothedMAR: number = 0.1;
  private smoothedRoll: number = 0;
  private smoothedPitch: number = 0;
  private smoothedYaw: number = 0;
  private readonly EMA_ALPHA_FAST = 0.4;   // Para EAR/MAR (respuesta rápida)
  private readonly EMA_ALPHA_SLOW = 0.3;   // Para head pose (balance entre suavizado y respuesta)

  // ── Estado temporal para detecciones robustas ──
  private lastEyesClosed = false;
  private eyesClosedStart: number | null = null;
  private lastMouthOpen = false;
  private mouthOpenStart: number | null = null;
  private lastHeadTilted = false;
  private headTiltStart: number | null = null;
  private readonly EYES_CLOSED_MIN_MS = 100;
  private readonly YAWN_MIN_MS = 500;
  private readonly HEAD_TILT_MIN_MS = 400; // Requiere 400ms sostenidos para confirmar

  // ── Conteo de frames consecutivos (segunda barrera) ──
  private headTiltConsecutiveFrames: number = 0;
  private readonly HEAD_TILT_MIN_FRAMES = 5;

  calibrateEAR(currentEAR: number) {
    // No-op — la calibración ahora se hace internamente en detectFace()
  }

  constructor() {}

  async loadModel(): Promise<boolean> {
    try {
      if (typeof navigator === 'undefined' || typeof window === 'undefined') {
        console.warn('Modelo de deteccion no disponible en SSR');
        return false;
      }

      if (this.isModelLoaded) {
        return true;
      }

      console.log('Cargando modelo de detección facial...');

      if (!this.faceLandmarksDetection) {
        this.faceLandmarksDetection = await import('@tensorflow-models/face-landmarks-detection');
        await import('@tensorflow/tfjs-core');
        await import('@tensorflow/tfjs-backend-webgl');
      }

      const model = this.faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
      const detectorConfig: import('@tensorflow-models/face-landmarks-detection').MediaPipeFaceMeshMediaPipeModelConfig = {
        runtime: 'mediapipe',
        solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh',
        refineLandmarks: true
      };

      this.detector = await this.faceLandmarksDetection.createDetector(model, detectorConfig);
      this.isModelLoaded = true;
      console.log('Modelo cargado exitosamente');
      return true;
    } catch (error) {
      console.error('Error al cargar el modelo:', error);
      this.isModelLoaded = false;
      return false;
    }
  }

  async detectFace(video: HTMLVideoElement): Promise<FaceDetectionResult | null> {
    if (!this.isModelLoaded || !this.detector) {
      console.warn('Modelo no cargado');
      return null;
    }

    try {
      const faces = await this.detector.estimateFaces(video, {
        flipHorizontal: false
      });

      if (faces.length === 0) {
        return {
          hasface: false,
          eyesClosed: false,
          yawning: false,
          headTilted: false,
          leftEyeRatio: 0,
          rightEyeRatio: 0,
          mouthRatio: 0,
          headPose: { pitch: 0, yaw: 0, roll: 0 },
          keypoints: []
        };
      }

      const face = faces[0];
      const keypoints = face.keypoints;

      // ── Calcular métricas crudas ──
      const leftEyeRatio = this.calculateEyeAspectRatio(keypoints, 'left');
      const rightEyeRatio = this.calculateEyeAspectRatio(keypoints, 'right');
      // Combinar EAR estándar con iris-based ratio para mayor robustez con gafas
      const irisRatio = this.calculateIrisOpenness(keypoints);
      const standardEAR = (leftEyeRatio + rightEyeRatio) / 2;
      // Si iris está disponible (refineLandmarks=true), mezclar 60% estándar + 40% iris
      const rawEAR = irisRatio > 0 ? (standardEAR * 0.6 + irisRatio * 0.4) : standardEAR;
      const rawMAR = this.calculateMouthAspectRatio(keypoints);
      const rawPose = this.calculateHeadPose(keypoints);

      // ── Suavizado EMA (elimina ruido frame-a-frame) ──
      this.smoothedEAR = this.ema(this.smoothedEAR, rawEAR, this.EMA_ALPHA_FAST);
      this.smoothedMAR = this.ema(this.smoothedMAR, rawMAR, this.EMA_ALPHA_FAST);
      this.smoothedRoll = this.ema(this.smoothedRoll, rawPose.roll, this.EMA_ALPHA_SLOW);
      this.smoothedPitch = this.ema(this.smoothedPitch, rawPose.pitch, this.EMA_ALPHA_SLOW);
      this.smoothedYaw = this.ema(this.smoothedYaw, rawPose.yaw, this.EMA_ALPHA_SLOW);

      // ── Calibración durante los primeros frames (pose neutral + EAR/MAR base) ──
      if (this.calibrationCount < this.CALIBRATION_FRAMES) {
        const n = this.calibrationCount;
        this.eyeOpenAvg = (this.eyeOpenAvg * n + rawEAR) / (n + 1);
        this.mouthClosedAvg = (this.mouthClosedAvg * n + rawMAR) / (n + 1);
        this.baseRoll = (this.baseRoll * n + rawPose.roll) / (n + 1);
        this.basePitch = (this.basePitch * n + rawPose.pitch) / (n + 1);
        this.baseYaw = (this.baseYaw * n + rawPose.yaw) / (n + 1);
        this.calibrationCount++;
      }

      // ── Umbrales adaptativos ──
      const dynamicEARThreshold = Math.max(
        this.BASE_EYE_ASPECT_RATIO_THRESHOLD,
        this.eyeOpenAvg * 0.72
      );
      const dynamicMARThreshold = Math.max(
        this.BASE_MOUTH_ASPECT_RATIO_THRESHOLD,
        this.mouthClosedAvg * 3.5
      );

      // Pose corregida con baseline calibrado
      const correctedRoll = this.smoothedRoll - this.baseRoll;
      const correctedPitch = this.smoothedPitch - this.basePitch;
      const correctedYaw = this.smoothedYaw - this.baseYaw;

      // ── Detección robusta de ojos cerrados (EAR + tiempo mínimo) ──
      let eyesClosed = false;
      const now = Date.now();
      if (this.smoothedEAR < dynamicEARThreshold) {
        if (!this.lastEyesClosed) {
          this.eyesClosedStart = now;
        }
        if (this.eyesClosedStart && (now - this.eyesClosedStart > this.EYES_CLOSED_MIN_MS)) {
          eyesClosed = true;
        }
        this.lastEyesClosed = true;
      } else {
        this.eyesClosedStart = null;
        this.lastEyesClosed = false;
      }

      // ── Detección robusta de bostezo (MAR + tiempo mínimo) ──
      let yawning = false;
      if (this.smoothedMAR > dynamicMARThreshold) {
        if (!this.lastMouthOpen) {
          this.mouthOpenStart = now;
        }
        if (this.mouthOpenStart && (now - this.mouthOpenStart > this.YAWN_MIN_MS)) {
          yawning = true;
        }
        this.lastMouthOpen = true;
      } else {
        this.mouthOpenStart = null;
        this.lastMouthOpen = false;
      }

      // ── Detección robusta de inclinación (pose corregida + frames consecutivos + tiempo) ──
      const isTilted =
        Math.abs(correctedRoll) > this.HEAD_TILT_THRESHOLD ||
        Math.abs(correctedPitch) > this.HEAD_TILT_THRESHOLD;

      let headTilted = false;
      if (isTilted) {
        this.headTiltConsecutiveFrames++;
        if (!this.lastHeadTilted) {
          this.headTiltStart = now;
        }
        // Requiere N frames consecutivos Y tiempo mínimo sostenido
        if (
          this.headTiltConsecutiveFrames >= this.HEAD_TILT_MIN_FRAMES &&
          this.headTiltStart && (now - this.headTiltStart > this.HEAD_TILT_MIN_MS)
        ) {
          headTilted = true;
        }
        this.lastHeadTilted = true;
      } else {
        this.headTiltConsecutiveFrames = 0;
        this.headTiltStart = null;
        this.lastHeadTilted = false;
      }

      return {
        hasface: true,
        eyesClosed,
        yawning,
        headTilted,
        leftEyeRatio,
        rightEyeRatio,
        mouthRatio: rawMAR,
        headPose: { pitch: correctedPitch, yaw: correctedYaw, roll: correctedRoll },
        keypoints
      };
    } catch (error) {
      console.error('Error en detección:', error);
      return null;
    }
  }

  private calculateEyeAspectRatio(keypoints: any[], eye: 'left' | 'right'): number {
    // Índices MediaPipe Face Mesh — EAR estándar con 6 puntos (Soukupová & Čech 2016)
    // p1=lateral ext, p2=superior ext, p3=superior int, p4=lateral int, p5=inferior int, p6=inferior ext
    const leftEyeIndices  = [33, 160, 158, 133, 153, 144];
    const rightEyeIndices = [362, 385, 387, 263, 373, 380];

    const indices = eye === 'left' ? leftEyeIndices : rightEyeIndices;

    try {
      const p1 = keypoints[indices[0]]; // lateral externo
      const p2 = keypoints[indices[1]]; // superior externo
      const p3 = keypoints[indices[2]]; // superior interno
      const p4 = keypoints[indices[3]]; // lateral interno
      const p5 = keypoints[indices[4]]; // inferior interno
      const p6 = keypoints[indices[5]]; // inferior externo

      // EAR = (|p2-p6| + |p3-p5|) / (2 * |p1-p4|)
      const v1 = this.euclideanDistance(p2, p6);
      const v2 = this.euclideanDistance(p3, p5);
      const h  = this.euclideanDistance(p1, p4);

      return (v1 + v2) / (2.0 * h + 0.0001);
    } catch (error) {
      return 0.25;
    }
  }

  /**
   * Calcula apertura del ojo usando landmarks de iris (468-477).
   * Más robusto con gafas porque los iris se detectan a través de los lentes.
   */
  private calculateIrisOpenness(keypoints: any[]): number {
    try {
      // Iris landmarks: 468-472 (left iris), 473-477 (right iris)
      // Solo disponibles con refineLandmarks: true
      if (keypoints.length < 478) return 0;

      // Left eye: iris center=468, top eyelid=159, bottom eyelid=145
      const leftIrisCenter = keypoints[468];
      const leftUpperLid = keypoints[159];
      const leftLowerLid = keypoints[145];
      const leftOuter = keypoints[33];
      const leftInner = keypoints[133];

      const leftVertical = this.euclideanDistance(leftUpperLid, leftLowerLid);
      const leftHorizontal = this.euclideanDistance(leftOuter, leftInner);
      const leftRatio = leftVertical / (leftHorizontal + 0.0001);

      // Right eye: iris center=473, top eyelid=386, bottom eyelid=374
      const rightIrisCenter = keypoints[473];
      const rightUpperLid = keypoints[386];
      const rightLowerLid = keypoints[374];
      const rightOuter = keypoints[362];
      const rightInner = keypoints[263];

      const rightVertical = this.euclideanDistance(rightUpperLid, rightLowerLid);
      const rightHorizontal = this.euclideanDistance(rightOuter, rightInner);
      const rightRatio = rightVertical / (rightHorizontal + 0.0001);

      return (leftRatio + rightRatio) / 2;
    } catch (error) {
      return 0;
    }
  }

  private calculateMouthAspectRatio(keypoints: any[]): number {
    try {
      // Índices de landmarks para la boca según MediaPipe Face Mesh
      const upperLip = keypoints[13]; // Labio superior
      const lowerLip = keypoints[14]; // Labio inferior
      const leftMouth = keypoints[78]; // Comisura izquierda
      const rightMouth = keypoints[308]; // Comisura derecha

      // Calcular distancias
      const verticalDist = this.euclideanDistance(upperLip, lowerLip);
      const horizontalDist = this.euclideanDistance(leftMouth, rightMouth);

      // MAR = vertical / horizontal
      const mar = verticalDist / (horizontalDist + 0.0001);
      
      return mar;
    } catch (error) {
      return 0; // Valor por defecto (boca cerrada)
    }
  }

  private calculateHeadPose(keypoints: any[]): { pitch: number; yaw: number; roll: number } {
    try {
      // Puntos de referencia más estables para pose estimation
      const noseTip = keypoints[1];
      const chin = keypoints[152];
      const leftEye = keypoints[33];
      const rightEye = keypoints[263];
      const leftMouth = keypoints[78];
      const rightMouth = keypoints[308];
      const forehead = keypoints[10]; // Centro de la frente

      // ── Roll (inclinación lateral) ──
      const roll = Math.atan2(
        rightEye.y - leftEye.y,
        rightEye.x - leftEye.x
      ) * (180 / Math.PI);

      // ── Pitch (cabeceo adelante/atrás) ──
      // Usar la coordenada Z si disponible (MediaPipe la proporciona)
      const noseZ = noseTip.z || 0;
      const foreheadZ = forehead.z || 0;
      const chinZ = chin.z || 0;
      // Método principal: si hay Z, usar diferencia Z entre frente y barbilla
      let pitch: number;
      if (Math.abs(noseZ) > 0.001 || Math.abs(foreheadZ) > 0.001) {
        // Z negativo = más cerca de la cámara
        const zDiff = foreheadZ - chinZ; // positivo = cabeza inclinada hacia adelante
        pitch = zDiff * 200; // Escalar a grados aproximados
      } else {
        // Fallback: método geométrico 2D
        const faceHeight = this.euclideanDistance(forehead, chin);
        const noseToChin = this.euclideanDistance(noseTip, chin);
        const pitchRatio = noseToChin / (faceHeight + 0.0001);
        pitch = (pitchRatio - 0.55) * 80;
      }

      // ── Yaw (rotación izquierda/derecha) ──
      const eyeCenter = {
        x: (leftEye.x + rightEye.x) / 2,
        y: (leftEye.y + rightEye.y) / 2
      };
      const faceWidth = this.euclideanDistance(leftEye, rightEye);
      const noseOffset = noseTip.x - eyeCenter.x;
      const yaw = (noseOffset / (faceWidth + 0.0001)) * 60;

      return { pitch, yaw, roll };
    } catch (error) {
      return { pitch: 0, yaw: 0, roll: 0 };
    }
  }

  /** Exponential Moving Average — suaviza una señal ruidosa */
  private ema(prev: number, current: number, alpha: number): number {
    return alpha * current + (1 - alpha) * prev;
  }

  private euclideanDistance(p1: any, p2: any): number {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const dz = (p1.z || 0) - (p2.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  isLoaded(): boolean {
    return this.isModelLoaded;
  }

  async dispose() {
    if (this.detector) {
      this.detector.dispose();
      this.detector = null;
      this.isModelLoaded = false;
    }
  }
}
