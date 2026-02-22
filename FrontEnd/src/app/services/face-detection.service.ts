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

  // Umbrales para detección
  private readonly EYE_ASPECT_RATIO_THRESHOLD = 0.21; // Umbral para ojos cerrados
  private readonly MOUTH_ASPECT_RATIO_THRESHOLD = 0.6; // Umbral para bostezo
  private readonly HEAD_TILT_THRESHOLD = 20; // Grados de inclinación

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

      // Calcular Eye Aspect Ratio (EAR) para detectar parpadeos/ojos cerrados
      const leftEyeRatio = this.calculateEyeAspectRatio(keypoints, 'left');
      const rightEyeRatio = this.calculateEyeAspectRatio(keypoints, 'right');
      const avgEyeRatio = (leftEyeRatio + rightEyeRatio) / 2;

      // Calcular Mouth Aspect Ratio (MAR) para detectar bostezos
      const mouthRatio = this.calculateMouthAspectRatio(keypoints);

      // Calcular inclinación de cabeza
      const headPose = this.calculateHeadPose(keypoints);

      // Determinar estados
      const eyesClosed = avgEyeRatio < this.EYE_ASPECT_RATIO_THRESHOLD;
      const yawning = mouthRatio > this.MOUTH_ASPECT_RATIO_THRESHOLD;
      const headTilted = 
        Math.abs(headPose.roll) > this.HEAD_TILT_THRESHOLD ||
        Math.abs(headPose.pitch) > this.HEAD_TILT_THRESHOLD;

      return {
        hasface: true,
        eyesClosed,
        yawning,
        headTilted,
        leftEyeRatio,
        rightEyeRatio,
        mouthRatio,
        headPose,
        keypoints
      };
    } catch (error) {
      console.error('Error en detección:', error);
      return null;
    }
  }

  private calculateEyeAspectRatio(keypoints: any[], eye: 'left' | 'right'): number {
    // Índices de landmarks para los ojos según MediaPipe Face Mesh
    const leftEyeIndices = [33, 160, 158, 133, 153, 144]; // Ojo izquierdo
    const rightEyeIndices = [362, 385, 387, 263, 373, 380]; // Ojo derecho
    
    const indices = eye === 'left' ? leftEyeIndices : rightEyeIndices;
    
    try {
      // Obtener puntos
      const p1 = keypoints[indices[1]]; // Superior
      const p2 = keypoints[indices[5]]; // Inferior
      const p3 = keypoints[indices[0]]; // Izquierda
      const p4 = keypoints[indices[3]]; // Derecha

      // Calcular distancias
      const verticalDist = this.euclideanDistance(p1, p2);
      const horizontalDist = this.euclideanDistance(p3, p4);

      // EAR = vertical / horizontal
      const ear = verticalDist / (horizontalDist + 0.0001);
      
      return ear;
    } catch (error) {
      return 0.25; // Valor por defecto (ojos abiertos)
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
      // Puntos de referencia facial
      const noseTip = keypoints[1];
      const leftEye = keypoints[33];
      const rightEye = keypoints[263];
      const leftMouth = keypoints[78];
      const rightMouth = keypoints[308];

      // Calcular roll (inclinación lateral)
      const eyeCenter = {
        x: (leftEye.x + rightEye.x) / 2,
        y: (leftEye.y + rightEye.y) / 2
      };
      const mouthCenter = {
        x: (leftMouth.x + rightMouth.x) / 2,
        y: (leftMouth.y + rightMouth.y) / 2
      };

      const roll = Math.atan2(
        rightEye.y - leftEye.y,
        rightEye.x - leftEye.x
      ) * (180 / Math.PI);

      // Calcular pitch (inclinación adelante/atrás)
      const faceHeight = this.euclideanDistance(eyeCenter, mouthCenter);
      const noseToMouth = this.euclideanDistance(noseTip, mouthCenter);
      const pitch = (noseToMouth / faceHeight - 1) * 50; // Simplificado

      // Calcular yaw (rotación izquierda/derecha)
      const faceWidth = this.euclideanDistance(leftEye, rightEye);
      const noseOffset = noseTip.x - eyeCenter.x;
      const yaw = (noseOffset / faceWidth) * 50; // Simplificado

      return { pitch, yaw, roll };
    } catch (error) {
      return { pitch: 0, yaw: 0, roll: 0 };
    }
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
