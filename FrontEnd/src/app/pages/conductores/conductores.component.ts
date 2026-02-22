import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ConductoresService, Conductor } from '../../services/conductores.service';

@Component({
  selector: 'app-conductores',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './conductores.component.html',
  styleUrl: './conductores.component.css'
})
export class ConductoresComponent implements OnInit {
  conductores: Conductor[] = [];
  loading: boolean = true;
  error: string | null = null;

  constructor(
    private conductoresService: ConductoresService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadConductores();
  }

  loadConductores() {
    this.loading = true;
    this.error = null;
    
    this.conductoresService.getConductores().subscribe({
      next: (data: Conductor[]) => {
        this.conductores = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar conductores:', err);
        this.error = 'No se pudieron cargar los conductores. Asegúrate de que el backend está corriendo.';
        this.loading = false;
      }
    });
  }

  selectConductor(conductor: Conductor) {
    console.log('Conductor seleccionado:', conductor);
    // Navegar a página de detección con datos del conductor
    this.router.navigate(['/deteccion'], {
      queryParams: {
        nombre: conductor.nombre,
        apellidos: conductor.apellidos,
        id: conductor.id
      }
    });
  }
}
