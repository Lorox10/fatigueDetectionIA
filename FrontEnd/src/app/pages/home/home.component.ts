import { Component, Optional } from '@angular/core';
import { Router } from '@angular/router';
import { MainLayoutComponent } from '../../shared/layout/main-layout/main-layout.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  constructor(
    private router: Router,
    @Optional() private mainLayout: MainLayoutComponent
  ) {}

  onIniciarDeteccion() {
    // Navegar a seleccionar conductor para iniciar detección
    this.router.navigate(['/conductores']);
  }

  onVerHistorial() {
    // Navegar a historial para seleccionar conductor real
    this.router.navigate(['/historial']);
  }
}
