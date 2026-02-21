import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  constructor(private router: Router) {}

  onEmpezar() {
    // Aquí disparamos la animación a través del layout
    const mainLayout = document.querySelector('app-main-layout') as any;
    if (mainLayout && mainLayout.componentInstance) {
      mainLayout.componentInstance.triggerAnimation();
    }
    
    // Navegamos después de un pequeño delay
    setTimeout(() => {
      this.router.navigate(['/conductores']);
    }, 800);
  }
}
