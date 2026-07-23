import { Component, OnInit, ChangeDetectorRef, inject, viewChild, OnDestroy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Api } from '../../services/api';
import { NotificationService } from '../../services/notification.service';
import { KeyboardShortcutsService } from '../../services/keyboard-shortcuts.service';
import { AchievementService } from '../../services/achievement.service';
import {
  StudentDiary,
  User,
  CanvasEvent,
  CanvasTool,
  Asset,
  DiaryComment,
  BrushPreset,
} from '../../models/types';
import { CanvasComponent } from '../shared/canvas/canvas';
import { ToolbarComponent } from '../shared/toolbar/toolbar';
import { KeyboardShortcutsHelpComponent } from '../shared/keyboard-shortcuts-help/keyboard-shortcuts-help';

@Component({
  selector: 'app-diary-detail',
  standalone: true,
  imports: [
    CanvasComponent,
    ToolbarComponent,
    KeyboardShortcutsHelpComponent,
    FormsModule,
    RouterLink,
  ],
  templateUrl: './diary-detail.html',
})
export class DiaryDetail implements OnInit, OnDestroy {
  canvas = viewChild(CanvasComponent);
  diary: StudentDiary | null = null;
  currentUser: User | null = null;
  isLoading = true;
  isSaving = false;

  currentTool: CanvasTool = 'pen';
  currentColor = '#1982C4';
  currentThickness = 8;
  currentFontSize = 24;
  currentFontFamily = 'Arial';
  currentStrokeDash: number[] = [];
  currentFillType: 'solid' | 'linear' | 'radial' | 'none' = 'solid';
  currentFillGradientColor1 = '#1982C4';
  currentFillGradientColor2 = '#FF66C4';
  currentFillGradientDirection: 'to-right' | 'to-bottom' | 'to-bottom-right' | 'to-top-right' =
    'to-right';
  currentBrushPreset: BrushPreset = 'round';
  currentCornerRadius = 0;

  currentOpacity = 1;
  snapToGrid = false;
  shadowEnabled = false;

  diaryEvents: CanvasEvent[] = [];
  pendingAssetToApply: Asset | null = null;
  canvasZoom = 1;

  private apiService = inject(Api);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private notificationService = inject(NotificationService);
  private shortcutsService = inject(KeyboardShortcutsService);
  private achievementService = inject(AchievementService);
  private hasCheckedAchievements = false;

  comments: DiaryComment[] = [];
  newCommentContent = '';
  isSubmittingComment = false;
  showComments = false;

  ngOnInit() {
    this.apiService.checkAuthStatus().subscribe({
      next: (user: User) => {
        this.currentUser = user;
        this.loadDiary();
      },
    });
    this.registerShortcuts();
  }

  ngOnDestroy() {
    this.shortcutsService.deactivate();
    this.shortcutsService.clear();
  }

  private registerShortcuts() {
    this.shortcutsService.register([
      {
        key: 'z',
        ctrl: true,
        shift: true,
        description: 'Redo',
        category: 'canvas',
        action: () => this.canvas()?.redo(),
      },
      {
        key: 'y',
        ctrl: true,
        description: 'Redo',
        category: 'canvas',
        action: () => this.canvas()?.redo(),
      },
      {
        key: 'z',
        ctrl: true,
        description: 'Undo',
        category: 'canvas',
        action: () => this.canvas()?.undo(),
      },
      {
        key: 's',
        ctrl: true,
        description: 'Save',
        category: 'canvas',
        action: () => this.saveDiary(),
      },
      {
        key: 'Delete',
        description: 'Delete selected',
        category: 'canvas',
        action: () => this.canvas()?.deleteSelected(),
      },
      {
        key: 'Backspace',
        description: 'Delete selected',
        category: 'canvas',
        action: () => this.canvas()?.deleteSelected(),
      },
      {
        key: 'Escape',
        description: 'Deselect',
        category: 'canvas',
        action: () => this.canvas()?.deselectImage(),
      },
      { key: 'b', description: 'Pen', category: 'tools', action: () => this.setTool('pen') },
      { key: 'e', description: 'Eraser', category: 'tools', action: () => this.setTool('eraser') },
      { key: 't', description: 'Text', category: 'tools', action: () => this.setTool('text') },
      { key: 'r', description: 'Rectangle', category: 'tools', action: () => this.setTool('rect') },
      { key: 'c', description: 'Circle', category: 'tools', action: () => this.setTool('circle') },
      { key: 's', description: 'Star', category: 'tools', action: () => this.setTool('star') },
      {
        key: 'l',
        description: 'Line',
        category: 'tools',
        action: () => this.setTool('straight-line'),
      },
      { key: 'a', description: 'Arrow', category: 'tools', action: () => this.setTool('arrow') },
      { key: 'h', description: 'Hand', category: 'tools', action: () => this.setTool('hand') },
      { key: 'p', description: 'Path', category: 'tools', action: () => this.setTool('path') },
      {
        key: ']',
        description: 'Increase brush size',
        category: 'view',
        action: () => this.changeThickness(2),
      },
      {
        key: '[',
        description: 'Decrease brush size',
        category: 'view',
        action: () => this.changeThickness(-2),
      },
      { key: '=', description: 'Zoom in', category: 'view', action: () => this.onZoomIn() },
      { key: '-', description: 'Zoom out', category: 'view', action: () => this.onZoomOut() },
      { key: '0', description: 'Reset view', category: 'view', action: () => this.onResetView() },
      {
        key: ']',
        ctrl: true,
        shift: true,
        description: 'Bring to front',
        category: 'canvas',
        action: () => this.canvas()?.bringToFront(),
      },
      {
        key: '[',
        ctrl: true,
        shift: true,
        description: 'Send to back',
        category: 'canvas',
        action: () => this.canvas()?.sendToBack(),
      },
      {
        key: ']',
        ctrl: true,
        description: 'Bring forward',
        category: 'canvas',
        action: () => this.canvas()?.bringForward(),
      },
      {
        key: '[',
        ctrl: true,
        description: 'Send backward',
        category: 'canvas',
        action: () => this.canvas()?.sendBackward(),
      },
    ]);
    this.shortcutsService.activate();
  }

  private setTool(tool: CanvasTool) {
    this.currentTool = tool;
    this.cdr.markForCheck();
  }

  private changeThickness(delta: number) {
    this.currentThickness = Math.max(1, Math.min(50, this.currentThickness + delta));
    this.cdr.markForCheck();
  }

  loadDiary() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.apiService.getStudentDiary(id).subscribe({
      next: (data) => {
        this.diary = data;
        this.diaryEvents = this.diary?.canvas_events || [];
        this.isLoading = false;
        this.cdr.detectChanges();
        this.loadComments();
      },
      error: () => {
        this.notificationService.error('Diary drawing not found.');
        this.router.navigate(['/diaries']);
      },
    });
  }

  loadComments() {
    if (!this.diary) return;
    this.apiService.getDiaryComments(this.diary.id).subscribe({
      next: (data) => {
        const parsedData = typeof data === 'string' ? JSON.parse(data as string) : data;
        this.comments = Array.isArray(parsedData)
          ? parsedData
          : (parsedData as { results?: DiaryComment[] }).results || [];
        this.cdr.detectChanges();
      },
    });
  }

  addComment() {
    if (!this.diary || !this.newCommentContent.trim()) return;
    this.isSubmittingComment = true;
    this.apiService.addDiaryComment(this.diary.id, this.newCommentContent.trim()).subscribe({
      next: (comment) => {
        this.comments = [...this.comments, comment];
        this.newCommentContent = '';
        this.isSubmittingComment = false;
        this.notificationService.success('Comment added!');
        this.cdr.detectChanges();
      },
      error: () => {
        this.isSubmittingComment = false;
        this.notificationService.error('Failed to add comment.');
        this.cdr.detectChanges();
      },
    });
  }

  deleteComment(commentId: number) {
    this.apiService.deleteDiaryComment(commentId).subscribe({
      next: () => {
        this.comments = this.comments.filter((c) => c.id !== commentId);
        this.notificationService.success('Comment removed.');
        this.cdr.detectChanges();
      },
      error: () => {
        this.notificationService.error('Failed to delete comment.');
        this.cdr.detectChanges();
      },
    });
  }

  toggleComments() {
    this.showComments = !this.showComments;
  }

  canDeleteComment(commentAuthorId: number): boolean {
    return this.currentUser?.id === commentAuthorId || this.currentUser?.id === this.diary?.student;
  }

  onEventCreated(ev: CanvasEvent) {
    this.diaryEvents = [...this.diaryEvents, ev];
    this.saveDiary();
  }

  onEventUpdated(ev: CanvasEvent) {
    this.diaryEvents = this.diaryEvents.map((e) => (e.id === ev.id ? ev : e));
    this.saveDiary();
  }

  onTargetSelected(eventId: string) {
    if (!this.pendingAssetToApply) return;

    if (eventId.startsWith('PLACE_AT_') && this.pendingAssetToApply.asset_type === 'image') {
      const parts = eventId.split('_');
      const x = parseFloat(parts[2]);
      const y = parseFloat(parts[3]);

      const timeStamp = this.canvas()?.getTimestamp() ?? Date.now();
      const ev: CanvasEvent = {
        type: 'image',
        tool: 'image' as CanvasTool,
        id: timeStamp.toString() + '_' + Math.random().toString(36).substr(2, 5),
        x,
        y,
        assetId: this.pendingAssetToApply.id,
        assetUrl: this.pendingAssetToApply.file ?? undefined,
        animationConfig: this.pendingAssetToApply.animation_config,
        scale: this.pendingAssetToApply.scale || 1,
        timestamp: timeStamp,
        pointTimes: [timeStamp],
      };

      this.diaryEvents = [...this.diaryEvents, ev];
      this.canvas()?.addShapesToLayer([ev], 'student');
      this.notificationService.success(`${this.pendingAssetToApply.title} placed!`);
      this.pendingAssetToApply = null;
      this.currentTool = 'pen';
      this.saveDiary();
      this.cdr.detectChanges();
      return;
    }

    this.diaryEvents = this.diaryEvents.map((ev) => {
      if (ev.id === eventId) {
        if (this.pendingAssetToApply?.asset_type === 'audio') {
          ev.audioAssetUrl = this.pendingAssetToApply.file ?? undefined;
        } else if (this.pendingAssetToApply?.asset_type === 'animation') {
          const type = this.pendingAssetToApply.title.toLowerCase().includes('rotate')
            ? 'rotate'
            : 'bounce';
          ev.animationType = type;
          ev.animationConfig = this.pendingAssetToApply.animation_config;
        }
      }
      return ev;
    });

    this.canvas()?.refreshStudentLayer();
    this.notificationService.show(`${this.pendingAssetToApply.title} applied!`, 'success');
    this.pendingAssetToApply = null;
    this.currentTool = 'pen';
    this.saveDiary();
    this.cdr.detectChanges();
  }

  onAssetSelected(asset: Asset) {
    if (!this.diary) return;
    this.pendingAssetToApply = asset;
    const msg =
      asset.asset_type === 'image'
        ? `Sticker ${asset.title} ready! Click canvas to place it.`
        : `${asset.title} selected! Click a shape or sticker to apply it.`;
    this.notificationService.show(msg, 'info');
    this.cdr.detectChanges();
  }

  saveDiary() {
    if (!this.diary) return;
    this.isSaving = true;
    this.apiService
      .updateStudentDiary(this.diary.id, {
        canvas_events: this.diaryEvents,
      })
      .subscribe({
        next: () => {
          this.isSaving = false;
          this.cdr.detectChanges();

          if (!this.hasCheckedAchievements) {
            this.hasCheckedAchievements = true;
            this.achievementService.checkAndAward().subscribe({
              next: (response) => {
                if (response.new_achievements.length > 0) {
                  console.log('New achievements unlocked!', response.new_achievements);
                }
              },
              error: (err) => {
                console.error('Failed to check achievements:', err);
              },
            });
          }
        },
        error: () => {
          this.isSaving = false;
          this.cdr.detectChanges();
        },
      });
  }

  clearBoard() {
    if (confirm('Clear your magical drawing?')) {
      const clearEvent: CanvasEvent = {
        type: 'clear',
        timestamp: Date.now(),
      };
      this.diaryEvents = [...this.diaryEvents, clearEvent];
      this.canvas()?.clearStudentLayer();
      this.saveDiary();
      this.notificationService.success('Fresh canvas ready!');
    }
  }

  onTextInputRequested(data: { x: number; y: number; color: string }) {
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);

    Object.assign(textarea.style, {
      position: 'fixed',
      top: `${data.y}px`,
      left: `${data.x}px`,
      width: '300px',
      height: '60px',
      fontSize: `${this.currentFontSize}px`,
      fontFamily: this.currentFontFamily,
      color: 'transparent',
      caretColor: data.color,
      background: 'transparent',
      border: '2px dashed #cbd5e1',
      borderRadius: '8px',
      padding: '0',
      outline: 'none',
      resize: 'none',
      zIndex: '99999',
    });

    textarea.oninput = () => this.canvas()?.updateLiveText(textarea.value);
    textarea.onblur = () => {
      const text = textarea.value.trim();
      if (textarea.parentNode) document.body.removeChild(textarea);
      this.canvas()?.removeLiveText();
      if (text) {
        const timeStamp = Date.now();
        const ev: CanvasEvent = {
          type: 'text',
          tool: 'text' as CanvasTool,
          x: data.x,
          y: data.y,
          text,
          fontSize: this.currentFontSize,
          fontFamily: this.currentFontFamily,
          stroke: data.color,
          timestamp: timeStamp,
          pointTimes: [timeStamp, timeStamp],
        };
        this.onEventCreated(ev);
        this.canvas()?.addShapesToLayer([ev], 'student');
      }
    };
    setTimeout(() => textarea.focus(), 10);
  }

  onZoomChanged(zoom: number) {
    this.canvasZoom = zoom;
    this.cdr.markForCheck();
  }

  onZoomIn() {
    this.canvas()?.zoomIn();
  }

  onZoomOut() {
    this.canvas()?.zoomOut();
  }

  onResetView() {
    this.canvas()?.resetView();
  }

  exportCanvas() {
    const timestamp = new Date().toISOString().slice(0, 10);
    const title = this.diary?.title || 'sketch';
    const filename = `asoboard-diary-${title}-${timestamp}.png`;
    this.canvas()?.exportAsPNG('student', filename);
  }
}
