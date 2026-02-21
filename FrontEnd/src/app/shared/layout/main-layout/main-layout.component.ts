import { Component, ViewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BubbleBackgroundComponent } from '../../components/bubble-background/bubble-background.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, BubbleBackgroundComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.css'
})
export class MainLayoutComponent {
  @ViewChild(BubbleBackgroundComponent) bubbleBackground!: BubbleBackgroundComponent;
  animateTransition = false;

  triggerAnimation() {
    this.animateTransition = true;
  }

  stopAnimation() {
    this.animateTransition = false;
  }
}
