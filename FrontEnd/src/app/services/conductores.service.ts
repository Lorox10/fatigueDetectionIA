import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Conductor {
  id?: number;
  nombre: string;
  apellidos: string;
  numero_licencia?: string;
  licencia?: string;
  email: string;
}

@Injectable({
  providedIn: 'root'
})
export class ConductoresService {
  private apiUrl = 'http://localhost:8000/api/conductores';

  constructor(private http: HttpClient) { }

  getConductores(): Observable<Conductor[]> {
    return this.http.get<Conductor[]>(this.apiUrl);
  }

  getConductorById(id: number): Observable<Conductor> {
    return this.http.get<Conductor>(`${this.apiUrl}/${id}`);
  }

  createConductor(conductor: Conductor): Observable<Conductor> {
    return this.http.post<Conductor>(this.apiUrl, conductor);
  }

  updateConductor(id: number, conductor: Conductor): Observable<Conductor> {
    return this.http.put<Conductor>(`${this.apiUrl}/${id}`, conductor);
  }

  deleteConductor(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
