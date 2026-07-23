/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-empty */
import {
  Component,
  Input,
  Output,
  EventEmitter,
  AfterViewInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  ViewChild,
  ElementRef,
  HostListener,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import Konva from 'konva';
import jsPDF from 'jspdf';
import { Subscription } from 'rxjs';
import { CanvasEvent, CanvasTool, BrushPreset } from '../../../models/types';
import {
  CanvasCollaborationService,
  RemoteCanvasEvent,
  CursorPosition as RemoteCursorPosition,
} from '../../../services/canvas/canvas-collaboration.service';

type RemoteLineEvent = RemoteCanvasEvent & { points: number[] };
type RemoteShapeEvent = RemoteCanvasEvent & { shapeType: string };

@Component({
  selector: 'app-canvas',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './canvas.html',
  styleUrl: './canvas.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CanvasComponent implements AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('konvaContainer', { static: false }) konvaContainer!: ElementRef;

  @Input() set mentorEvents(events: CanvasEvent[]) {
    this._mentorEvents = events;

    if (this.isRecording) {
      const lastEv = events[events.length - 1];
      if (lastEv && lastEv.type !== 'clear') {
        this.renderShapeImmediate(lastEv);
      } else if (lastEv?.type === 'clear') {
        this.clearMentorLayer();
      }
      return;
    }

    if (!this.isScaling) {
      this.refreshMentorLayer();
    }
  }
  get mentorEvents() {
    return this._mentorEvents;
  }
  private _mentorEvents: CanvasEvent[] = [];

  @Input() set studentEvents(events: CanvasEvent[]) {
    this._studentEvents = events;
    if (!this.isScaling && !this.isDrawing) {
      this.refreshStudentLayer();
    }
  }
  get studentEvents() {
    return this._studentEvents;
  }
  private _studentEvents: CanvasEvent[] = [];

  @Input() set currentTime(time: number) {
    this._currentTime = time;
    this.renderFrame(time);
  }
  get currentTime() {
    return this._currentTime;
  }
  private _currentTime = 0;

  @Input() isDrawingMode = false;
  @Input() set canDraw(value: boolean) {
    this._canDraw = value;
    this.updateCursorForTool(this._currentTool);
  }
  get canDraw(): boolean {
    return this._canDraw;
  }
  private _canDraw = true;

  @Input() set currentTool(tool: CanvasTool) {
    this._currentTool = tool;
    this.updateCursorForTool(tool);
  }
  get currentTool(): CanvasTool {
    return this._currentTool;
  }
  private _currentTool: CanvasTool = 'pen';
  @Input() color = '#1982C4';
  @Input() opacity = 1;
  @Input() snapToGrid = false;
  @Input() shadowEnabled = false;
  @Input() thickness = 5;
  @Input() fontSize = 24;
  @Input() fontFamily = 'Arial';
  @Input() strokeDash: number[] = [];
  @Input() fillType: 'solid' | 'linear' | 'radial' | 'none' = 'solid';
  @Input() fillGradientColor1 = '#1982C4';
  @Input() fillGradientColor2 = '#FF66C4';
  @Input() fillGradientDirection: 'to-right' | 'to-bottom' | 'to-bottom-right' | 'to-top-right' =
    'to-right';
  @Input() currentBrushPreset: BrushPreset = 'round';
  @Input() cornerRadius = 0;
  @Input() userRole: 'mentor' | 'student' | 'staff' | 'parent' | null = null;
  @Input() isRecording = false;
  @Input() recordingStartTime = 0;
  @Input() isCanvasOnlyRecording = false;
  @Input() audioPlayerRef?: ElementRef<HTMLAudioElement>;
  @Input() collaborationEnabled = false;
  @Input() sessionId: number | null = null;
  @Input() currentUserId: number | null = null;
  @Input() currentUsername: string = 'Anonymous';

  @Output() eventCreated = new EventEmitter<CanvasEvent>();
  @Output() textInputRequested = new EventEmitter<{
    x: number;
    y: number;
    color: string;
    startTimestamp?: number;
  }>();
  @Output() targetSelected = new EventEmitter<string>();
  @Output() eventUpdated = new EventEmitter<CanvasEvent>();

  selectedEventId: string | null = null;
  isScaling = false;

  stage!: Konva.Stage;
  mentorLayer!: Konva.Layer;
  studentLayer!: Konva.Layer;
  renderedShapes = new Map<number, Konva.Shape | Konva.Group>();
  imageCache = new Map<string, HTMLImageElement>();

  isDrawing = false;
  lastLine: Konva.Shape | Konva.Group | null = null;
  lastLinePointTimes: number[] = [];

  private undoStack: [CanvasEvent[], CanvasEvent[]][] = [];
  private redoStack: [CanvasEvent[], CanvasEvent[]][] = [];
  private maxUndoSteps = 20;

  private MIN_ZOOM = 0.1;
  private MAX_ZOOM = 5.0;
  private ZOOM_STEP = 0.1;
  private PAN_SPEED = 10;
  zoom = 1;
  panOffsetX = 0;
  panOffsetY = 0;
  private isPanning = false;
  private lastPanX = 0;
  private lastPanY = 0;
  private lastPinchDistance = 0;
  private lastPinchMidX = 0;
  private lastPinchMidY = 0;

  @Output() zoomChanged = new EventEmitter<number>();

  private cdr = inject(ChangeDetectorRef);
  private transformer: Konva.Transformer | null = null;
  private transformerLayer!: Konva.Layer;
  private remoteCursorsLayer!: Konva.Layer;
  private remoteCursorsMap = new Map<number, Konva.Group>();
  private cursorTimeouts = new Map<number, any>();
  private collaborationService = inject(CanvasCollaborationService);
  private cursorSubscription: Subscription | null = null;
  private eventSubscription: Subscription | null = null;
  private connectionSubscription: Subscription | null = null;
  private cursorMoveThrottleHandle: ReturnType<typeof setTimeout> | null = null;
  private readonly CURSOR_THROTTLE_MS = 100; // 10fps to prevent backend ChannelFull exceptions
  private collaborationInitialized = false;

  brushPresets: Record<
    BrushPreset,
    {
      name: string;
      icon: string;
      tension: number;
      lineCap: 'round' | 'square' | 'butt';
      lineJoin: 'round' | 'miter' | 'bevel';
      opacity?: number;
      shadowBlur?: number;
    }
  > = {
    round: {
      name: 'Round',
      icon: 'fas fa-circle',
      tension: 0.5,
      lineCap: 'round',
      lineJoin: 'round',
    },
    calligraphy: {
      name: 'Calligraphy',
      icon: 'fas fa-pen-fancy',
      tension: 0.3,
      lineCap: 'butt',
      lineJoin: 'miter',
    },
    square: {
      name: 'Square',
      icon: 'fas fa-square',
      tension: 0.5,
      lineCap: 'square',
      lineJoin: 'miter',
    },
    crayon: {
      name: 'Crayon',
      icon: 'fas fa-highlighter',
      tension: 0.2,
      lineCap: 'round',
      lineJoin: 'round',
    },
    'fine-pen': {
      name: 'Fine Pen',
      icon: 'fas fa-pen',
      tension: 0.8,
      lineCap: 'round',
      lineJoin: 'round',
    },
    spray: {
      name: 'Spray',
      icon: 'fas fa-spray-can',
      tension: 0.5,
      lineCap: 'round',
      lineJoin: 'round',
    },
    highlighter: {
      name: 'Highlighter',
      icon: 'fas fa-marker',
      tension: 0.5,
      lineCap: 'square',
      lineJoin: 'round',
      opacity: 0.4,
    },
    watercolor: {
      name: 'Watercolor',
      icon: 'fas fa-water',
      tension: 0.5,
      lineCap: 'round',
      lineJoin: 'round',
      opacity: 0.6,
      shadowBlur: 5,
    },
  };

  getBrushProps(preset: BrushPreset): {
    tension: number;
    lineCap: 'round' | 'square' | 'butt';
    lineJoin: 'round' | 'miter' | 'bevel';
    opacity?: number;
    shadowBlur?: number;
  } {
    return this.brushPresets[preset] || this.brushPresets['round'];
  }

  ngAfterViewInit() {
    this.initKonva();
  }

  ngOnDestroy() {
    if (this.transformer) {
      this.transformer.destroy();
    }
    if (this.stage) {
      this.stage.destroy();
    }

    if (this.cursorSubscription) {
      this.cursorSubscription.unsubscribe();
    }
    if (this.eventSubscription) {
      this.eventSubscription.unsubscribe();
    }
    if (this.connectionSubscription) {
      this.connectionSubscription.unsubscribe();
    }
    if (this.cursorMoveThrottleHandle) {
      clearTimeout(this.cursorMoveThrottleHandle);
    }

    if (this.collaborationEnabled) {
      this.collaborationService.disconnect();
    }
  }

  @HostListener('window:resize')
  onResize() {
    if (this.stage) {
      this.stage.width(window.innerWidth);
      this.stage.height(window.innerHeight);
    }
  }

  initKonva() {
    if (!this.konvaContainer) return;

    this.stage = new Konva.Stage({
      container: this.konvaContainer.nativeElement,
      width: window.innerWidth,
      height: window.innerHeight,
      pixelRatio: window.devicePixelRatio || 1,
    });

    this.mentorLayer = new Konva.Layer();
    this.studentLayer = new Konva.Layer();
    this.transformerLayer = new Konva.Layer();
    this.remoteCursorsLayer = new Konva.Layer({ listening: false });

    this.stage.add(this.mentorLayer);
    this.stage.add(this.studentLayer);
    this.stage.add(this.transformerLayer);
    this.stage.add(this.remoteCursorsLayer);

    this.transformer = new Konva.Transformer({
      keepRatio: true,
      enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
      borderStroke: '#3b82f6',
      borderStrokeWidth: 1.5,
      borderDash: [4, 3],
      anchorStroke: '#3b82f6',
      anchorFill: '#ffffff',
      anchorSize: 10,
      anchorCornerRadius: 3,
      rotateEnabled: false,
      padding: 6,
    });
    this.transformerLayer.add(this.transformer);

    this.refreshStudentLayer();
    this.renderFrame(this.currentTime);

    this.stage.on('mousedown touchstart', (e) => this.onMouseDown(e));
    this.stage.on('mousemove touchmove', (e) => this.onMouseMove(e));
    this.stage.on('mouseup touchend', () => this.onMouseUp());

    this.stage.on('click tap', (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (e.target === this.stage) {
        this.deselectImage();
      }
    });

    const container = this.stage.container();
    container.addEventListener('wheel', (e: WheelEvent) => this.onWheel(e), { passive: false });

    container.addEventListener('touchstart', (e: TouchEvent) => this.onTouchStart(e), {
      passive: false,
    });
    container.addEventListener('touchmove', (e: TouchEvent) => this.onTouchMove(e), {
      passive: false,
    });
    container.addEventListener('touchend', (e: TouchEvent) => this.onTouchEnd(e), {
      passive: false,
    });

    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));

    if (this.collaborationEnabled && this.sessionId !== null && this.currentUserId !== null) {
      this.initCollaboration();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (
      this.collaborationEnabled &&
      this.sessionId !== null &&
      this.currentUserId !== null &&
      !this.collaborationInitialized
    ) {
      this.initCollaboration();
    }
  }

  private initCollaboration(): void {
    this.collaborationInitialized = true;

    if (this.eventSubscription) this.eventSubscription.unsubscribe();
    if (this.cursorSubscription) this.cursorSubscription.unsubscribe();
    if (this.connectionSubscription) this.connectionSubscription.unsubscribe();

    this.eventSubscription = this.collaborationService.getCanvasEvents().subscribe({
      next: (event) => this.handleRemoteCanvasEvent(event),
    });

    this.cursorSubscription = this.collaborationService.getCursorPositions().subscribe({
      next: (position) => this.handleRemoteCursorPosition(position),
    });

    this.connectionSubscription = this.collaborationService.getConnectionStatus().subscribe({
      next: (isConnected) => {
        console.log(`Collaboration ${isConnected ? 'connected' : 'disconnected'}`);
      },
    });
  }

  private handleRemoteCanvasEvent(event: RemoteCanvasEvent): void {
    if (event.type === 'clear') {
      if (event.role === 'mentor') this.clearMentorLayer();
      else if (event.role === 'student') this.clearStudentLayer();
      return;
    }

    if (event.userId === this.currentUserId) return;

    try {
      if (event.type === 'draw_line' || event.type === 'line') {
        this.renderRemoteLineEvent(event as RemoteLineEvent);
      } else if (event.type === 'draw_shape') {
        this.renderRemoteShapeEvent(event as RemoteShapeEvent);
      }
    } catch (error) {
      console.error('Error handling remote canvas event:', error);
    }
  }

  private renderRemoteLineEvent(event: RemoteLineEvent): void {
    const layer = event.role === 'mentor' ? this.mentorLayer : this.studentLayer;
    const ev = event as any;
    const commonProps = {
      stroke: ev.stroke || '#000000',
      strokeWidth: ev.strokeWidth || 2,
      dash: ev.strokeDash,
      opacity: ev.opacity ?? 1,
      shadowColor: ev.shadowColor,
      shadowBlur: ev.shadowBlur,
      shadowOffset: { x: ev.shadowOffsetX || 0, y: ev.shadowOffsetY || 0 },
      shadowOpacity: ev.shadowOpacity,
      globalCompositeOperation: (ev.globalCompositeOperation ||
        (ev.tool === 'eraser' ? 'destination-out' : 'source-over')) as GlobalCompositeOperation,
    };

    const dragBoundFunc = (pos: any) => {
      if (this.snapToGrid) {
        return {
          x: Math.round(pos.x / 20) * 20,
          y: Math.round(pos.y / 20) * 20,
        };
      }
      return pos;
    };

    const line = new Konva.Line({
      points: event.points || [],
      tension: event.tension || 0,
      lineCap: 'round',
      lineJoin: 'round',
      ...commonProps,
      draggable: true,
      dragBoundFunc,
    });
    layer.add(line);
    layer.batchDraw();
  }

  private renderRemoteShapeEvent(event: RemoteShapeEvent): void {
    const layer = event.role === 'mentor' ? this.mentorLayer : this.studentLayer;
    let shape: Konva.Shape;

    const commonProps = {
      x: event.x || 0,
      y: event.y || 0,
      stroke: event.stroke || '#000000',
      strokeWidth: event.strokeWidth || 2,
      fill: event.fill,
      opacity: event.opacity || 1,
      globalCompositeOperation: (event.globalCompositeOperation ||
        (event.tool === 'eraser' ? 'destination-out' : 'source-over')) as GlobalCompositeOperation,
    };

    switch (event.shapeType) {
      case 'rect':
        shape = new Konva.Rect({
          ...commonProps,
          width: event.width || 0,
          height: event.height || 0,
        });
        break;
      case 'circle':
        shape = new Konva.Circle({
          ...commonProps,
          radius: event.radius || 0,
        });
        break;
      case 'ellipse':
        shape = new Konva.Ellipse({
          ...commonProps,
          radiusX: event.radiusX || 0,
          radiusY: event.radiusY || 0,
        });
        break;
      default:
        console.warn('Unknown shape type:', event.shapeType);
        return;
    }

    layer.add(shape);
    layer.batchDraw();
  }

  private handleRemoteCursorPosition(position: RemoteCursorPosition): void {
    if (String(position.userId) === String(this.currentUserId)) return;

    const cursor = this.remoteCursorsMap.get(position.userId);

    if (cursor) {
      if ((cursor as any).currentTween) {
        (cursor as any).currentTween.destroy();
      }

      const tween = new Konva.Tween({
        node: cursor,
        x: position.x,
        y: position.y,
        duration: 0.05,
        easing: Konva.Easings.Linear,
        onUpdate: () => this.remoteCursorsLayer.batchDraw(),
      });
      (cursor as any).currentTween = tween;
      tween.play();
    } else {
      const cursorGroup = new Konva.Group({
        x: position.x,
        y: position.y,
      });

      const cursorShape = new Konva.Line({
        points: [0, 0, 0, 16, 4, 12, 8, 18, 10, 17, 6, 11, 12, 11],
        fill: position.color || '#FF0000',
        stroke: '#FFFFFF',
        strokeWidth: 1.5,
        closed: true,
        listening: false,
      });

      const labelBg = new Konva.Rect({
        x: 14,
        y: 12,
        width: 0,
        height: 18,
        fill: position.color || '#FF0000',
        cornerRadius: 3,
        listening: false,
      });

      const labelText = new Konva.Text({
        x: 17,
        y: 14,
        text: position.username || 'User',
        fontSize: 11,
        fontFamily: 'Arial',
        fill: '#FFFFFF',
        listening: false,
      });

      labelBg.width(labelText.width() + 6);

      cursorGroup.add(labelBg);
      cursorGroup.add(labelText);
      cursorGroup.add(cursorShape);

      this.remoteCursorsLayer.add(cursorGroup);
      this.remoteCursorsMap.set(position.userId, cursorGroup);
    }

    const updatedCursor = this.remoteCursorsMap.get(position.userId);
    if (updatedCursor) {
      updatedCursor.visible(true);
    }

    if (this.cursorTimeouts.has(position.userId)) {
      clearTimeout(this.cursorTimeouts.get(position.userId));
    }

    const timeoutHandle = setTimeout(() => {
      const c = this.remoteCursorsMap.get(position.userId);
      if (c) {
        c.visible(false);
        this.remoteCursorsLayer.batchDraw();
      }
      this.cursorTimeouts.delete(position.userId);
    }, 3000);

    this.cursorTimeouts.set(position.userId, timeoutHandle);

    this.remoteCursorsLayer.batchDraw();
  }

  sendCursorPosition(x: number, y: number): void {
    if (this.cursorMoveThrottleHandle) return;

    this.cursorMoveThrottleHandle = setTimeout(() => {
      this.cursorMoveThrottleHandle = null;
    }, this.CURSOR_THROTTLE_MS);

    this.collaborationService.sendCursorPosition(x, y);
  }

  private generateUserColor(userId: number): string {
    const colors = [
      '#FF6B6B',
      '#4ECDC4',
      '#45B7D1',
      '#FFA07A',
      '#98D8C8',
      '#F7DC6F',
      '#BB8FCE',
      '#85C1E2',
      '#F8B739',
      '#52BE80',
    ];
    return colors[userId % colors.length];
  }

  private sendCanvasEvent(event: RemoteCanvasEvent): void {
    if (!this.collaborationEnabled || !this.sessionId) return;
    this.collaborationService.sendCanvasEvent(event);
  }

  getWorldPointerPosition(): Konva.Vector2d | null {
    const pointer = this.stage.getPointerPosition();
    if (!pointer) return null;
    const transform = this.stage.getAbsoluteTransform().copy().invert();
    return transform.point(pointer);
  }

  private spacebarHeld = false;

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const pointer = this.stage.getPointerPosition();
    if (!pointer) return;

    if (!e.ctrlKey) {
      let dx = e.deltaX;
      let dy = e.deltaY;

      if (e.shiftKey && dx === 0) {
        dx = dy;
        dy = 0;
      }

      this.stage.position({
        x: this.stage.x() - dx,
        y: this.stage.y() - dy,
      });
      this.panOffsetX = this.stage.x();
      this.panOffsetY = this.stage.y();
      this.stage.batchDraw();
      return;
    }

    const oldScale = this.stage.scaleX();
    const mousePointTo = {
      x: (pointer.x - this.stage.x()) / oldScale,
      y: (pointer.y - this.stage.y()) / oldScale,
    };

    const scaleBy = 1.1;
    const direction = e.deltaY > 0 ? -1 : 1;
    let newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
    newScale = Math.max(this.MIN_ZOOM, Math.min(this.MAX_ZOOM, newScale));

    this.zoom = newScale;
    this.stage.scale({ x: newScale, y: newScale });

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };
    this.stage.position(newPos);
    this.panOffsetX = newPos.x;
    this.panOffsetY = newPos.y;

    this.stage.batchDraw();
    this.zoomChanged.emit(this.zoom);
    this.cdr.markForCheck();
  }

  private onTouchStart(e: TouchEvent): void {
    if (e.touches.length === 2) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      this.lastPinchDistance = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      this.lastPinchMidX = (t1.clientX + t2.clientX) / 2;
      this.lastPinchMidY = (t1.clientY + t2.clientY) / 2;
    }
  }

  private onTouchMove(e: TouchEvent): void {
    if (e.touches.length === 2) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const newDistance = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const newMidX = (t1.clientX + t2.clientX) / 2;
      const newMidY = (t1.clientY + t2.clientY) / 2;
      const rect = this.stage.container().getBoundingClientRect();

      if (this.lastPinchDistance > 0) {
        const oldScale = this.stage.scaleX();
        let newScale = oldScale * (newDistance / this.lastPinchDistance);
        newScale = Math.max(this.MIN_ZOOM, Math.min(this.MAX_ZOOM, newScale));

        const pointer = { x: newMidX - rect.left, y: newMidY - rect.top };
        const mousePointTo = {
          x: (pointer.x - this.stage.x()) / oldScale,
          y: (pointer.y - this.stage.y()) / oldScale,
        };

        this.zoom = newScale;
        this.stage.scale({ x: newScale, y: newScale });
        this.stage.position({
          x: pointer.x - mousePointTo.x * newScale,
          y: pointer.y - mousePointTo.y * newScale,
        });
        this.stage.batchDraw();
        this.zoomChanged.emit(this.zoom);
      }

      const dx = newMidX - this.lastPinchMidX;
      const dy = newMidY - this.lastPinchMidY;
      this.stage.position({
        x: this.stage.x() + dx,
        y: this.stage.y() + dy,
      });
      this.panOffsetX = this.stage.x();
      this.panOffsetY = this.stage.y();
      this.stage.batchDraw();

      this.lastPinchDistance = newDistance;
      this.lastPinchMidX = newMidX;
      this.lastPinchMidY = newMidY;
    }
  }

  private onTouchEnd(e: TouchEvent): void {
    if (e.touches.length < 2) {
      this.lastPinchDistance = 0;
    }
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.code === 'Space' && !this.spacebarHeld) {
      this.spacebarHeld = true;
      if (this.stage) {
        this.stage.container().style.cursor = 'grab';
      }

      const target = e.target as HTMLElement;
      if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
        e.preventDefault();
      }
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    if (e.code === 'Space') {
      this.spacebarHeld = false;
      this.updateCursorForTool(this._currentTool);
    }
  }

  zoomIn(): void {
    this.animateZoomTo(this.zoom * 1.2);
  }

  zoomOut(): void {
    this.animateZoomTo(this.zoom / 1.2);
  }

  zoomTo(newZoom: number): void {
    const clampedZoom = Math.max(this.MIN_ZOOM, Math.min(this.MAX_ZOOM, newZoom));
    const oldScale = this.stage.scaleX();

    const centerX = this.stage.width() / 2;
    const centerY = this.stage.height() / 2;
    const mousePointTo = {
      x: (centerX - this.stage.x()) / oldScale,
      y: (centerY - this.stage.y()) / oldScale,
    };

    this.zoom = clampedZoom;
    this.stage.scale({ x: clampedZoom, y: clampedZoom });
    this.stage.position({
      x: centerX - mousePointTo.x * clampedZoom,
      y: centerY - mousePointTo.y * clampedZoom,
    });
    this.panOffsetX = this.stage.x();
    this.panOffsetY = this.stage.y();

    this.stage.batchDraw();
    this.zoomChanged.emit(this.zoom);
    this.cdr.markForCheck();
  }

  private animateZoomTo(targetZoom: number, durationMs = 150): void {
    const clampedTarget = Math.max(this.MIN_ZOOM, Math.min(this.MAX_ZOOM, targetZoom));
    const startZoom = this.zoom;
    const startPanX = this.panOffsetX;
    const startPanY = this.panOffsetY;
    const startTime = performance.now();

    const centerX = this.stage.width() / 2;
    const centerY = this.stage.height() / 2;
    const mousePointTo = {
      x: (centerX - startPanX) / startZoom,
      y: (centerY - startPanY) / startZoom,
    };

    const targetPanX = centerX - mousePointTo.x * clampedTarget;
    const targetPanY = centerY - mousePointTo.y * clampedTarget;

    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      const easedProgress = easeOut(progress);

      const currentZoom = startZoom + (clampedTarget - startZoom) * easedProgress;
      const currentPanX = startPanX + (targetPanX - startPanX) * easedProgress;
      const currentPanY = startPanY + (targetPanY - startPanY) * easedProgress;

      this.zoom = currentZoom;
      this.stage.scale({ x: currentZoom, y: currentZoom });
      this.stage.position({ x: currentPanX, y: currentPanY });
      this.panOffsetX = currentPanX;
      this.panOffsetY = currentPanY;
      this.stage.batchDraw();

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.zoomChanged.emit(this.zoom);
        this.cdr.markForCheck();
      }
    };

    requestAnimationFrame(animate);
  }

  resetView(): void {
    this.zoom = 1;
    this.panOffsetX = 0;
    this.panOffsetY = 0;
    this.stage.scale({ x: 1, y: 1 });
    this.stage.position({ x: 0, y: 0 });
    this.stage.batchDraw();
    this.zoomChanged.emit(this.zoom);
    this.cdr.markForCheck();
  }

  getZoom(): number {
    return this.zoom;
  }

  getZoomPercent(): number {
    return Math.round(this.zoom * 100);
  }

  startPan(x: number, y: number): void {
    this.isPanning = true;
    this.lastPanX = x;
    this.lastPanY = y;
    if (this.stage) {
      this.stage.container().style.cursor = 'grabbing';
    }
  }

  pan(dx: number, dy: number): void {
    if (!this.isPanning) return;
    this.panOffsetX += dx;
    this.panOffsetY += dy;
    if (this.stage) {
      this.stage.position({ x: this.panOffsetX, y: this.panOffsetY });
      this.stage.batchDraw();
    }
  }

  endPan(): void {
    this.isPanning = false;
    if (this.stage) {
      const idleCursor = this.spacebarHeld || this._currentTool === 'hand' ? 'grab' : '';
      this.stage.container().style.cursor = idleCursor;
    }
  }

  private updateCursorForTool(tool: CanvasTool): void {
    if (!this.stage) return;
    if (this.isPanning) return;
    const container = this.stage.container();

    if (this.spacebarHeld || tool === 'hand') {
      container.style.cursor = 'grab';
    } else if (!this.canDraw && this.userRole === 'student') {
      container.style.cursor = 'not-allowed';
    } else if (tool === 'eraser') {
      container.style.cursor = 'cell';
    } else if (tool === 'image' || tool === 'sprite' || tool === 'audio' || tool === 'animation') {
      container.style.cursor = 'crosshair';
    } else if (tool === 'text') {
      container.style.cursor = 'text';
    } else {
      container.style.cursor = 'crosshair';
    }
  }

  isSpacebarHeld(): boolean {
    return this.spacebarHeld;
  }

  private selectedShape: Konva.Node | null = null;

  deselectAll() {
    if (this.selectedShape) {
      if (this.selectedShape instanceof Konva.Shape) {
        this.selectedShape.strokeEnabled(this._selectedShapeWasStrokeEnabled ?? true);
      }
      this.selectedShape = null;
    }
    if (this.transformer) {
      this.transformer.nodes([]);
      this.transformerLayer.batchDraw();
    }
    this.selectedEventId = null;
    this.cdr.markForCheck();
  }

  private _selectedShapeWasStrokeEnabled: boolean | undefined = undefined;

  selectShape(node: Konva.Node, eventId: string) {
    if (this.selectedShape === node) return;
    this.deselectAll();
    this.selectedShape = node;
    this.selectedEventId = eventId;

    if (node instanceof Konva.Shape && node.getClassName() !== 'Line') {
      this._selectedShapeWasStrokeEnabled = node.strokeEnabled();
    }

    if (node instanceof Konva.Shape) {
      node.stroke('#3b82f6');
      node.strokeWidth(2);
      node.strokeEnabled(true);
      node.dash([5, 3]);
    }
    if (node instanceof Konva.Group) {
      node.getChildren().forEach((child) => {
        if (child instanceof Konva.Shape) {
          child.stroke('#3b82f6');
          child.strokeWidth(2);
          child.strokeEnabled(true);
          child.dash([5, 3]);
        }
      });
    }
    node.getLayer()?.batchDraw();
    this.targetSelected.emit(eventId);
    this.cdr.markForCheck();
  }

  deselectImage() {
    this.deselectAll();
  }

  refreshMentorLayer() {
    if (this.mentorLayer) {
      this.renderedShapes.clear();
      this.mentorLayer.destroyChildren();
      this.renderFrame(this.currentTime);
    }
  }

  refreshStudentLayer() {
    if (this.studentLayer) {
      this.studentLayer.destroyChildren();
      const sorted = [...this._studentEvents].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
      for (const ev of sorted) {
        if (ev.type === 'clear') {
          this.studentLayer.destroyChildren();
        } else {
          this.drawSingleEvent(ev, this.studentLayer);
        }
      }
      this.studentLayer.batchDraw();
    }
  }

  renderFrame(currentTime: number) {
    if (!this.mentorLayer || this.isRecording) return;

    let needsDraw = false;
    let lastClearIndex = -1;
    for (let i = 0; i < this._mentorEvents.length; i++) {
      const ev = this._mentorEvents[i];
      if (ev.type === 'clear' && (ev.timestamp || 0) <= currentTime) {
        lastClearIndex = i;
      }
    }

    for (let i = 0; i < this._mentorEvents.length; i++) {
      const ev = this._mentorEvents[i];
      const startTime = ev.timestamp || 0;

      if (ev.type === 'clear') continue;

      if (i < lastClearIndex) {
        if (this.renderedShapes.has(i)) {
          this.renderedShapes.get(i)!.destroy();
          this.renderedShapes.delete(i);
          needsDraw = true;
        }
        continue;
      }

      if (startTime > currentTime) {
        if (this.renderedShapes.has(i)) {
          this.renderedShapes.get(i)!.destroy();
          this.renderedShapes.delete(i);
          needsDraw = true;
        }
        continue;
      }

      let shape = this.renderedShapes.get(i);
      if (!shape) {
        shape = this.createShapeFromEvent(ev);
        this.mentorLayer.add(shape);
        this.renderedShapes.set(i, shape);
        needsDraw = true;
      }

      const progress = this.getShapeProgress(ev, currentTime);

      if (ev.type === 'line' || !ev.type) {
        const lineShape = shape as Konva.Line;
        const points = ev.points || [];
        if (ev.pointTimes && Array.isArray(ev.pointTimes) && ev.pointTimes.length > 0) {
          const pointsCount = ev.pointTimes.length;
          if (ev.pointTimes[pointsCount - 1] <= currentTime) {
            if (lineShape.points().length !== points.length) {
              lineShape.points(points);
              needsDraw = true;
            }
          } else {
            let validPoints = 0;
            for (let k = 0; k < pointsCount; k++) {
              if (ev.pointTimes[k] <= currentTime) {
                validPoints++;
              } else {
                break;
              }
            }
            const newLength = validPoints * 2;
            if (lineShape.points().length !== newLength) {
              lineShape.points(points.slice(0, newLength));
              needsDraw = true;
            }
          }
        } else {
          if (lineShape.points().length === 0) {
            lineShape.points(points);
            needsDraw = true;
          }
        }
      } else if (ev.type === 'text') {
        const textShape = shape as Konva.Text;
        if (progress >= 1) {
          textShape.text(ev.text || '');
        } else {
          const charsCount = Math.floor(progress * (ev.text?.length || 0));
          textShape.text((ev.text || '').substring(0, charsCount));
          needsDraw = true;
        }
      } else if (ev.type === 'rect') {
        const rect = shape as Konva.Rect;
        rect.width((ev.width || 0) * progress);
        rect.height((ev.height || 0) * progress);
        needsDraw = true;
      } else if (ev.type === 'image') {
        const imgShape = shape as Konva.Image;
        const img = imgShape.image() as HTMLImageElement;
        if (img && img.naturalWidth) {
          const isBeingTransformed = this.transformer?.nodes().includes(imgShape);
          if (!isBeingTransformed) {
            const baseWidth = ev.width || img.naturalWidth;
            const baseHeight = ev.height || img.naturalHeight;
            imgShape.width(baseWidth * (ev.scale || 1));
            imgShape.height(baseHeight * (ev.scale || 1));
            needsDraw = true;
          }
        }
      } else if (ev.type === 'circle' || ev.type === 'triangle' || ev.type === 'hexagon') {
        const poly = shape as Konva.RegularPolygon;
        poly.radius((ev.radius || 0) * progress);
        needsDraw = true;
      } else if (ev.type === 'star') {
        const star = shape as Konva.Star;
        star.innerRadius((ev.innerRadius || 0) * progress);
        star.outerRadius((ev.outerRadius || 0) * progress);
        needsDraw = true;
      } else if (ev.type === 'ellipse') {
        const ellipse = shape as Konva.Ellipse;
        ellipse.radiusX((ev.radiusX || 0) * progress);
        ellipse.radiusY((ev.radiusY || 0) * progress);
        needsDraw = true;
      } else if (ev.type === 'ring' || ev.type === 'arc') {
        const r = shape as Konva.Ring | Konva.Arc;
        r.innerRadius((ev.innerRadius || 0) * progress);
        r.outerRadius((ev.outerRadius || 0) * progress);
        if (ev.type === 'arc') {
          (r as Konva.Arc).angle((ev.angle || 0) * progress);
        }
        needsDraw = true;
      } else if (ev.type === 'wedge') {
        const w = shape as Konva.Wedge;
        w.radius((ev.radius || 0) * progress);
        w.angle((ev.angle || 0) * progress);
        needsDraw = true;
      } else if (ev.type === 'path' || ev.type === 'textpath' || ev.type === 'label') {
        shape.opacity(progress);
        needsDraw = true;
      } else if (ev.type === 'arrow' || ev.type === 'straight-line') {
        if (ev.points && ev.points.length >= 4) {
          const startX = ev.points[0];
          const startY = ev.points[1];
          const endX = ev.points[2];
          const endY = ev.points[3];
          const currX = startX + (endX - startX) * progress;
          const currY = startY + (endY - startY) * progress;
          (shape as Konva.Line).points([startX, startY, currX, currY]);
          needsDraw = true;
        }
      }
    }

    for (const key of Array.from(this.renderedShapes.keys())) {
      if (key >= this._mentorEvents.length) {
        this.renderedShapes.get(key)!.destroy();
        this.renderedShapes.delete(key);
        needsDraw = true;
      }
    }

    if (needsDraw) {
      this.mentorLayer.batchDraw();
    }
  }

  private renderShapeImmediate(ev: CanvasEvent) {
    if (!this.mentorLayer) return;
    const idx = this._mentorEvents.indexOf(ev);
    if (idx === -1) return;
    if (this.renderedShapes.has(idx)) return;
    const shape = this.createShapeFromEvent(ev);
    if (ev.type === 'image') {
      const img = (shape as Konva.Image).image() as HTMLImageElement;
      if (img && img.complete && img.naturalWidth) {
        const baseWidth = ev.width || img.naturalWidth;
        const baseHeight = ev.height || img.naturalHeight;
        (shape as Konva.Image).width(baseWidth * (ev.scale || 1));
        (shape as Konva.Image).height(baseHeight * (ev.scale || 1));
      }
    } else if ((ev.type === 'line' || !ev.type) && ev.points) {
      (shape as Konva.Line).points(ev.points);
    }

    this.mentorLayer.add(shape);
    this.renderedShapes.set(idx, shape);
    this.mentorLayer.batchDraw();
  }

  getShapeProgress(ev: CanvasEvent, currentTime: number): number {
    if (!ev.pointTimes || ev.pointTimes.length === 0) return 1;
    const start = ev.pointTimes[0];
    const end = ev.pointTimes[ev.pointTimes.length - 1];
    if (end <= start) return 1;
    return Math.min(1, Math.max(0, (currentTime - start) / (end - start)));
  }

  private selectImageForResize(konvaImg: Konva.Image, ev: CanvasEvent) {
    if (!this.transformer) return;
    this.selectedEventId = ev.id || null;
    this.selectedShape = konvaImg;
    this.transformer.nodes([konvaImg]);
    this.transformerLayer.batchDraw();
    this.targetSelected.emit(ev.id || '');
    this.cdr.markForCheck();
  }

  buildGradientPointsForShape(
    ev: CanvasEvent,
    w: number,
    h: number,
  ): [[number, number], [number, number]] {
    const direction =
      (ev as unknown as { fillGradientDirection?: string }).fillGradientDirection || 'to-right';
    switch (direction) {
      case 'to-bottom':
        return [
          [0, 0],
          [0, h],
        ];
      case 'to-bottom-right':
        return [
          [0, 0],
          [w, h],
        ];
      case 'to-top-right':
        return [
          [0, h],
          [w, 0],
        ];
      case 'to-right':
      default:
        return [
          [0, 0],
          [w, 0],
        ];
    }
  }

  buildFillProps(ev: CanvasEvent): Record<string, unknown> {
    const w = ev.width || 100;
    const h = ev.height || 100;
    const fillType = ev.fillType || 'solid';

    if (fillType === 'none') {
      return { fill: undefined };
    }
    if (fillType === 'solid') {
      return { fill: ev.stroke || 'black' };
    }
    if (fillType === 'linear') {
      const [start, end] = this.buildGradientPointsForShape(ev, w, h);
      return {
        fillLinearGradientStartPoint: ev.fillLinearGradientStartPoint || start,
        fillLinearGradientEndPoint: ev.fillLinearGradientEndPoint || end,
        fillLinearGradientColorStops: ev.fillLinearGradientColorStops || [
          0,
          '#1982C4',
          1,
          '#FF66C4',
        ],
      };
    }
    if (fillType === 'radial') {
      return {
        fillRadialGradientStartPoint: ev.fillRadialGradientStartPoint || [w / 2, h / 2],
        fillRadialGradientEndPoint: ev.fillRadialGradientEndPoint || [w / 2, h / 2],
        fillRadialGradientStartRadius: ev.fillRadialGradientStartRadius ?? 0,
        fillRadialGradientEndRadius: ev.fillRadialGradientEndRadius ?? Math.max(w, h) / 2,
        fillRadialGradientColorStops: ev.fillRadialGradientColorStops || [
          0,
          '#1982C4',
          1,
          '#FF66C4',
        ],
      };
    }
    return { fill: ev.stroke || 'black' };
  }

  buildLiveFillProps(strokeColor: string): Record<string, unknown> {
    const w = 100;
    const h = 100;
    if (this.fillType === 'none') {
      return { fill: undefined };
    }
    if (this.fillType === 'solid') {
      return { fill: strokeColor };
    }
    const colorStops = [0, this.fillGradientColor1, 1, this.fillGradientColor2];
    const points = this.getLiveGradientPoints(w, h);
    if (this.fillType === 'linear') {
      return {
        fillLinearGradientStartPoint: points[0],
        fillLinearGradientEndPoint: points[1],
        fillLinearGradientColorStops: colorStops,
      };
    }
    if (this.fillType === 'radial') {
      return {
        fillRadialGradientStartPoint: [w / 2, h / 2],
        fillRadialGradientEndPoint: [w / 2, h / 2],
        fillRadialGradientStartRadius: 0,
        fillRadialGradientEndRadius: Math.max(w, h) / 2,
        fillRadialGradientColorStops: colorStops,
      };
    }
    return { fill: strokeColor };
  }

  private getLiveGradientPoints(w: number, h: number): [[number, number], [number, number]] {
    switch (this.fillGradientDirection) {
      case 'to-bottom':
        return [
          [0, 0],
          [0, h],
        ];
      case 'to-bottom-right':
        return [
          [0, 0],
          [w, h],
        ];
      case 'to-top-right':
        return [
          [0, h],
          [w, 0],
        ];
      case 'to-right':
      default:
        return [
          [0, 0],
          [w, 0],
        ];
    }
  }

  createShapeFromEvent(ev: CanvasEvent): Konva.Shape | Konva.Group {
    const fillProps = this.buildFillProps(ev);
    const commonProps = {
      stroke: ev.stroke || 'black',
      strokeWidth: ev.strokeWidth || 5,
      dash: ev.strokeDash && ev.strokeDash.length > 0 ? ev.strokeDash : undefined,
      globalCompositeOperation: (ev.globalCompositeOperation ||
        (ev.tool === 'eraser' ? 'destination-out' : 'source-over')) as GlobalCompositeOperation,
      opacity: ev.opacity !== undefined ? ev.opacity : 1,
      shadowColor: ev.shadowColor,
      shadowBlur: ev.shadowBlur,
      shadowOffsetX: ev.shadowOffsetX,
      shadowOffsetY: ev.shadowOffsetY,
      shadowOpacity: ev.shadowOpacity,
      ...fillProps,
    };

    const dragBoundFunc = (pos: any) => {
      if (this.snapToGrid) {
        return {
          x: Math.round(pos.x / 20) * 20,
          y: Math.round(pos.y / 20) * 20,
        };
      }
      return pos;
    };

    const shapeProps = { ...commonProps, draggable: true, dragBoundFunc };
    let shape: Konva.Shape | Konva.Group;

    switch (ev.type) {
      case 'rect': {
        shape = new Konva.Rect({
          ...shapeProps,
          x: ev.x || 0,
          y: ev.y || 0,
          width: ev.width || 0,
          height: ev.height || 0,
          cornerRadius: ev.cornerRadius ?? 0,
        });
        break;
      }
      case 'circle': {
        shape = new Konva.Circle({
          ...shapeProps,
          x: ev.x || 0,
          y: ev.y || 0,
          radius: ev.radius || 0,
        });
        break;
      }
      case 'star': {
        shape = new Konva.Star({
          ...shapeProps,
          x: ev.x || 0,
          y: ev.y || 0,
          innerRadius: ev.innerRadius || 0,
          outerRadius: ev.outerRadius || 0,
          numPoints: 5,
        });
        break;
      }
      case 'text': {
        shape = new Konva.Text({
          text: ev.text,
          x: ev.x,
          y: ev.y,
          fontSize: ev.fontSize || 24,
          fontFamily: ev.fontFamily || 'Arial',
          fill: ev.stroke || 'black',
          draggable: true,
        });
        break;
      }
      case 'arrow': {
        shape = new Konva.Arrow({
          ...shapeProps,
          x: ev.x || 0,
          y: ev.y || 0,
          points: ev.points || [],
          pointerLength: 10,
          pointerWidth: 10,
          fill: ev.stroke || 'black',
        });
        break;
      }
      case 'triangle':
      case 'pentagon':
      case 'hexagon': {
        const sides = ev.type === 'triangle' ? 3 : ev.type === 'pentagon' ? 5 : 6;
        shape = new Konva.RegularPolygon({
          ...shapeProps,
          x: ev.x || 0,
          y: ev.y || 0,
          sides: sides,
          radius: ev.radius || 0,
        });
        break;
      }
      case 'diamond': {
        shape = new Konva.Line({
          ...shapeProps,
          x: ev.x || 0,
          y: ev.y || 0,
          points: ev.points || [0, 0, 0, 0, 0, 0, 0, 0],
          closed: true,
        });
        break;
      }
      case 'heart': {
        shape = new Konva.Path({
          ...shapeProps,
          x: ev.x || 0,
          y: ev.y || 0,
          data: 'M 0,20 C -20,-20 -60,0 -60,40 C -60,80 0,120 0,120 C 0,120 60,80 60,40 C 60,0 20,-20 0,20 Z',
          offsetX: 0,
          offsetY: 50,
          scaleX: ev.scale || 0,
          scaleY: ev.scale || 0,
          strokeScaleEnabled: false,
        });
        break;
      }
      case 'straight-line': {
        shape = new Konva.Line({
          ...shapeProps,
          x: ev.x || 0,
          y: ev.y || 0,
          points: ev.points || [],
          lineCap: 'round',
          lineJoin: 'round',
        });
        break;
      }
      case 'ellipse': {
        shape = new Konva.Ellipse({
          ...shapeProps,
          x: ev.x || 0,
          y: ev.y || 0,
          radiusX: ev.radiusX || 0,
          radiusY: ev.radiusY || 0,
        });
        break;
      }

      case 'image': {
        const imageObj = new Image();
        imageObj.src = ev.assetUrl || '';
        const konvaImg = new Konva.Image({
          strokeWidth: 0,
          x: ev.x || 0,
          y: ev.y || 0,
          image: imageObj,
          draggable: true,
        });

        imageObj.onload = () => {
          if (!ev.width) ev.width = imageObj.naturalWidth;
          if (!ev.height) ev.height = imageObj.naturalHeight;

          konvaImg.width(ev.width * (ev.scale || 1));
          konvaImg.height(ev.height * (ev.scale || 1));

          if (ev.filters && ev.filters.length > 0) {
            const mappedFilters = ev.filters
              .map((fName) => Konva.Filters[fName as keyof typeof Konva.Filters])
              .filter(Boolean);
            if (mappedFilters.length > 0) {
              konvaImg.filters(mappedFilters);
              if (ev.filterConfigs) {
                konvaImg.setAttrs(ev.filterConfigs as unknown as Konva.ImageConfig);
              }
              konvaImg.cache();
            }
          }

          konvaImg.getLayer()?.batchDraw();
        };

        konvaImg.on('click tap', (e) => {
          e.cancelBubble = true;
          this.selectImageForResize(konvaImg, ev);
        });

        konvaImg.on('transformstart', () => {
          this.isScaling = true;
        });

        konvaImg.on('transform', () => {
          const scaleX = konvaImg.scaleX();
          const scaleY = konvaImg.scaleY();
          const baseWidth = ev.width || imageObj.naturalWidth;
          const baseHeight = ev.height || imageObj.naturalHeight;

          ev.x = baseWidth * scaleX;
          ev.y = baseHeight * scaleY;
          this.eventUpdated.emit(ev);
        });

        konvaImg.on('transformend', () => {
          const scaleX = konvaImg.scaleX();
          const baseWidth = ev.width || imageObj.naturalWidth;
          const baseHeight = ev.height || imageObj.naturalHeight;

          const newWidth = baseWidth * scaleX;
          const newHeight = baseHeight * konvaImg.scaleY();

          konvaImg.width(newWidth);
          konvaImg.height(newHeight);
          konvaImg.scaleX(1);
          konvaImg.scaleY(1);

          ev.width = newWidth;
          ev.height = newHeight;
          ev.scale = 1;
          ev.x = konvaImg.x();
          ev.y = konvaImg.y();

          this.isScaling = false;
          this.eventUpdated.emit(ev);
          this.transformerLayer.batchDraw();
        });

        konvaImg.on('dragend', () => {
          ev.x = konvaImg.x();
          ev.y = konvaImg.y();
          this.eventUpdated.emit(ev);
        });

        shape = konvaImg;
        break;
      }
      case 'audio': {
        const group = new Konva.Group({
          x: ev.x || 0,
          y: ev.y || 0,
          draggable: true,
        });
        group.add(
          new Konva.Circle({
            radius: 25,
            fill: '#3b82f6',
            stroke: 'white',
            strokeWidth: 3,
          }),
        );
        group.add(
          new Konva.Text({
            text: '🔊',
            fontSize: 24,
            x: -12,
            y: -12,
          }),
        );
        shape = group;
        break;
      }
      case 'animation': {
        const group = new Konva.Group({
          x: ev.x || 0,
          y: ev.y || 0,
          draggable: true,
        });
        const rect = new Konva.Rect({
          width: 50,
          height: 50,
          fill: '#f472b6',
          stroke: 'white',
          strokeWidth: 3,
          offsetX: 25,
          offsetY: 25,
        });
        group.add(rect);

        const anim = new Konva.Animation((frame) => {
          if (!frame) return;
          const scale = 1 + Math.sin(frame.time / 200) * 0.15;
          rect.scale({ x: scale, y: scale });
        }, group.getLayer());
        anim.start();

        shape = group;
        break;
      }
      case 'ring': {
        shape = new Konva.Ring({
          ...shapeProps,
          x: ev.x || 0,
          y: ev.y || 0,
          innerRadius: ev.innerRadius || 0,
          outerRadius: ev.outerRadius || 0,
        });
        break;
      }
      case 'arc': {
        shape = new Konva.Arc({
          ...shapeProps,
          x: ev.x || 0,
          y: ev.y || 0,
          innerRadius: ev.innerRadius || 0,
          outerRadius: ev.outerRadius || 0,
          angle: ev.angle || 0,
          clockwise: ev.clockwise !== undefined ? ev.clockwise : false,
        });
        break;
      }
      case 'wedge': {
        shape = new Konva.Wedge({
          ...shapeProps,
          x: ev.x || 0,
          y: ev.y || 0,
          radius: ev.radius || 0,
          angle: ev.angle || 0,
          clockwise: ev.clockwise !== undefined ? ev.clockwise : false,
        });
        break;
      }
      case 'path': {
        shape = new Konva.Path({
          ...shapeProps,
          x: ev.x || 0,
          y: ev.y || 0,
          data: ev.data || '',
        });
        break;
      }
      case 'textpath': {
        shape = new Konva.TextPath({
          ...shapeProps,
          x: ev.x || 0,
          y: ev.y || 0,
          data: ev.data || '',
          text: ev.text || '',
          fontSize: ev.fontSize || 24,
          fontFamily: ev.fontFamily || 'Arial',
          fill: ev.stroke || 'black',
        });
        break;
      }
      case 'label': {
        const label = new Konva.Label({
          x: ev.x || 0,
          y: ev.y || 0,
          draggable: true,
        });
        label.add(
          new Konva.Tag({
            fill: ev.stroke || 'black',
            pointerDirection: 'down',
            pointerWidth: 10,
            pointerHeight: 10,
            lineJoin: 'round',
          }),
        );
        label.add(
          new Konva.Text({
            text: ev.text || '',
            fontFamily: ev.fontFamily || 'Arial',
            fontSize: ev.fontSize || 18,
            padding: 5,
            fill: 'white',
          }),
        );
        shape = label;
        break;
      }
      case 'sprite': {
        const imageObj = new Image();
        imageObj.src = ev.assetUrl || '';
        const sprite = new Konva.Sprite({
          x: ev.x || 0,
          y: ev.y || 0,
          image: imageObj,
          animation: ev.animationType || 'idle',
          animations: ev.spriteAnimations || { idle: [0, 0, 50, 50] },
          frameRate: 7,
          frameIndex: 0,
          draggable: true,
        });
        imageObj.onload = () => {
          sprite.start();
        };
        shape = sprite;
        break;
      }
      default: {
        const brushPreset = ev.brushPreset || 'round';
        const brushProps = this.getBrushProps(brushPreset);
        const isEraser = ev.tool === 'eraser';
        shape = new Konva.Line({
          ...commonProps,
          listening: false,
          tension: ev.brushTension ?? brushProps.tension,
          lineCap: (isEraser ? 'round' : (ev.brushLineCap ?? brushProps.lineCap)) as
            | 'round'
            | 'square'
            | 'butt',
          lineJoin: (isEraser ? 'round' : (ev.brushLineJoin ?? brushProps.lineJoin)) as
            | 'round'
            | 'miter'
            | 'bevel',
          opacity: ev.opacity ?? (isEraser ? 1 : (brushProps.opacity ?? 1)),
          shadowBlur: ev.shadowBlur ?? (isEraser ? 0 : (brushProps.shadowBlur ?? 0)),
          points: [],
        });
      }
    }

    if (ev.type !== 'line' && ev.tool !== 'pen' && ev.tool !== 'eraser') {
      (shape as Konva.Node).on('dragend', (e: Konva.KonvaEventObject<DragEvent>) => {
        ev.x = e.target.x();
        ev.y = e.target.y();
      });
    }

    shape.id(ev.id || ev.timestamp.toString());

    if (ev.zIndex !== undefined) {
      shape.zIndex(ev.zIndex);
    }

    const eventId = ev.id || ev.timestamp.toString();
    (shape as Konva.Node).on('click tap', (e: Konva.KonvaEventObject<MouseEvent>) => {
      e.cancelBubble = true;
      if (e.evt && (e.evt.metaKey || e.evt.ctrlKey || e.evt.shiftKey)) return;
      this.selectShape(shape as Konva.Node, eventId);
    });

    if (ev.isStatic && ev.type !== 'image' && ev.type !== 'sprite') {
      shape.cache();
    }

    if (ev.audioAssetUrl) {
      (shape as Konva.Node).on('click tap', () => {
        const audio = new Audio(ev.audioAssetUrl);
        audio.play().catch((err) => console.error('Audio play failed', err));
      });
      if (shape instanceof Konva.Group) {
      }
    }

    if (ev.animationType || ev.animationConfig) {
      const config = ev.animationConfig || {
        behavior:
          ev.animationType === 'bounce'
            ? 'gravity'
            : ev.animationType === 'rotate'
              ? 'angular'
              : ev.animationType === 'pulse'
                ? 'harmonic'
                : ev.animationType === 'pendulum'
                  ? 'angular'
                  : 'manual',
      };

      let velocity = 0;
      let velocityX = 0;
      let velocityY = 0;
      let posOffset = 0;
      const originX = ev.x || 0;
      const originY = ev.y || 0;
      const seedParticles: Konva.Circle[] = [];

      const anim = new Konva.Animation((frame) => {
        if (!frame) return;
        const time = frame.time;
        const stage = shape.getStage();
        const stageWidth = stage ? stage.width() : 800;
        const stageHeight = stage ? stage.height() : 600;
        const pointerPos = stage ? stage.getPointerPosition() : null;

        switch (config.behavior) {
          case 'gravity': {
            const g = config.g ?? 0.5;
            const r = config.restitution ?? -0.7;
            velocity += g;
            posOffset += velocity;
            if (posOffset > (config.amplitude || 20)) {
              posOffset = config.amplitude || 20;
              velocity *= r;
            }
            shape.y(originY + posOffset);
            break;
          }
          case 'harmonic': {
            const freq = config.frequency ?? 150;
            const damp = config.damping ?? 2000;
            const amp = config.amplitude ?? 0.15;
            const scale = 1 + Math.sin(time / freq) * Math.exp(-time / damp) * amp;
            shape.scale({ x: scale, y: scale });
            break;
          }
          case 'angular': {
            const spd = config.speed ?? (ev.animationType === 'pendulum' ? 0.3 : 20);
            if (ev.animationType === 'pendulum') {
              const angle = Math.sin(time / 300) * 30;
              shape.rotation(angle);
            } else {
              shape.rotation(time / spd);
            }
            break;
          }
          case 'friction': {
            if (velocityX === 0) velocityX = config.speed ?? 10;
            velocityX *= 0.95;
            shape.x(shape.x() + velocityX);
            break;
          }
          case 'seeds': {
            if (seedParticles.length === 0 && shape instanceof Konva.Group) {
              shape.destroyChildren();
              for (let i = 0; i < 20; i++) {
                const c = new Konva.Circle({
                  radius: 3 + Math.random() * 4,
                  fill: ['#4ade80', '#22c55e', '#16a34a', '#fbbf24'][Math.floor(Math.random() * 4)],
                  x: 0,
                  y: 0,
                });

                c.setAttr('vx', (Math.random() - 0.5) * 10);
                c.setAttr('vy', (Math.random() - 1.0) * 10);
                shape.add(c);
                seedParticles.push(c);
              }
            } else if (seedParticles.length > 0) {
              for (const p of seedParticles) {
                const vx = p.getAttr('vx') as number;
                const vy = p.getAttr('vy') as number;
                p.x(p.x() + vx);
                p.y(p.y() + vy);
                p.setAttr('vy', vy + 0.2);
              }
            }
            break;
          }
          case 'float': {
            const spd = config.speed ?? 50;
            const amp = config.amplitude ?? 20;
            shape.y(originY - ((time / spd) % stageHeight));
            shape.x(originX + Math.sin(time / (spd * 10)) * amp);
            break;
          }
          case 'heartbeat': {
            const freq = config.frequency ?? 150;
            const amp = config.amplitude ?? 0.2;
            const scale =
              1 +
              Math.max(0, Math.sin(time / freq)) * amp +
              Math.max(0, Math.sin(time / freq + 0.5)) * (amp / 2);
            shape.scale({ x: scale, y: scale });
            break;
          }
          case 'swing': {
            const spd = config.speed ?? 300;
            const amp = config.amplitude ?? 45;
            shape.rotation(Math.sin(time / spd) * amp);
            break;
          }
          case 'bounce-bounds': {
            const spd = config.speed ?? 5;
            if (velocityX === 0) {
              velocityX = spd;
              velocityY = spd;
            }
            const nx = shape.x() + velocityX;
            const ny = shape.y() + velocityY;
            if (nx < 0 || nx > stageWidth - 50) velocityX *= -1;
            if (ny < 0 || ny > stageHeight - 50) velocityY *= -1;
            shape.x(nx);
            shape.y(ny);
            break;
          }
          case 'orbit-mouse': {
            const spd = config.speed ?? 300;
            const amp = config.amplitude ?? 100;
            if (pointerPos) {
              shape.x(pointerPos.x + Math.cos(time / spd) * amp);
              shape.y(pointerPos.y + Math.sin(time / spd) * amp);
            }
            break;
          }
          case 'flee-mouse': {
            const spd = config.speed ?? 10;
            if (pointerPos) {
              const dx = shape.x() - pointerPos.x;
              const dy = shape.y() - pointerPos.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < 150) {
                shape.x(shape.x() + (dx / dist) * spd);
                shape.y(shape.y() + (dy / dist) * spd);
              }
            }
            break;
          }
          case 'attract-mouse': {
            const spd = (config.speed ?? 50) / 1000;
            if (pointerPos) {
              const dx = pointerPos.x - shape.x();
              const dy = pointerPos.y - shape.y();
              shape.x(shape.x() + dx * spd);
              shape.y(shape.y() + dy * spd);
            }
            break;
          }
          case 'drift': {
            const freq = config.frequency ?? 1000;
            shape.x(originX + Math.sin(time / freq) * 50 + Math.cos(time / (freq * 0.7)) * 20);
            shape.y(
              originY + Math.cos(time / (freq * 0.8)) * 50 + Math.sin(time / (freq * 0.6)) * 20,
            );
            break;
          }
          case 'zigzag': {
            const freq = config.frequency ?? 10;
            shape.x(originX + ((time / freq) % 200) - 100);
            shape.y(originY + Math.abs(((time / freq) % 100) - 50));
            break;
          }
          case 'swirl': {
            const spd = config.speed ?? 20;
            const rad = (time / spd) % 200;
            shape.x(originX + Math.cos(time / (spd * 10)) * rad);
            shape.y(originY + Math.sin(time / (spd * 10)) * rad);
            break;
          }
          case 'spring-mouse': {
            if (pointerPos) {
              velocityX += (pointerPos.x - shape.x()) * 0.01;
              velocityY += (pointerPos.y - shape.y()) * 0.01;
              velocityX *= 0.9;
              velocityY *= 0.9;
              shape.x(shape.x() + velocityX);
              shape.y(shape.y() + velocityY);
            }
            break;
          }
          case 'fade-pulse': {
            const freq = config.frequency ?? 200;
            shape.opacity(0.5 + Math.sin(time / freq) * 0.5);
            break;
          }
          case 'shake': {
            const amp = config.amplitude ?? 10;
            shape.x(originX + (Math.random() - 0.5) * amp);
            shape.y(originY + (Math.random() - 0.5) * amp);
            break;
          }
          case 'wavy': {
            const freq = config.frequency ?? 200;
            const amp = config.amplitude ?? 50;
            shape.x(originX + ((time / (freq / 10)) % stageWidth));
            shape.y(originY + Math.sin(time / 200) * amp);
            break;
          }
          case 'flip': {
            shape.scaleX(Math.sin(time / 300));
            break;
          }
          case 'slide-in': {
            const targetX = originX;
            if (velocityX === 0) {
              shape.x(-200);
              velocityX = 1;
            }
            shape.x(shape.x() + (targetX - shape.x()) * 0.05);
            break;
          }
          case 'drop-bounce': {
            if (velocityY === 0 && shape.y() === originY) {
              shape.y(-100);
            }
            velocityY += 0.8;
            let ny = shape.y() + velocityY;
            if (ny > originY) {
              ny = originY;
              velocityY *= -0.6;
            }
            shape.y(ny);
            break;
          }
          case 'orbit-center': {
            const cx = stageWidth / 2;
            const cy = stageHeight / 2;
            shape.x(cx + Math.cos(time / 500) * 200);
            shape.y(cy + Math.sin(time / 500) * 200);
            break;
          }
          case 'pop': {
            if (time < 500) {
              const sc = Math.min(1.5, time / 100);
              shape.scale({ x: sc, y: sc });
            } else {
              shape.scale({ x: 1, y: 1 });
            }
            break;
          }
          case 'manual':
          default: {
            if (ev.animationType === 'bounce') {
              velocity += 0.5;
              posOffset += velocity;
              if (posOffset > 20) {
                posOffset = 20;
                velocity *= -0.7;
              }
              shape.y(originY + posOffset);
            } else if (ev.animationType === 'rotate') {
              shape.rotation(time / 20);
            }
            break;
          }
        }
      }, shape.getLayer());
      anim.start();
    }

    return shape;
  }

  drawSingleEvent(ev: CanvasEvent, layer: Konva.Layer) {
    const shape = this.createShapeFromEvent(ev);
    if ((ev.type === 'line' || !ev.type) && ev.points) {
      (shape as Konva.Line).points(ev.points);
    }
    layer.add(shape);
  }

  onMouseDown(e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) {
    const mouseEvent = e.evt as MouseEvent;
    if (this.spacebarHeld || mouseEvent.button === 1) {
      const pos = this.stage.getPointerPosition();
      if (pos) {
        this.startPan(pos.x, pos.y);
        e.evt.preventDefault();
      }
      return;
    }

    if (this.currentTool === 'hand') {
      const pos = this.stage.getPointerPosition();
      if (pos) {
        this.startPan(pos.x, pos.y);
        e.evt.preventDefault();
      }
      return;
    }

    if (!this.isDrawingMode || !this.userRole || !this.canDraw) return;

    if (
      (this.currentTool === 'audio' ||
        this.currentTool === 'animation' ||
        this.currentTool === 'image') &&
      e.target !== e.target.getStage()
    ) {
      const shapeId = e.target.id() || e.target.getParent()?.id();
      if (shapeId && this.currentTool !== 'image') {
        this.targetSelected.emit(shapeId);
        return;
      }
    }

    if (
      (this.currentTool === 'image' || this.currentTool === 'sprite') &&
      e.target === e.target.getStage()
    ) {
      const pos = this.getWorldPointerPosition();
      if (pos) {
        this.targetSelected.emit(`PLACE_AT_${pos.x}_${pos.y}`);
        return;
      }
    }

    if (e.target !== e.target.getStage()) return;

    this.isDrawing = true;
    const pos = this.getWorldPointerPosition();
    if (!pos) return;

    const strokeColor = this.currentTool === 'eraser' ? 'white' : this.color;
    const strokeWidth = this.currentTool === 'eraser' ? this.thickness * 3 : this.thickness;

    if (this.currentTool === 'text') {
      this.isDrawing = false;
      this.lastLine = new Konva.Text({
        x: pos.x,
        y: pos.y,
        text: '',
        fontSize: this.fontSize,
        fontFamily: this.fontFamily,
        fill: strokeColor,
        listening: false,
      });
      const layer = this.userRole === 'mentor' ? this.mentorLayer : this.studentLayer;
      layer.add(this.lastLine as Konva.Shape);
      layer.batchDraw();

      this.textInputRequested.emit({
        x: pos.x,
        y: pos.y,
        color: strokeColor,
        startTimestamp: this.getTimestamp(),
      });
      return;
    }

    if (
      this.currentTool === 'image' ||
      this.currentTool === 'sprite' ||
      this.currentTool === 'audio' ||
      this.currentTool === 'animation'
    ) {
      this.isDrawing = false;
      return;
    }

    this.createTemporaryShape(pos, strokeColor, strokeWidth);

    const timeStamp = this.getTimestamp();
    this.lastLinePointTimes = [timeStamp];

    const layer = this.userRole === 'mentor' ? this.mentorLayer : this.studentLayer;
    layer.add(this.lastLine as Konva.Shape);
  }

  createTemporaryShape(pos: Konva.Vector2d, strokeColor: string, strokeWidth: number) {
    const fillProps = this.buildLiveFillProps(strokeColor);

    const dragBoundFunc = (pos: any) => {
      if (this.snapToGrid) {
        return {
          x: Math.round(pos.x / 20) * 20,
          y: Math.round(pos.y / 20) * 20,
        };
      }
      return pos;
    };

    const commonProps = {
      stroke: strokeColor,
      strokeWidth: strokeWidth,
      dash: this.strokeDash && this.strokeDash.length > 0 ? this.strokeDash : undefined,
      draggable: true,
      dragBoundFunc,
      opacity: this.opacity,
      shadowColor: this.shadowEnabled ? 'rgba(0,0,0,0.5)' : undefined,
      shadowBlur: this.shadowEnabled ? 10 : undefined,
      shadowOffset: this.shadowEnabled ? { x: 5, y: 5 } : undefined,
      shadowOpacity: this.shadowEnabled ? 0.5 : undefined,
      ...fillProps,
    };

    switch (this.currentTool) {
      case 'rect':
        this.lastLine = new Konva.Rect({
          ...commonProps,
          x: pos.x,
          y: pos.y,
          width: 0,
          height: 0,
          cornerRadius: this.cornerRadius,
        });
        break;
      case 'circle':
        this.lastLine = new Konva.Circle({ ...commonProps, x: pos.x, y: pos.y, radius: 0 });
        break;
      case 'star':
        this.lastLine = new Konva.Star({
          ...commonProps,
          x: pos.x,
          y: pos.y,
          innerRadius: 0,
          outerRadius: 0,
          numPoints: 5,
        });
        break;
      case 'arrow':
        this.lastLine = new Konva.Arrow({
          ...commonProps,
          points: [pos.x, pos.y, pos.x, pos.y],
          pointerLength: 10,
          pointerWidth: 10,
          fill: strokeColor,
        });
        break;
      case 'triangle':
      case 'pentagon':
      case 'hexagon': {
        const sides = this.currentTool === 'triangle' ? 3 : this.currentTool === 'pentagon' ? 5 : 6;
        this.lastLine = new Konva.RegularPolygon({
          ...commonProps,
          x: pos.x,
          y: pos.y,
          sides: sides,
          radius: 0,
        });
        break;
      }
      case 'diamond': {
        this.lastLine = new Konva.Line({
          ...commonProps,
          x: pos.x,
          y: pos.y,
          points: [0, 0, 0, 0, 0, 0, 0, 0],
          closed: true,
        });
        break;
      }
      case 'heart': {
        this.lastLine = new Konva.Path({
          ...commonProps,
          x: pos.x,
          y: pos.y,
          data: 'M 0,20 C -20,-20 -60,0 -60,40 C -60,80 0,120 0,120 C 0,120 60,80 60,40 C 60,0 20,-20 0,20 Z',
          offsetX: 0,
          offsetY: 50,
          scaleX: 0,
          scaleY: 0,
          strokeScaleEnabled: false,
        });
        break;
      }
      case 'straight-line':
        this.lastLine = new Konva.Line({
          ...commonProps,
          points: [pos.x, pos.y, pos.x, pos.y],
          lineCap: 'round',
          lineJoin: 'round',
        });
        break;
      case 'ellipse':
        this.lastLine = new Konva.Ellipse({
          ...commonProps,
          x: pos.x,
          y: pos.y,
          radiusX: 0,
          radiusY: 0,
        });
        break;

      case 'ring':
        this.lastLine = new Konva.Ring({
          ...commonProps,
          x: pos.x,
          y: pos.y,
          innerRadius: 0,
          outerRadius: 0,
        });
        break;
      case 'arc':
        this.lastLine = new Konva.Arc({
          ...commonProps,
          x: pos.x,
          y: pos.y,
          innerRadius: 0,
          outerRadius: 0,
          angle: 90,
        });
        break;
      case 'wedge':
        this.lastLine = new Konva.Wedge({
          ...commonProps,
          x: pos.x,
          y: pos.y,
          radius: 0,
          angle: 60,
        });
        break;
      case 'path':
        this.lastLine = new Konva.Path({
          ...commonProps,
          x: pos.x,
          y: pos.y,
          data: 'M 0 0 C 50 -50 100 50 150 0',
        });
        break;
      case 'textpath':
        this.lastLine = new Konva.TextPath({
          ...commonProps,
          x: pos.x,
          y: pos.y,
          data: 'M 0 0 C 50 -50 100 50 150 0',
          text: 'Curved Text',
          fontSize: 24,
          fill: strokeColor,
        });
        break;
      case 'label': {
        const label = new Konva.Label({ x: pos.x, y: pos.y });
        label.add(new Konva.Tag({ fill: strokeColor }));
        label.add(new Konva.Text({ text: 'Label', fontSize: 18, fill: 'white', padding: 5 }));
        this.lastLine = label;
        break;
      }
      default: {
        const brushProps = this.getBrushProps(this.currentBrushPreset);
        const isEraser = this.currentTool === 'eraser';
        this.lastLine = new Konva.Line({
          ...commonProps,
          globalCompositeOperation: isEraser ? 'destination-out' : 'source-over',
          lineCap: isEraser ? 'round' : brushProps.lineCap,
          lineJoin: isEraser ? 'round' : brushProps.lineJoin,
          tension: brushProps.tension,
          opacity: isEraser ? 1 : (brushProps.opacity ?? 1),
          shadowBlur: isEraser ? 0 : (brushProps.shadowBlur ?? 0),
          points: [pos.x, pos.y],
          listening: false,
        });
      }
    }
  }

  onMouseMove(e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) {
    if (this.collaborationEnabled) {
      const worldPos = this.getWorldPointerPosition();
      if (worldPos) {
        this.sendCursorPosition(worldPos.x, worldPos.y);
      }
    }

    if (this.isPanning) {
      const pos = this.stage.getPointerPosition();
      if (pos) {
        const dx = pos.x - this.lastPanX;
        const dy = pos.y - this.lastPanY;
        this.pan(dx, dy);
        this.lastPanX = pos.x;
        this.lastPanY = pos.y;
      }
      return;
    }

    if (!this.isDrawing || !this.lastLine) return;
    if (e.evt instanceof Event) {
      e.evt.preventDefault();
    }
    const pos = this.getWorldPointerPosition();
    if (!pos) return;

    this.updateTemporaryShape(pos);

    const timeStamp = this.getTimestamp();
    this.lastLinePointTimes.push(timeStamp);

    if (
      this.collaborationEnabled &&
      (this.currentTool === 'pen' || this.currentTool === 'eraser')
    ) {
      const lineData = (this.lastLine as Konva.Line).points();
      this.sendCanvasEvent({
        type: 'draw_line',
        tool: this.currentTool,
        globalCompositeOperation: this.currentTool === 'eraser' ? 'destination-out' : 'source-over',
        userId: this.currentUserId ?? undefined,
        username: this.currentUsername,
        points: Array.from(lineData),
        stroke: this.currentTool === 'eraser' ? '#FFFFFF' : this.color,
        strokeWidth: this.currentTool === 'eraser' ? this.thickness * 3 : this.thickness,
        tension: this.currentTool === 'pen' ? 0.3 : 0,
        role: this.userRole,
      });
    }

    const layer = this.userRole === 'mentor' ? this.mentorLayer : this.studentLayer;
    layer.batchDraw();
  }

  updateTemporaryShape(pos: Konva.Vector2d) {
    const shape = this.lastLine!;
    switch (this.currentTool) {
      case 'pen':
      case 'eraser': {
        const line = shape as Konva.Line;
        line.points([...line.points(), pos.x, pos.y]);
        break;
      }
      case 'rect': {
        const rect = shape as Konva.Rect;
        rect.width(pos.x - rect.x());
        rect.height(pos.y - rect.y());
        break;
      }
      case 'circle': {
        const circle = shape as Konva.Circle;
        circle.radius(Math.sqrt(Math.pow(pos.x - circle.x(), 2) + Math.pow(pos.y - circle.y(), 2)));
        break;
      }
      case 'star': {
        const star = shape as Konva.Star;
        const radius = Math.sqrt(Math.pow(pos.x - star.x(), 2) + Math.pow(pos.y - star.y(), 2));
        star.outerRadius(radius);
        star.innerRadius(radius / 2);
        break;
      }
      case 'arrow':
      case 'straight-line': {
        const l = shape as Konva.Line;
        const pts = l.points();
        pts[2] = pos.x;
        pts[3] = pos.y;
        l.points(pts);
        break;
      }
      case 'triangle':
      case 'pentagon':
      case 'hexagon': {
        const poly = shape as Konva.RegularPolygon;
        poly.radius(Math.sqrt(Math.pow(pos.x - poly.x(), 2) + Math.pow(pos.y - poly.y(), 2)));
        break;
      }
      case 'diamond': {
        const line = shape as Konva.Line;
        const dx = pos.x - line.x();
        const dy = pos.y - line.y();
        line.points([0, -dy, dx, 0, 0, dy, -dx, 0]);
        break;
      }
      case 'heart': {
        const path = shape as Konva.Path;
        const dx = pos.x - path.x();
        const dy = pos.y - path.y();
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        const s = dist / 60; // since SVG ranges roughly -60 to 60 (120 height)
        path.scale({ x: s, y: s });
        break;
      }
      case 'ellipse': {
        const ellipse = shape as Konva.Ellipse;
        ellipse.radiusX(Math.abs(pos.x - ellipse.x()));
        ellipse.radiusY(Math.abs(pos.y - ellipse.y()));
        break;
      }
      case 'ring':
      case 'arc': {
        const r = shape as Konva.Ring | Konva.Arc;
        const rd = Math.sqrt(Math.pow(pos.x - r.x(), 2) + Math.pow(pos.y - r.y(), 2));
        r.outerRadius(rd);
        r.innerRadius(rd / 2);
        break;
      }
      case 'wedge': {
        const w = shape as Konva.Wedge;
        const rd = Math.sqrt(Math.pow(pos.x - w.x(), 2) + Math.pow(pos.y - w.y(), 2));
        w.radius(rd);
        const ang = (Math.atan2(pos.y - w.y(), pos.x - w.x()) * 180) / Math.PI;
        w.rotation(ang);
        break;
      }
      case 'path':
      case 'textpath':
      case 'label':
        break;
    }
  }

  updateLiveText(newText: string) {
    if (this.lastLine && this.currentTool === 'text') {
      (this.lastLine as Konva.Text).text(newText);
      const layer = this.userRole === 'mentor' ? this.mentorLayer : this.studentLayer;
      layer.batchDraw();
    }
  }

  removeLiveText() {
    if (this.lastLine && this.currentTool === 'text') {
      this.lastLine.destroy();
      this.lastLine = null;
      const layer = this.userRole === 'mentor' ? this.mentorLayer : this.studentLayer;
      layer.batchDraw();
    }
  }

  onMouseUp() {
    if (this.isPanning) {
      this.endPan();
      return;
    }

    if (!this.isDrawing) return;
    this.isDrawing = false;

    if (this.lastLine) {
      const ev = this.createEventFromShape(this.lastLine as Konva.Shape);
      ev.id = this.getTimestamp().toString() + '_' + Math.random().toString(36).substr(2, 5);

      if (this.collaborationEnabled) {
        this.sendCanvasEvent({
          type: ev.type === 'line' ? 'draw_line' : 'draw_shape',
          shapeType: ev.type,
          tool: ev.tool,
          globalCompositeOperation:
            ev.globalCompositeOperation ||
            (ev.tool === 'eraser' ? 'destination-out' : 'source-over'),
          userId: this.currentUserId ?? undefined,
          username: this.currentUsername,
          points: ev.points,
          stroke: ev.stroke,
          strokeWidth: ev.strokeWidth,
          tension: ev.brushTension,
          fill: ev.stroke,
          opacity: ev.opacity,
          role: this.userRole,

          x: ev.x,
          y: ev.y,
          width: ev.width,
          height: ev.height,
          radius: ev.radius,
          radiusX: ev.radiusX,
          radiusY: ev.radiusY,
        });
      }

      this.eventCreated.emit(ev);
      this.saveState();
    }
  }

  createEventFromShape(shape: Konva.Shape | Konva.Group): CanvasEvent {
    const isBrushTool = this.currentTool === 'pen' || this.currentTool === 'eraser';
    const brushCfg = isBrushTool ? this.getBrushProps(this.currentBrushPreset) : null;
    const ev: CanvasEvent = {
      type: isBrushTool ? 'line' : this.currentTool,
      tool: this.currentTool,
      pointTimes: [...this.lastLinePointTimes],
      timestamp: this.lastLinePointTimes[0],
      stroke: shape.attrs.stroke || shape.attrs.fill,
      strokeWidth: shape.attrs.strokeWidth,
      strokeDash: this.strokeDash && this.strokeDash.length > 0 ? [...this.strokeDash] : undefined,
      fillType: this.fillType,
      fillLinearGradientColorStops:
        this.fillType === 'linear'
          ? [0, this.fillGradientColor1, 1, this.fillGradientColor2]
          : undefined,
      fillRadialGradientColorStops:
        this.fillType === 'radial'
          ? [0, this.fillGradientColor1, 1, this.fillGradientColor2]
          : undefined,
      fillGradientDirection:
        this.fillType === 'linear' || this.fillType === 'radial'
          ? this.fillGradientDirection
          : undefined,
      opacity: (shape as any).opacity ? (shape as any).opacity() : 1,
      shadowColor: (shape as any).shadowColor ? (shape as any).shadowColor() : undefined,
      shadowBlur: (shape as any).shadowBlur ? (shape as any).shadowBlur() : undefined,
      shadowOffsetX: (shape as any).shadowOffset ? (shape as any).shadowOffset()?.x : undefined,
      shadowOffsetY: (shape as any).shadowOffset ? (shape as any).shadowOffset()?.y : undefined,
      shadowOpacity: (shape as any).shadowOpacity ? (shape as any).shadowOpacity() : undefined,
      brushPreset: isBrushTool ? this.currentBrushPreset : undefined,
      brushTension: brushCfg?.tension,
      brushLineCap:
        this.currentTool === 'eraser'
          ? undefined
          : (brushCfg?.lineCap as CanvasEvent['brushLineCap']),
      brushLineJoin:
        this.currentTool === 'eraser'
          ? undefined
          : (brushCfg?.lineJoin as CanvasEvent['brushLineJoin']),
    };

    if (ev.type === 'line') {
      ev.points = [...(shape as Konva.Line).points()];
    } else {
      ev.x = shape.x();
      ev.y = shape.y();
      switch (ev.type) {
        case 'rect': {
          ev.width = (shape as Konva.Rect).width();
          ev.height = (shape as Konva.Rect).height();
          const cr = (shape as Konva.Rect).cornerRadius();
          ev.cornerRadius = Array.isArray(cr) ? cr[0] : cr;
          break;
        }
        case 'circle': {
          ev.radius = (shape as Konva.Circle).radius();
          break;
        }
        case 'star': {
          ev.innerRadius = (shape as Konva.Star).innerRadius();
          ev.outerRadius = (shape as Konva.Star).outerRadius();
          break;
        }
        case 'arrow':
        case 'straight-line': {
          ev.points = [...(shape as Konva.Line).points()];
          break;
        }
        case 'triangle':
        case 'pentagon':
        case 'hexagon': {
          ev.radius = (shape as Konva.RegularPolygon).radius();
          break;
        }
        case 'diamond': {
          ev.points = (shape as Konva.Line).points();
          break;
        }
        case 'heart': {
          ev.scale = (shape as Konva.Path).scaleX();
          break;
        }
        case 'ellipse': {
          ev.radiusX = (shape as Konva.Ellipse).radiusX();
          ev.radiusY = (shape as Konva.Ellipse).radiusY();
          break;
        }
        case 'ring':
        case 'arc': {
          const r = shape as Konva.Ring | Konva.Arc;
          ev.innerRadius = r.innerRadius();
          ev.outerRadius = r.outerRadius();
          if (ev.type === 'arc') ev.angle = (r as Konva.Arc).angle();
          break;
        }
        case 'wedge': {
          ev.radius = (shape as Konva.Wedge).radius();
          ev.angle = (shape as Konva.Wedge).angle();
          break;
        }
        case 'path': {
          ev.data = (shape as Konva.Path).data();
          break;
        }
        case 'textpath': {
          ev.data = (shape as Konva.TextPath).data();
          ev.text = (shape as Konva.TextPath).text();
          break;
        }
        case 'label': {
          ev.text = 'Label';
          break;
        }
      }
    }

    if (ev.type !== 'line' && ev.tool !== 'pen' && ev.tool !== 'eraser') {
      (shape as Konva.Node).on('dragend', (e: Konva.KonvaEventObject<DragEvent>) => {
        ev.x = e.target.x();
        ev.y = e.target.y();
      });
    }

    return ev;
  }

  getTimestamp(): number {
    if (this.isRecording) {
      if (this.isCanvasOnlyRecording && this.audioPlayerRef) {
        return this.audioPlayerRef.nativeElement.currentTime * 1000;
      }
      return Date.now() - this.recordingStartTime;
    }
    return 0;
  }

  clearMentorLayer() {
    if (this.mentorLayer) {
      this.mentorLayer.destroyChildren();
      this.renderedShapes.clear();
      this.mentorLayer.batchDraw();
      this.saveState();
    }
  }

  clearStudentLayer() {
    if (this.studentLayer) {
      this.studentLayer.destroyChildren();
      this.studentLayer.batchDraw();
      this.saveState();
    }
  }

  addNodeToLayer(node: Konva.Node, role: 'mentor' | 'student' | 'staff' | 'parent') {
    const layer = role === 'mentor' ? this.mentorLayer : this.studentLayer;
    layer.add(node as Konva.Shape | Konva.Group);
    layer.batchDraw();
  }

  addShapesToLayer(events: CanvasEvent[], role: 'mentor' | 'student' | 'staff' | 'parent') {
    const layer = role === 'mentor' ? this.mentorLayer : this.studentLayer;
    for (const ev of events) {
      const shape = this.createShapeFromEvent(ev);
      if ((ev.type === 'line' || !ev.type) && ev.points) {
        (shape as Konva.Line).points(ev.points);
      }
      layer.add(shape);
    }
    layer.batchDraw();
    this.saveState();
  }

  saveState() {
    const mentorState = [...this._mentorEvents];
    const studentState = [...this._studentEvents];

    if (this.undoStack.length > 0) {
      const last = this.undoStack[this.undoStack.length - 1];
      if (last[0].length === mentorState.length && last[1].length === studentState.length) {
        return;
      }
    }

    this.undoStack.push([mentorState, studentState]);

    if (this.undoStack.length > this.maxUndoSteps) {
      this.undoStack.shift();
    }

    this.redoStack = [];
  }

  undo() {
    if (this.undoStack.length === 0) return;

    const currentState: [CanvasEvent[], CanvasEvent[]] = [this._mentorEvents, this._studentEvents];
    this.redoStack.push(currentState);

    const previousState = this.undoStack.pop();
    if (previousState) {
      this._mentorEvents = previousState[0];
      this._studentEvents = previousState[1];
      this.refreshMentorLayer();
      this.refreshStudentLayer();
    }
  }

  redo() {
    if (this.redoStack.length === 0) return;

    const currentState: [CanvasEvent[], CanvasEvent[]] = [this._mentorEvents, this._studentEvents];
    this.undoStack.push(currentState);

    const nextState = this.redoStack.pop();
    if (nextState) {
      this._mentorEvents = nextState[0];
      this._studentEvents = nextState[1];
      this.refreshMentorLayer();
      this.refreshStudentLayer();
    }
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  deleteSelected(): boolean {
    if (!this.selectedEventId) return false;
    const shapeId = this.selectedEventId;
    const events = this.userRole === 'mentor' ? this._mentorEvents : this._studentEvents;
    const idx = events.findIndex((ev) => ev.id === shapeId);
    if (idx === -1) return false;

    events.splice(idx, 1);
    const node = this.renderedShapes.get(idx);
    if (node) {
      node.destroy();
      this.renderedShapes.delete(idx);
    }

    if (this.transformer) {
      this.transformer.nodes([]);
      this.transformerLayer.batchDraw();
    }
    this.selectedEventId = null;
    this.selectedShape = null;

    const layer = this.userRole === 'mentor' ? this.mentorLayer : this.studentLayer;
    layer.batchDraw();
    this.saveState();
    this.cdr.markForCheck();
    return true;
  }

  bringToFront() {
    if (!this.selectedEventId || !this.selectedShape) return false;
    const events = this.userRole === 'mentor' ? this._mentorEvents : this._studentEvents;
    const ev = events.find((e) => e.id === this.selectedEventId);
    if (!ev) return false;

    const maxZ = Math.max(...events.map((e) => e.zIndex ?? 0), 0);
    const newZ = maxZ + 1;
    ev.zIndex = newZ;
    this.selectedShape.setZIndex(newZ);
    this.selectedShape.getLayer()?.batchDraw();
    this.eventUpdated.emit(ev);
    return true;
  }

  sendToBack() {
    if (!this.selectedEventId || !this.selectedShape) return false;
    const events = this.userRole === 'mentor' ? this._mentorEvents : this._studentEvents;
    const ev = events.find((e) => e.id === this.selectedEventId);
    if (!ev) return false;

    const minZ = Math.min(...events.map((e) => e.zIndex ?? 0), 0);
    const newZ = minZ - 1;
    ev.zIndex = newZ;
    this.selectedShape.setZIndex(newZ);
    this.selectedShape.getLayer()?.batchDraw();
    this.eventUpdated.emit(ev);
    return true;
  }

  bringForward() {
    if (!this.selectedEventId || !this.selectedShape) return false;
    const events = this.userRole === 'mentor' ? this._mentorEvents : this._studentEvents;
    const ev = events.find((e) => e.id === this.selectedEventId);
    if (!ev) return false;

    const currentZ = ev.zIndex ?? 0;
    const newZ = currentZ + 1;
    ev.zIndex = newZ;
    this.selectedShape.setZIndex(newZ);
    this.selectedShape.getLayer()?.batchDraw();
    this.eventUpdated.emit(ev);
    return true;
  }

  sendBackward() {
    if (!this.selectedEventId || !this.selectedShape) return false;
    const events = this.userRole === 'mentor' ? this._mentorEvents : this._studentEvents;
    const ev = events.find((e) => e.id === this.selectedEventId);
    if (!ev) return false;

    const currentZ = ev.zIndex ?? 0;
    const newZ = currentZ - 1;
    ev.zIndex = newZ;
    this.selectedShape.setZIndex(newZ);
    this.selectedShape.getLayer()?.batchDraw();
    this.eventUpdated.emit(ev);
    return true;
  }

  hasSelectedShape(): boolean {
    return this.selectedEventId !== null && this.selectedShape !== null;
  }

  exportAsPNG(
    role: 'mentor' | 'student' | 'staff' | 'parent' | null = 'mentor',
    filename: string = 'canvas-export.png',
  ) {
    const layer = role === 'student' ? this.studentLayer : this.mentorLayer;
    if (!layer) return;

    const dataUrl = layer.getStage()?.toDataURL() || '';
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
  }

  exportAsPDF(
    role: 'mentor' | 'student' | 'staff' | 'parent' | null = 'mentor',
    filename: string = 'canvas-export.pdf',
    pages: number = 1,
    title?: string,
  ) {
    const layer = role === 'student' ? this.studentLayer : this.mentorLayer;
    if (!layer || !layer.getStage()) return;

    const stage = layer.getStage()!;
    const dataUrl = stage.toDataURL();

    const pdf = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 8;
    const headerHeight = 10;
    const footerHeight = 5;
    const contentHeight = pageHeight - margin * 2 - headerHeight - footerHeight;
    const contentWidth = pageWidth - margin * 2;

    const imgWidth = stage.width();
    const imgHeight = stage.height();

    if (pages <= 1) {
      const ratio = Math.min(contentWidth / imgWidth, contentHeight / imgHeight);
      const drawWidth = imgWidth * ratio;
      const drawHeight = imgHeight * ratio;
      const xOffset = margin + (contentWidth - drawWidth) / 2;
      const yOffset = margin + headerHeight + (contentHeight - drawHeight) / 2;

      pdf.setFontSize(10);
      if (title) {
        pdf.setFont('helvetica', 'bold');
        pdf.text(title, pageWidth / 2, margin + 5, { align: 'center' });
      }

      pdf.addImage(dataUrl, 'PNG', xOffset, yOffset, drawWidth, drawHeight);

      pdf.setFontSize(6);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(150, 150, 150);
      pdf.text('Generated by AsoBoard', margin, pageHeight - 4);
      pdf.text('Page 1 of 1', pageWidth - margin, pageHeight - 4, { align: 'right' });
    } else {
      const sectionHeight = imgHeight / pages;
      const ratio = Math.min(contentWidth / imgWidth, contentHeight / sectionHeight);
      const drawWidth = imgWidth * ratio;
      const drawHeight = sectionHeight * ratio;
      const xOffset = margin + (contentWidth - drawWidth) / 2;

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = imgWidth;
      tempCanvas.height = sectionHeight;
      const ctx = tempCanvas.getContext('2d')!;

      const img = new Image();
      img.src = dataUrl;

      for (let i = 0; i < pages; i++) {
        if (i > 0) pdf.addPage();

        const yStart = Math.round(i * sectionHeight);
        ctx.clearRect(0, 0, imgWidth, sectionHeight);
        ctx.drawImage(img, 0, yStart, imgWidth, sectionHeight, 0, 0, imgWidth, sectionHeight);
        const sectionDataUrl = tempCanvas.toDataURL('image/png');

        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        const headerText = title ? `${title}` : '';
        if (headerText) {
          pdf.text(headerText, pageWidth / 2, margin + 5, { align: 'center' });
        }

        const yOffset = margin + headerHeight + (contentHeight - drawHeight) / 2;
        pdf.addImage(sectionDataUrl, 'PNG', xOffset, yOffset, drawWidth, drawHeight);

        pdf.setFontSize(6);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(150, 150, 150);
        pdf.text('Generated by AsoBoard', margin, pageHeight - 4);
        pdf.text(`Page ${i + 1} of ${pages}`, pageWidth - margin, pageHeight - 4, {
          align: 'right',
        });
      }
    }

    pdf.save(filename);
  }

  exportAsJSON(
    role: 'mentor' | 'student' | 'staff' | 'parent' | null = 'mentor',
    filename: string = 'canvas-events.json',
    filters?: {
      tools?: CanvasTool[];
      startTime?: number;
      endTime?: number;
    },
  ) {
    const events = role === 'student' ? this._studentEvents : this._mentorEvents;
    if (!events || events.length === 0) {
      console.warn('No events to export');
      return;
    }

    let filteredEvents = [...events];

    if (filters?.tools && filters.tools.length > 0) {
      filteredEvents = filteredEvents.filter((e) => e.tool && filters.tools!.includes(e.tool));
    }

    if (filters?.startTime !== undefined) {
      filteredEvents = filteredEvents.filter((e) => e.timestamp >= filters.startTime!);
    }

    if (filters?.endTime !== undefined) {
      filteredEvents = filteredEvents.filter((e) => e.timestamp <= filters.endTime!);
    }

    filteredEvents.sort((a, b) => a.timestamp - b.timestamp);

    const exportData = {
      exportMetadata: {
        exportedAt: new Date().toISOString(),
        exportTool: 'AsoBoard',
        role: role,
        totalEvents: filteredEvents.length,
        filters: filters || null,
        canvasDimensions: {
          width: this.stage?.width() || 0,
          height: this.stage?.height() || 0,
        },
        timeRange: {
          start: filteredEvents.length > 0 ? filteredEvents[0].timestamp : null,
          end:
            filteredEvents.length > 0 ? filteredEvents[filteredEvents.length - 1].timestamp : null,
        },
      },
      events: filteredEvents,
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.download = filename;
    link.href = url;
    link.click();

    URL.revokeObjectURL(url);
  }

  getCanvasStateJSON(): string {
    return JSON.stringify({
      mentorEvents: this._mentorEvents,
      studentEvents: this._studentEvents,
    });
  }

  applyCanvasStateJSON(stateStr: string) {
    try {
      const state = JSON.parse(stateStr);
      if (state.mentorEvents) {
        this._mentorEvents = state.mentorEvents;
      }
      if (state.studentEvents) {
        this._studentEvents = state.studentEvents;
      }

      this.refreshMentorLayer();
      this.refreshStudentLayer();
      this.saveState();
    } catch (e) {
      console.error('Error applying canvas state', e);
    }
  }
}
