import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SesionResponse {
  success: boolean;
  sesion_id: number;
  mensaje: string;
}

export interface TelemetriaRequest {
  sesion_id: number;
  conductor_id: number;
  tipo_evento: string;
  severidad: string;
  datos_adicionales?: any;
}

export interface EstadisticasSesion {
  sesion_id: number;
  total_parpadeos: number;
  total_bostezos: number;
  total_microsuenos: number;
  total_inclinaciones: number;
  eventos_criticos: number;
  parpadeos_por_minuto: number;
  nivel_fatiga_promedio: number;
  recomendacion: string;
}

export interface SesionDetalle {
  id: number;
  conductor_id: number;
  conductor_nombre: string;
  conductor_apellidos: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  duracion_minutos: number | null;
  distancia_km: number | null;
  estado: string;
}

@Injectable({
  providedIn: 'root'
})
export class BackendApiService {
  private apiUrl = 'http://localhost:8000/api';

  constructor(private http: HttpClient) {}

  // ================== SESIONES ==================

  crearSesion(conductor_id: number): Observable<SesionResponse> {
    return this.http.post<SesionResponse>(`${this.apiUrl}/sesiones/`, {
      conductor_id
    });
  }

  obtenerSesion(sesion_id: number): Observable<SesionDetalle> {
    return this.http.get<SesionDetalle>(`${this.apiUrl}/sesiones/${sesion_id}`);
  }

  obtenerSesionesConductor(conductor_id: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/sesiones/conductor/${conductor_id}`);
  }

  finalizarSesion(sesion_id: number, datos?: any): Observable<any> {
    return this.http.put(
      `${this.apiUrl}/sesiones/${sesion_id}/finalizar`,
      datos || {}
    );
  }

  // ================== TELEMETRÍA ==================

  guardarTelemetria(data: TelemetriaRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/telemetria/guardar`, data);
  }

  obtenerTelemetriaSesion(sesion_id: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/telemetria/sesion/${sesion_id}`);
  }

  obtenerEstadisticasSesion(sesion_id: number): Observable<EstadisticasSesion> {
    return this.http.get<EstadisticasSesion>(`${this.apiUrl}/telemetria/estadisticas/${sesion_id}`);
  }

  obtenerResumenConductor(conductor_id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/telemetria/conductor/${conductor_id}/resumen`);
  }
}
