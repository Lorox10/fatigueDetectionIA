import { Component, ViewChild, OnInit } from '@angular/core';
import { RouterOutlet, ActivatedRoute } from '@angular/router';
import { BubbleBackgroundComponent } from '../../components/bubble-background/bubble-background.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, BubbleBackgroundComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.css'
})
export class MainLayoutComponent implements OnInit {
  @ViewChild(BubbleBackgroundComponent) bubbleBackground!: BubbleBackgroundComponent;
  animateTransition = false;
  isDetectionPage = false;

  constructor(private activatedRoute: ActivatedRoute) {}

  ngOnInit() {
    this.activatedRoute.url.subscribe(segments => {
      this.isDetectionPage = segments.some(segment => segment.path === 'deteccion');
    });
  }

  triggerAnimation() {
    this.animateTransition = true;
  }

  stopAnimation() {
    this.animateTransition = false;
  }
}
