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

  onEmpezar() {
    // Activar animación de burbujas
    if (this.mainLayout) {
      this.mainLayout.triggerAnimation();
    }
    
    // Navegar inmediatamente para mejor UX
    this.router.navigate(['/conductores']);
  }
}
