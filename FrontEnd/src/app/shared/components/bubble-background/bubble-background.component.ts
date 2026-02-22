import { Component, OnInit, Input, AfterViewInit, OnDestroy, ElementRef, ViewChild, Inject, PLATFORM_ID, OnChanges, SimpleChanges, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

interface Bubble {
  id: number;
  size: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  delay: number;
}

@Component({
  selector: 'app-bubble-background',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bubble-background.component.html',
  styleUrl: './bubble-background.component.css'
})
export class BubbleBackgroundComponent implements OnInit, AfterViewInit, OnDestroy, OnChanges {
  @Input() animationTrigger = true;
  @ViewChild('bubbleContainer', { static: false }) bubbleContainer?: ElementRef<HTMLDivElement>;
  bubbles: Bubble[] = [];
  private animationFrameId: number | null = null;
  private lastFrameTime = 0;
  private containerWidth = 0;
  private containerHeight = 0;
  private readonly isBrowser: boolean;
  private readonly onResize = () => this.updateContainerBounds();
  private readonly gravity = 0.08;
  private readonly settleDamping = 0.9;
  private wasAnimationActive = false;

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit() {
    this.generateBubbles();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['animationTrigger']?.currentValue && !this.wasAnimationActive) {
      this.wasAnimationActive = true;
      this.wakeBubbles();
    }
  }

  ngAfterViewInit() {
    if (!this.isBrowser) {
      return;
    }

    this.updateContainerBounds();
    this.seedBubblePositions();
    this.startAnimation();
    window.addEventListener('resize', this.onResize);
  }

  ngOnDestroy() {
    if (this.isBrowser) {
      if (this.animationFrameId !== null) {
        cancelAnimationFrame(this.animationFrameId);
      }
      window.removeEventListener('resize', this.onResize);
    }
  }

  generateBubbles() {
    const bubbleCount = 150;
    for (let i = 0; i < bubbleCount; i++) {
      const size = Math.random() * (40 - 80) + 80;
      const angle = Math.random() * Math.PI * 2;
      const baseSpeed = 0.1 + Math.random() * 0.3;
      const speedScale = 120 / size;
      const speed = baseSpeed * speedScale;

      this.bubbles.push({
        id: i,
        size,
        x: 0,
        y: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        delay: Math.random() * 0.5
      });
    }
  }

  private updateContainerBounds() {
    if (!this.bubbleContainer) {
      return;
    }

    const nativeElement = this.bubbleContainer.nativeElement;
    if (!nativeElement || typeof nativeElement.getBoundingClientRect !== 'function') {
      return;
    }

    const rect = nativeElement.getBoundingClientRect();
    this.containerWidth = rect.width;
    this.containerHeight = rect.height;
  }

  private seedBubblePositions() {
    if (this.containerWidth === 0 || this.containerHeight === 0) {
      return;
    }

    // Start all bubbles at the bottom (settled with gravity)
    this.bubbles.forEach((bubble) => {
      const maxX = Math.max(this.containerWidth - bubble.size, 0);
      const maxY = Math.max(this.containerHeight - bubble.size, 0);
      bubble.x = Math.random() * maxX;
      bubble.y = maxY; // Position at bottom
      bubble.vx = 0; // No initial velocity
      bubble.vy = 0;
    });
  }

  private startAnimation() {
    const step = (timestamp: number) => {
      if (!this.lastFrameTime) {
        this.lastFrameTime = timestamp;
      }
      const delta = (timestamp - this.lastFrameTime) / 16.666;
      this.lastFrameTime = timestamp;

      this.animateBubbles(delta);
      this.animationFrameId = requestAnimationFrame(step);
    };

    this.animationFrameId = requestAnimationFrame(step);
  }

  private animateBubbles(delta: number) {
    if (this.containerWidth === 0 || this.containerHeight === 0) {
      this.updateContainerBounds();
    }
    if (this.animationTrigger) {
      this.animateActive(delta);
    } else {
      this.animateSettled(delta);
    }

    this.resolveCollisions(this.animationTrigger);
  }

  private animateActive(delta: number) {
    this.bubbles.forEach((bubble) => {
      const maxX = Math.max(this.containerWidth - bubble.size, 0);
      const maxY = Math.max(this.containerHeight - bubble.size, 0);

      bubble.x += bubble.vx * delta;
      bubble.y += bubble.vy * delta;

      if (bubble.x <= 0) {
        bubble.x = 0;
        bubble.vx *= -1;
      } else if (bubble.x >= maxX) {
        bubble.x = maxX;
        bubble.vx *= -1;
      }

      if (bubble.y <= 0) {
        bubble.y = 0;
        bubble.vy *= -1;
      } else if (bubble.y >= maxY) {
        bubble.y = maxY;
        bubble.vy *= -1;
      }

      const jitter = 0.045;
      bubble.vx += (Math.random() - 0.5) * jitter;
      bubble.vy += (Math.random() - 0.5) * jitter;

      const maxSpeed = 2.0;
      bubble.vx = Math.max(Math.min(bubble.vx, maxSpeed), -maxSpeed);
      bubble.vy = Math.max(Math.min(bubble.vy, maxSpeed), -maxSpeed);
    });
  }

  private animateSettled(delta: number) {
    this.bubbles.forEach((bubble) => {
      const maxX = Math.max(this.containerWidth - bubble.size, 0);
      const maxY = Math.max(this.containerHeight - bubble.size, 0);

      bubble.vy += this.gravity * delta;
      bubble.vy *= this.settleDamping;
      bubble.vx *= this.settleDamping;

      bubble.x += bubble.vx * delta;
      bubble.y += bubble.vy * delta;

      if (bubble.x <= 0) {
        bubble.x = 0;
        bubble.vx = 0;
      } else if (bubble.x >= maxX) {
        bubble.x = maxX;
        bubble.vx = 0;
      }

      if (bubble.y >= maxY) {
        bubble.y = maxY;
        bubble.vy = 0;
      }
    });
  }

  private resolveCollisions(transferVelocity: boolean) {
    for (let i = 0; i < this.bubbles.length; i++) {
      for (let j = i + 1; j < this.bubbles.length; j++) {
        const a = this.bubbles[i];
        const b = this.bubbles[j];
        const ax = a.x + a.size / 2;
        const ay = a.y + a.size / 2;
        const bx = b.x + b.size / 2;
        const by = b.y + b.size / 2;
        const dx = bx - ax;
        const dy = by - ay;
        const distSq = dx * dx + dy * dy;
        const minDist = a.size / 2 + b.size / 2;

        if (distSq === 0 || distSq >= minDist * minDist) {
          continue;
        }

        const dist = Math.sqrt(distSq);
        const nx = dx / dist;
        const ny = dy / dist;
        const overlap = minDist - dist;

        const separation = overlap / 2;
        a.x -= nx * separation;
        a.y -= ny * separation;
        b.x += nx * separation;
        b.y += ny * separation;

        if (!transferVelocity) {
          a.vx = 0;
          a.vy = 0;
          b.vx = 0;
          b.vy = 0;
          continue;
        }

        const va = a.vx * nx + a.vy * ny;
        const vb = b.vx * nx + b.vy * ny;
        const impulse = vb - va;
        a.vx += impulse * nx;
        a.vy += impulse * ny;
        b.vx -= impulse * nx;
        b.vy -= impulse * ny;
      }
    }
  }

  private wakeBubbles() {
    this.bubbles.forEach((bubble) => {
      const angle = Math.random() * Math.PI * 2;
      const baseSpeed = 1.2 + Math.random() * 2.0;
      const speedScale = 120 / bubble.size;
      const speed = baseSpeed * speedScale;
      bubble.vx = Math.cos(angle) * speed;
      bubble.vy = Math.sin(angle) * speed;
    });
  }

  getBubbleStyle(bubble: Bubble) {
    return {
      width: bubble.size + 'px',
      height: bubble.size + 'px',
      '--x': bubble.x + 'px',
      '--y': bubble.y + 'px',
      '--animation-delay': bubble.delay + 's'
    } as any;
  }
}
