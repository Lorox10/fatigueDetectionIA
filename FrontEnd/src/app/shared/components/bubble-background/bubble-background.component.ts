import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Bubble {
  id: number;
  size: number;
  left: number;
  top: number;
  delay: number;
}

@Component({
  selector: 'app-bubble-background',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bubble-background.component.html',
  styleUrl: './bubble-background.component.css'
})
export class BubbleBackgroundComponent implements OnInit {
  @Input() animationTrigger = false;
  bubbles: Bubble[] = [];

  ngOnInit() {
    this.generateBubbles();
  }

  generateBubbles() {
    const bubbleCount = 8;
    for (let i = 0; i < bubbleCount; i++) {
      this.bubbles.push({
        id: i,
        size: Math.random() * (250 - 80) + 80,
        left: Math.random() * 100,
        top: Math.random() * 100,
        delay: Math.random() * 0.5
      });
    }
  }

  getBubbleStyle(bubble: Bubble) {
    return {
      width: bubble.size + 'px',
      height: bubble.size + 'px',
      left: bubble.left + '%',
      top: bubble.top + '%',
      '--animation-delay': bubble.delay + 's'
    } as any;
  }
}
