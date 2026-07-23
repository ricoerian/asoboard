import {
  Component,
  AfterViewInit,
  ViewChild,
  ElementRef,
  HostListener,
  OnDestroy,
  ChangeDetectorRef,
  inject,
} from '@angular/core';

import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageSwitcherComponent } from '../shared/language-switcher/language-switcher.component';
import Konva from 'konva';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [RouterLink, TranslatePipe, LanguageSwitcherComponent],
  templateUrl: './landing-page.html',
})
export class LandingPage implements AfterViewInit, OnDestroy {
  @ViewChild('konvaContainer', { static: false }) konvaContainer!: ElementRef;

  stage!: Konva.Stage;
  layer!: Konva.Layer;

  currentTool: 'pen' | 'eraser' | 'text' | 'rect' | 'circle' | 'star' | 'arrow' = 'pen';
  isDrawing = false;
  currentColor = '#388e3c';
  currentThickness = 5;
  currentFontSize = 24;
  currentFontFamily = 'Arial';
  lastLine: Konva.Shape | null = null;
  year = new Date().getFullYear();
  hasDrawn = false;
  isDemoPlaying = false;
  private demoTimeout: ReturnType<typeof setTimeout> | undefined;
  private currentDoodleIndex = 0;

  private cdr = inject(ChangeDetectorRef);
  private observer: IntersectionObserver | null = null;

  ngAfterViewInit() {
    setTimeout(() => this.initKonva(), 100);
    this.initScrollReveal();
  }

  ngOnDestroy() {
    if (this.stage) {
      this.stage.destroy();
    }
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  initScrollReveal() {
    const options = {
      root: null,
      rootMargin: '0px',
      threshold: 0.15,
    };

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal-visible');

          this.observer?.unobserve(entry.target);
        }
      });
    }, options);

    const targets = document.querySelectorAll('.reveal-hidden');
    targets.forEach((target) => this.observer?.observe(target));
  }

  @HostListener('window:resize')
  onResize() {
    if (this.stage && this.konvaContainer) {
      const container = this.konvaContainer.nativeElement;
      this.stage.width(container.offsetWidth);
      this.stage.height(container.offsetHeight);
      this.layer.draw();
    }
  }

  initKonva() {
    if (!this.konvaContainer) {
      setTimeout(() => this.initKonva(), 100);
      return;
    }

    const container = this.konvaContainer.nativeElement;

    this.stage = new Konva.Stage({
      container: container,
      width: container.offsetWidth,
      height: container.offsetHeight,
    });

    this.layer = new Konva.Layer();
    this.stage.add(this.layer);

    this.stage.on('mousedown touchstart', (e) => this.onStageMouseDown(e));
    this.stage.on('mousemove touchmove', (e) => this.onStageMouseMove(e));
    this.stage.on('mouseup touchend', () => this.onStageMouseUp());

    this.playLiveDoodle();
  }

  private getDoodles() {
    return [
      {
        color: '#f472b6',
        strokes: [
          [
            { x: 100, y: 150 },
            { x: 120, y: 120 },
            { x: 150, y: 110 },
            { x: 180, y: 120 },
            { x: 200, y: 150 },
            { x: 220, y: 120 },
            { x: 250, y: 110 },
            { x: 280, y: 120 },
            { x: 300, y: 150 },
            { x: 280, y: 200 },
            { x: 200, y: 280 },
            { x: 120, y: 200 },
            { x: 100, y: 150 },
          ],
        ],
      },
      {
        color: '#f97316',
        strokes: [
          [
            { x: 160, y: 130 },
            { x: 161, y: 131 },
          ],
          [
            { x: 240, y: 130 },
            { x: 241, y: 131 },
          ],
          [
            { x: 150, y: 180 },
            { x: 180, y: 210 },
            { x: 220, y: 210 },
            { x: 250, y: 180 },
          ],
        ],
      },
      {
        color: '#22c55e',
        strokes: [
          [
            { x: 80, y: 140 },
            { x: 100, y: 110 },
            { x: 100, y: 190 },
          ],
          [
            { x: 130, y: 150 },
            { x: 170, y: 150 },
          ],
          [
            { x: 150, y: 130 },
            { x: 150, y: 170 },
          ],
          [
            { x: 200, y: 140 },
            { x: 220, y: 110 },
            { x: 220, y: 190 },
          ],
          [
            { x: 250, y: 140 },
            { x: 290, y: 140 },
          ],
          [
            { x: 250, y: 160 },
            { x: 290, y: 160 },
          ],
          [
            { x: 320, y: 120 },
            { x: 360, y: 120 },
            { x: 360, y: 160 },
            { x: 320, y: 160 },
            { x: 320, y: 210 },
            { x: 360, y: 210 },
          ],
        ],
      },
      {
        color: '#a855f7',
        strokes: [
          [
            { x: 100, y: 110 },
            { x: 150, y: 110 },
            { x: 100, y: 110 },
            { x: 100, y: 150 },
            { x: 140, y: 150 },
            { x: 100, y: 150 },
            { x: 100, y: 190 },
            { x: 150, y: 190 },
          ],
          [
            { x: 170, y: 140 },
            { x: 210, y: 140 },
          ],
          [
            { x: 170, y: 160 },
            { x: 210, y: 160 },
          ],
          [
            { x: 230, y: 190 },
            { x: 230, y: 140 },
            { x: 260, y: 170 },
            { x: 290, y: 140 },
            { x: 290, y: 190 },
          ],
          [
            { x: 350, y: 140 },
            { x: 310, y: 140 },
            { x: 310, y: 190 },
            { x: 350, y: 190 },
          ],
          [
            { x: 370, y: 100 },
            { x: 390, y: 100 },
            { x: 390, y: 120 },
            { x: 370, y: 120 },
            { x: 370, y: 140 },
            { x: 390, y: 140 },
          ],
        ],
      },
      {
        color: '#eab308',
        strokes: [
          [
            { x: 200, y: 50 },
            { x: 230, y: 110 },
            { x: 300, y: 110 },
            { x: 240, y: 150 },
            { x: 270, y: 210 },
            { x: 200, y: 170 },
            { x: 130, y: 210 },
            { x: 160, y: 150 },
            { x: 100, y: 110 },
            { x: 170, y: 110 },
            { x: 200, y: 50 },
          ],
        ],
      },
    ];
  }

  playLiveDoodle() {
    if (this.hasDrawn) return;

    this.isDemoPlaying = true;
    const doodles = this.getDoodles();
    const rawDoodle = doodles[this.currentDoodleIndex];

    let minX = Infinity,
      minY = Infinity;
    let maxX = -Infinity,
      maxY = -Infinity;

    rawDoodle.strokes.forEach((stroke) => {
      stroke.forEach((pt) => {
        if (pt.x < minX) minX = pt.x;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y < minY) minY = pt.y;
        if (pt.y > maxY) maxY = pt.y;
      });
    });

    const doodleWidth = maxX - minX;
    const doodleHeight = maxY - minY;

    const stageWidth = this.stage.width();
    const stageHeight = this.stage.height();

    const offsetX = (stageWidth - doodleWidth) / 2 - minX;
    const offsetY = (stageHeight - doodleHeight) / 2 - minY;

    const centeredDoodle = {
      color: rawDoodle.color,
      strokes: rawDoodle.strokes.map((stroke) =>
        stroke.map((pt) => ({ x: pt.x + offsetX, y: pt.y + offsetY })),
      ),
    };

    let strokeIndex = 0;

    const animateNextStroke = () => {
      if (!this.isDemoPlaying || this.hasDrawn || strokeIndex >= centeredDoodle.strokes.length) {
        if (strokeIndex >= centeredDoodle.strokes.length) {
          this.currentDoodleIndex = (this.currentDoodleIndex + 1) % doodles.length;
          this.demoTimeout = setTimeout(() => {
            if (this.isDemoPlaying && !this.hasDrawn) {
              this.layer.destroyChildren();
              this.playLiveDoodle();
            }
          }, 2000);
        }
        return;
      }

      const points = centeredDoodle.strokes[strokeIndex];
      const demoLine = new Konva.Line({
        stroke: centeredDoodle.color,
        strokeWidth: 5,
        lineCap: 'round',
        lineJoin: 'round',
        tension: 0.5,
        points: [points[0].x, points[0].y],
        opacity: 0.7,
      });

      this.layer.add(demoLine);
      let pointIndex = 1;

      const animatePoint = () => {
        if (!this.isDemoPlaying || this.hasDrawn) {
          demoLine.destroy();
          this.layer.draw();
          return;
        }

        if (pointIndex < points.length) {
          const pts = demoLine.points();
          pts.push(points[pointIndex].x, points[pointIndex].y);
          demoLine.points(pts);
          this.layer.batchDraw();
          pointIndex++;
          this.demoTimeout = setTimeout(animatePoint, 80);
        } else {
          strokeIndex++;
          this.demoTimeout = setTimeout(animateNextStroke, 200);
        }
      };

      animatePoint();
    };

    animateNextStroke();
  }

  onStageMouseDown(e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) {
    const target = e.target;
    if (target !== target.getStage() && target.className !== 'Text') {
      return;
    }

    if (this.isDemoPlaying) {
      this.isDemoPlaying = false;
      clearTimeout(this.demoTimeout);
      this.layer.destroyChildren();
      this.layer.draw();
    }

    if (!this.hasDrawn) {
      this.hasDrawn = true;
      this.cdr.detectChanges();
    }

    this.isDrawing = true;
    const pos = this.stage.getPointerPosition();
    if (!pos) return;

    const strokeColor = this.currentTool === 'eraser' ? '#f8fafc' : this.currentColor;
    const strokeWidth =
      this.currentTool === 'eraser' ? this.currentThickness * 5 : this.currentThickness;

    if (this.currentTool === 'text') {
      this.isDrawing = false;
      this.showInlineTextInput(pos.x, pos.y, strokeColor);
      return;
    } else if (this.currentTool === 'rect') {
      this.lastLine = new Konva.Rect({
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
        stroke: strokeColor,
        strokeWidth: strokeWidth,
        draggable: true,
      });
    } else if (this.currentTool === 'circle') {
      this.lastLine = new Konva.Circle({
        x: pos.x,
        y: pos.y,
        radius: 0,
        stroke: strokeColor,
        strokeWidth: strokeWidth,
        draggable: true,
      });
    } else if (this.currentTool === 'star') {
      this.lastLine = new Konva.Star({
        x: pos.x,
        y: pos.y,
        innerRadius: 0,
        outerRadius: 0,
        numPoints: 5,
        stroke: strokeColor,
        strokeWidth: strokeWidth,
        draggable: true,
      });
    } else if (this.currentTool === 'arrow') {
      this.lastLine = new Konva.Arrow({
        points: [pos.x, pos.y, pos.x, pos.y],
        pointerLength: 10,
        pointerWidth: 10,
        fill: strokeColor,
        stroke: strokeColor,
        strokeWidth: strokeWidth,
        draggable: true,
      });
    } else {
      this.lastLine = new Konva.Line({
        stroke: strokeColor,
        strokeWidth: strokeWidth,
        globalCompositeOperation: this.currentTool === 'eraser' ? 'destination-out' : 'source-over',
        lineCap: 'round',
        lineJoin: 'round',
        tension: 0.5,
        points: [pos.x, pos.y],
      });
    }

    this.layer.add(this.lastLine);
  }

  onStageMouseMove(e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) {
    if (!this.isDrawing || !this.lastLine) return;
    if (e.evt instanceof Event) {
      e.evt.preventDefault();
    }
    const pos = this.stage.getPointerPosition();
    if (!pos) return;

    if (this.currentTool === 'pen' || this.currentTool === 'eraser') {
      const line = this.lastLine as Konva.Line;
      const pts = line.points();
      pts.push(pos.x, pos.y);
      line.points(pts);
    } else if (this.currentTool === 'rect') {
      const rect = this.lastLine as Konva.Rect;
      rect.width(pos.x - rect.x());
      rect.height(pos.y - rect.y());
    } else if (this.currentTool === 'circle') {
      const circle = this.lastLine as Konva.Circle;
      const radius = Math.sqrt(Math.pow(pos.x - circle.x(), 2) + Math.pow(pos.y - circle.y(), 2));
      circle.radius(radius);
    } else if (this.currentTool === 'star') {
      const star = this.lastLine as Konva.Star;
      const radius = Math.sqrt(Math.pow(pos.x - star.x(), 2) + Math.pow(pos.y - star.y(), 2));
      star.outerRadius(radius);
      star.innerRadius(radius / 2);
    } else if (this.currentTool === 'arrow') {
      const shape = this.lastLine as Konva.Arrow;
      const pts = shape.points();
      pts[2] = pos.x;
      pts[3] = pos.y;
      shape.points(pts);
    }

    this.layer.batchDraw();
  }

  onStageMouseUp() {
    if (!this.isDrawing) return;
    this.isDrawing = false;
  }

  setTool(tool: 'pen' | 'eraser' | 'text' | 'rect' | 'circle' | 'star' | 'arrow') {
    this.currentTool = tool;
  }

  setColor(color: string) {
    this.currentColor = color;
    if (this.currentTool === 'eraser') {
      this.currentTool = 'pen';
    }
  }

  clearBoard() {
    this.layer.destroyChildren();
    this.layer.draw();
    this.hasDrawn = true;
    this.cdr.detectChanges();
  }

  showInlineTextInput(x: number, y: number, color: string) {
    const container = this.konvaContainer.nativeElement;
    const rect = container.getBoundingClientRect();

    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);

    textarea.style.position = 'fixed';
    textarea.style.top = `${rect.top + y}px`;
    textarea.style.left = `${rect.left + x}px`;
    textarea.style.width = '250px';
    textarea.style.height = `${Math.max(50, this.currentFontSize * 2)}px`;
    textarea.style.fontSize = `${this.currentFontSize}px`;
    textarea.style.fontFamily = this.currentFontFamily;
    textarea.style.color = color === 'white' ? '#333' : color;
    textarea.style.background = 'white';
    textarea.style.border = '3px solid #388e3c';
    textarea.style.borderRadius = '12px';
    textarea.style.padding = '8px';
    textarea.style.zIndex = '99999';
    textarea.style.outline = 'none';
    textarea.style.resize = 'none';
    textarea.style.boxShadow = '0 10px 25px rgba(0,0,0,0.1)';
    textarea.placeholder = 'Type here...';

    const stopPropagation = (ev: MouseEvent | TouchEvent) => ev.stopPropagation();
    textarea.addEventListener('mousedown', stopPropagation as EventListener);
    textarea.addEventListener('touchstart', stopPropagation as EventListener);

    setTimeout(() => {
      textarea.focus();
    }, 20);

    const commit = () => {
      const text = textarea.value.trim();
      if (textarea.parentNode) {
        document.body.removeChild(textarea);
      }
      if (!text) return;

      const textNode = new Konva.Text({
        x,
        y,
        text,
        fontSize: this.currentFontSize,
        fontFamily: this.currentFontFamily,
        fill: color,
        draggable: true,
      });

      this.layer.add(textNode);
      this.layer.batchDraw();
    };

    textarea.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        textarea.value = '';
        commit();
      }
      setTimeout(() => {
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
        textarea.style.width = 'auto';
        textarea.style.width = `${Math.max(80, textarea.scrollWidth)}px`;
      }, 0);
    });
    textarea.addEventListener('blur', commit, { once: true });
  }
}
