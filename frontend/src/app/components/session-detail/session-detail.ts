import { TranslatePipe } from '@ngx-translate/core';
import {
  Component,
  OnInit,
  AfterViewInit,
  viewChild,
  ChangeDetectorRef,
  OnDestroy,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Api } from '../../services/api';
import {
  Session,
  User,
  StudentSessionState,
  CanvasEvent,
  CanvasTool,
  Asset,
  BrushPreset,
} from '../../models/types';
import { NotificationService } from '../../services/notification.service';
import { KeyboardShortcutsService } from '../../services/keyboard-shortcuts.service';
import { CanvasCollaborationService } from '../../services/canvas/canvas-collaboration.service';
import { WebRtcService } from '../../services/webrtc/webrtc.service';
import { ModalComponent } from '../shared/modal/modal';
import { CanvasComponent } from '../shared/canvas/canvas';
import { ToolbarComponent } from '../shared/toolbar/toolbar';
import { PlaybackControlsComponent } from '../shared/playback-controls/playback-controls';
import { GameContainerComponent } from '../shared/game-container/game-container';
import { KeyboardShortcutsHelpComponent } from '../shared/keyboard-shortcuts-help/keyboard-shortcuts-help';
import { SessionChatComponent } from '../shared/session-chat/session-chat';
import { HandRaiseComponent } from '../shared/hand-raise/hand-raise';
import { UserPresenceComponent } from '../shared/user-presence/user-presence';
import { MentorBroadcastComponent } from '../shared/mentor-broadcast/mentor-broadcast';
import { WebRtcAudioComponent } from '../shared/webrtc-audio/webrtc-audio';

@Component({
  selector: 'app-session-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ModalComponent,
    CanvasComponent,
    ToolbarComponent,
    PlaybackControlsComponent,
    GameContainerComponent,
    KeyboardShortcutsHelpComponent,
    SessionChatComponent,
    HandRaiseComponent,
    UserPresenceComponent,
    MentorBroadcastComponent,
    WebRtcAudioComponent,
    TranslatePipe,
  ],
  templateUrl: './session-detail.html',
  styleUrl: './session-detail.css',
})
export class SessionDetail implements OnInit, AfterViewInit, OnDestroy {
  canvas = viewChild(CanvasComponent);
  playbackControls = viewChild(PlaybackControlsComponent);

  session: Session | null = null;
  currentUser: User | null = null;
  isLoading = true;
  error = '';

  get zoomPercent(): number {
    return Math.round(this.canvasZoom * 100);
  }

  mentorEvents: CanvasEvent[] = [];
  studentEvents: CanvasEvent[] = [];

  isPlaying = false;
  isDrawingMode = false;
  isSaving = false;
  globalStudentCanDraw = true;
  studentPermissions = new Map<number, boolean>();
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

  currentTime = 0;
  duration = 0;
  canvasZoom = 1;
  collaborationEnabled = true;

  showDeleteSessionConfirm = false;
  showClearCanvasConfirm = false;
  clearType: 'mentor' | 'student' | 'staff' | 'parent' | null = null;

  pendingAssetToApply: Asset | null = null;

  isMentorRecording = false;
  isCanvasOnlyRecording = false;
  mediaRecorder: InstanceType<typeof MediaRecorder> | null = null;
  audioChunks: BlobPart[] = [];
  recordingStartTime = 0;

  private recordingAudioContext?: AudioContext;
  private recordingDestination?: MediaStreamAudioDestinationNode;
  private remoteStreamNodes: Map<number, MediaStreamAudioSourceNode> = new Map();

  private apiService = inject(Api);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  public cdr = inject(ChangeDetectorRef);
  private notificationService = inject(NotificationService);
  private shortcutsService = inject(KeyboardShortcutsService);
  private collabService = inject(CanvasCollaborationService);
  public webrtcService = inject(WebRtcService);

  public remoteStreams: { userId: number; stream: MediaStream }[] = [];
  private initiatedWebRtcUsers = new Set<number>();

  ngOnInit() {
    this.apiService.checkAuthStatus().subscribe({
      next: (user: User) => {
        this.currentUser = user;
        this.cdr.detectChanges();
        this.loadSessionData();
      },
      error: () => {
        this.currentUser = null;
        this.cdr.detectChanges();
        this.loadSessionData();
      },
    });

    this.webrtcService.remoteAudioStreams$.subscribe((data) => {
      const existing = this.remoteStreams.find((s) => s.userId === data.userId);
      if (existing) {
        existing.stream = data.stream;
      } else {
        this.remoteStreams.push(data);
      }

      // If currently recording, dynamically add the stream to the mix
      if (
        this.isMentorRecording &&
        !this.isCanvasOnlyRecording &&
        this.recordingAudioContext &&
        this.recordingDestination
      ) {
        if (this.remoteStreamNodes.has(data.userId)) {
          this.remoteStreamNodes.get(data.userId)!.disconnect();
        }
        const newSource = this.recordingAudioContext.createMediaStreamSource(data.stream);
        newSource.connect(this.recordingDestination);
        this.remoteStreamNodes.set(data.userId, newSource);
      }

      this.cdr.detectChanges();
    });

    this.collabService.userJoined$.subscribe((joinedUserId) => {
      if (this.currentUser?.role === 'mentor') {
        const state = this.canvas()?.getCanvasStateJSON();
        if (state) {
          this.collabService.sendMentorBroadcast('', state, joinedUserId);
        }
      }
    });

    this.collabService.getMentorBroadcasts().subscribe((broadcast) => {
      if (
        broadcast.canvasState &&
        (!broadcast.targetUserId || broadcast.targetUserId === this.currentUser?.id)
      ) {
        this.canvas()?.applyCanvasStateJSON(broadcast.canvasState);
      }
    });
  }

  ngAfterViewInit() {
    this.cdr.detectChanges();
    this.registerShortcuts();
  }

  loadSessionData() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.apiService.getSession(id).subscribe({
      next: (data: Session | { data?: Session }) => {
        let sessionData: Session | undefined;
        if ('canvas_events' in data) {
          sessionData = data;
        } else {
          sessionData = (data as { data?: Session }).data;
        }

        if (!sessionData) {
          throw new Error('Session data unavailable');
        }

        this.session = sessionData;
        this.mentorEvents = sessionData.canvas_events || [];

        this.collaborationEnabled = this.session.session_type === 'live';

        if (this.collaborationEnabled) {
          this.connectCollaboration();
        }

        if (this.currentUser?.role === 'student' && this.session) {
          this.apiService.getStudentSessionState(this.session.id).subscribe({
            next: (state: StudentSessionState) => {
              this.studentEvents = state.canvas_events || [];
              this.isLoading = false;
              this.initializeAfterLoading();
              this.cdr.detectChanges();
            },
            error: () => {
              this.isLoading = false;
              this.initializeAfterLoading();
              this.cdr.detectChanges();
            },
          });
        } else {
          this.isLoading = false;
          this.initializeAfterLoading();
          this.cdr.detectChanges();
        }
      },
      error: () => {
        this.error = 'Session not found.';
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  initializeAfterLoading() {
    if (this.session?.mode === 'game') {
      this.isDrawingMode = false;
      return;
    }

    if (this.currentUser?.role === 'mentor') {
      this.isDrawingMode = true;
    } else if (!this.session?.audio_file && this.currentUser?.role === 'student') {
      this.isDrawingMode = true;
    }
  }

  private connectCollaboration() {
    if (!this.currentUser?.id || !this.session?.id) return;
    if (this.collabService['sessionId'] === this.session.id) return;

    const userColor = this.getUserColor(this.currentUser.id);
    this.collabService.connect(this.session.id, {
      id: this.currentUser.id,
      username: this.currentUser.username,
      color: userColor,
    });

    // As soon as users join, initiate WebRTC to them
    this.collabService.getUserPresence().subscribe((users) => {
      users.forEach((u) => {
        if (
          u.userId !== this.currentUser?.id &&
          u.isOnline &&
          !this.initiatedWebRtcUsers.has(u.userId)
        ) {
          this.initiatedWebRtcUsers.add(u.userId);
          if (this.currentUser!.id > u.userId) {
            this.webrtcService.initiateCall(u.userId);
          }
        }
      });
    });

    this.collabService.getPermissionUpdates().subscribe((update) => {
      const { canDraw, targetUserId } = update;

      if (targetUserId) {
        this.studentPermissions.set(targetUserId, canDraw);
        if (this.currentUser?.role === 'student' && this.currentUser.id === targetUserId) {
          if (canDraw) {
            this.notificationService.show('Mentor unlocked your canvas. You can draw now.', 'info');
          } else {
            this.notificationService.warning('Mentor locked your canvas. You can only view.');
          }
        }
      } else {
        this.globalStudentCanDraw = canDraw;
        this.studentPermissions.clear();
        if (this.currentUser?.role === 'student') {
          if (canDraw) {
            this.notificationService.show('Mentor unlocked the canvas. You can draw now.', 'info');
          } else {
            this.notificationService.warning('Mentor locked the canvas. You can only view.');
          }
        }
      }
    });
  }

  private getUserColor(userId: number): string {
    const colors = [
      '#0ea5e9',
      '#10b981',
      '#f59e0b',
      '#f43f5e',
      '#ec4899',
      '#06b6d4',
      '#14b8a6',
      '#f97316',
    ];
    return colors[userId % colors.length];
  }

  ngOnDestroy() {
    this.shortcutsService.deactivate();
    this.shortcutsService.clear();
    this.collabService.disconnect();
    this.webrtcService.cleanup();
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      this.mediaRecorder.stream.getTracks().forEach((track) => track.stop());
    }
    if (this.recordingAudioContext) {
      this.recordingAudioContext.close();
      this.recordingAudioContext = undefined;
      this.recordingDestination = undefined;
      this.remoteStreamNodes.clear();
    }
  }

  private registerShortcuts() {
    this.shortcutsService.register([
      {
        key: 'z',
        ctrl: true,
        shift: true,
        description: 'Redo',
        category: 'canvas',
        action: () => this.redoCanvas(),
      },
      {
        key: 'y',
        ctrl: true,
        description: 'Redo',
        category: 'canvas',
        action: () => this.redoCanvas(),
      },
      {
        key: 'z',
        ctrl: true,
        description: 'Undo',
        category: 'canvas',
        action: () => this.undoCanvas(),
      },
      {
        key: 's',
        ctrl: true,
        description: 'Save',
        category: 'canvas',
        action: () => this.saveMyWork(),
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
        action: () => this.canvas()?.deselectAll(),
      },
      {
        key: ']',
        ctrl: true,
        shift: true,
        description: 'Bring to Front',
        category: 'canvas',
        action: () => this.canvas()?.bringToFront(),
      },
      {
        key: '[',
        ctrl: true,
        shift: true,
        description: 'Send to Back',
        category: 'canvas',
        action: () => this.canvas()?.sendToBack(),
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

  getAudioUrl(): string {
    if (!this.session?.audio_file) return '';
    if (this.session.audio_file.startsWith('http')) return this.session.audio_file;
    return this.apiService.getMediaUrl(this.session.audio_file);
  }

  onEventCreated(ev: CanvasEvent) {
    if (this.currentUser?.role === 'mentor') {
      this.mentorEvents = [...this.mentorEvents, ev];
    } else if (this.currentUser?.role === 'student' || this.currentUser?.role === 'parent') {
      this.studentEvents = [...this.studentEvents, ev];
      if (this.session?.mode === 'game') {
        this.saveMyWork();
      }
    }
  }

  onGameConfigUpdated(config: Record<string, unknown>) {
    if (this.session) {
      this.session.game_config = config;
      this.cdr.detectChanges();
    }
  }

  onEventUpdated(ev: CanvasEvent) {
    const arr = this.currentUser?.role === 'mentor' ? this.mentorEvents : this.studentEvents;
    const idx = arr.findIndex((e) => e.id === ev.id);
    if (idx !== -1) {
      arr[idx] = ev;
    }
  }

  onTargetSelected(eventId: string) {
    if (!this.pendingAssetToApply) return;

    if (eventId.startsWith('PLACE_AT_') && this.pendingAssetToApply.asset_type === 'image') {
      const parts = eventId.split('_');
      const x = parseFloat(parts[2]);
      const y = parseFloat(parts[3]);

      const timeStamp = this.canvas()?.getTimestamp() ?? Date.now();
      const evType = this.currentTool === 'sprite' ? 'sprite' : 'image';
      const ev: CanvasEvent = {
        type: evType,
        tool: evType as CanvasTool,
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

      const role = this.currentUser?.role;
      if (role === 'mentor') {
        this.mentorEvents = [...this.mentorEvents, ev];
      } else {
        this.studentEvents = [...this.studentEvents, ev];
      }

      this.notificationService.success(`${this.pendingAssetToApply.title} placed!`);
      this.pendingAssetToApply = null;
      this.currentTool = 'pen';
      this.cdr.detectChanges();
      return;
    }

    const updateEvent = (events: CanvasEvent[]) => {
      return events.map((ev) => {
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
    };

    if (this.currentUser?.role === 'mentor') {
      this.mentorEvents = updateEvent(this.mentorEvents);
      this.canvas()?.refreshMentorLayer();
    } else {
      this.studentEvents = updateEvent(this.studentEvents);
      this.canvas()?.refreshStudentLayer();
    }

    this.notificationService.success(`${this.pendingAssetToApply.title} applied!`);
    this.pendingAssetToApply = null;
    this.currentTool = 'pen';
    this.cdr.detectChanges();
  }

  onTextInputRequested(data: { x: number; y: number; color: string; startTimestamp?: number }) {
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

    textarea.oninput = () => {
      this.canvas()?.updateLiveText(textarea.value);
    };

    textarea.addEventListener('mousedown', (e) => e.stopPropagation());
    textarea.addEventListener('touchstart', (e) => e.stopPropagation());

    setTimeout(() => {
      textarea.focus();
      textarea.onblur = () => {
        const text = textarea.value.trim();
        if (textarea.parentNode) {
          document.body.removeChild(textarea);
        }
        this.canvas()?.removeLiveText();
        if (text) {
          const timeStamp = this.canvas()?.getTimestamp() ?? Date.now();
          const startTimestamp = data.startTimestamp ?? timeStamp;
          const ev: CanvasEvent = {
            type: 'text',
            tool: 'text' as CanvasTool,
            x: data.x,
            y: data.y,
            text,
            fontSize: this.currentFontSize,
            fontFamily: this.currentFontFamily,
            stroke: data.color,
            timestamp: startTimestamp,
            pointTimes: [startTimestamp, timeStamp],
          };
          this.onEventCreated(ev);
          this.canvas()?.addShapesToLayer(
            [ev],
            this.currentUser?.role === 'mentor' ? 'mentor' : 'student',
          );
        }
      };
    }, 10);
  }

  onPlay() {
    this.isPlaying = true;
    if (!this.isMentorRecording) this.isDrawingMode = false;
    this.cdr.detectChanges();
  }

  onPause() {
    this.isPlaying = false;
    if (!this.isMentorRecording) this.isDrawingMode = true;
    this.cdr.detectChanges();
  }

  async startRecording() {
    try {
      const localStream = await navigator.mediaDevices.getUserMedia({ audio: true });

      this.recordingAudioContext = new AudioContext();
      this.recordingDestination = this.recordingAudioContext.createMediaStreamDestination();

      const localSource = this.recordingAudioContext.createMediaStreamSource(localStream);
      localSource.connect(this.recordingDestination);

      this.remoteStreams.forEach((remote) => {
        const remoteSource = this.recordingAudioContext!.createMediaStreamSource(remote.stream);
        remoteSource.connect(this.recordingDestination!);
        this.remoteStreamNodes.set(remote.userId, remoteSource);
      });

      this.mediaRecorder = new MediaRecorder(this.recordingDestination.stream, {
        mimeType: 'audio/webm',
      });
      this.audioChunks = [];
      this.mentorEvents = [];
      this.recordingStartTime = Date.now();

      if (this.mediaRecorder) {
        this.mediaRecorder.ondataavailable = (e: BlobEvent) => {
          if (e.data.size > 0) this.audioChunks.push(e.data);
        };
        this.mediaRecorder.onstop = () => this.saveRecording();

        this.mediaRecorder.start();
      }
      this.isMentorRecording = true;
      this.isCanvasOnlyRecording = false;
      this.isDrawingMode = true;
      this.canvas()?.clearMentorLayer();
      this.cdr.detectChanges();
    } catch {
      this.notificationService.error('Microphone access denied.');
    }
  }

  async startCanvasOnlyRecording() {
    this.isMentorRecording = true;
    this.isCanvasOnlyRecording = true;
    this.mentorEvents = [];
    this.isDrawingMode = true;
    this.canvas()?.clearMentorLayer();

    if (this.playbackControls()?.audioPlayer?.nativeElement) {
      this.playbackControls()!.audioPlayer!.nativeElement.currentTime = 0;
      this.playbackControls()!.audioPlayer!.nativeElement.play();
    }
    this.cdr.detectChanges();
  }

  stopRecording() {
    if (this.isCanvasOnlyRecording) {
      if (this.playbackControls()?.nativeElement) {
        this.playbackControls()!.nativeElement.pause();
      }
      this.isMentorRecording = false;
      this.isCanvasOnlyRecording = false;
      this.isDrawingMode = false;
      this.saveCanvasOnlyRecording();
    } else if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      this.mediaRecorder.stream.getTracks().forEach((track) => track.stop());
      this.isMentorRecording = false;
      this.isDrawingMode = false;
      if (this.recordingAudioContext) {
        this.recordingAudioContext.close();
        this.recordingAudioContext = undefined;
        this.recordingDestination = undefined;
        this.remoteStreamNodes.clear();
      }
    }
    this.cdr.detectChanges();
  }

  saveRecording() {
    this.isSaving = true;
    const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
    if (this.session) {
      this.apiService
        .uploadSessionRecording(this.session.id, audioBlob, this.mentorEvents)
        .subscribe({
          next: (updated) => {
            this.notificationService.success('Magic session published! 🪄');
            this.session = updated;
            window.location.reload();
          },
          error: () => (this.isSaving = false),
        });
    }
  }

  saveCanvasOnlyRecording() {
    this.isSaving = true;
    if (this.session) {
      this.apiService.uploadSessionRecording(this.session.id, null, this.mentorEvents).subscribe({
        next: (updated) => {
          this.notificationService.success('Magic canvas published!');
          this.session = updated;
          window.location.reload();
        },
        error: () => (this.isSaving = false),
      });
    }
  }

  async toggleMic() {
    await this.webrtcService.toggleMute();
  }

  onAssetSelected(asset: Asset) {
    if (!this.currentUser) return;
    this.pendingAssetToApply = asset;
    const msg =
      asset.asset_type === 'image'
        ? `Sticker ${asset.title} ready! Click canvas to place it.`
        : `${asset.title} selected! Click a shape or sticker to apply it.`;
    this.notificationService.show(msg, 'info');
    this.cdr.detectChanges();
  }

  saveMyWork() {
    if (!this.session) return;
    this.isSaving = true;
    this.apiService.saveStudentSessionState(this.session.id, this.studentEvents).subscribe({
      next: () => {
        this.isSaving = false;
        this.notificationService.success('Your magic work is saved!');
      },
      error: () => (this.isSaving = false),
    });
  }

  clearBoard() {
    const role = this.currentUser?.role;
    if (role === 'mentor' || role === 'student') {
      this.clearType = role;
    }
    this.showClearCanvasConfirm = true;
  }

  confirmClearBoard() {
    const timeStamp = this.canvas()?.getTimestamp() ?? Date.now();
    const clearEvent: CanvasEvent = {
      type: 'clear',
      timestamp: timeStamp,
    };

    if (this.clearType === 'mentor') {
      this.mentorEvents = [...this.mentorEvents, clearEvent];
      this.canvas()?.clearMentorLayer();

      // Mentor clears the whole board including student layer
      if (this.collaborationEnabled) {
        this.studentEvents = [...this.studentEvents, clearEvent];
        this.canvas()?.clearStudentLayer();
      }
    } else {
      this.studentEvents = [...this.studentEvents, clearEvent];
      this.canvas()?.clearStudentLayer();
    }

    if (this.collaborationEnabled) {
      this.collabService.sendCanvasEvent({
        type: 'clear',
        role: this.clearType,
      });
      // Tell everyone to clear the student layer too if mentor cleared
      if (this.clearType === 'mentor') {
        this.collabService.sendCanvasEvent({
          type: 'clear',
          role: 'student',
        });
      }
    }

    this.showClearCanvasConfirm = false;
    this.notificationService.success('Canvas cleared!');
  }

  deleteSession() {
    this.showDeleteSessionConfirm = true;
  }

  onTogglePermission(canDraw: boolean) {
    this.globalStudentCanDraw = canDraw;
    this.studentPermissions.clear();
    if (this.collaborationEnabled) {
      this.collabService.sendPermissionUpdate(canDraw);
    }
  }

  onToggleStudentPermission(userId: number) {
    // Determine the current effective permission for this user
    let currentPermission = this.globalStudentCanDraw;
    if (this.studentPermissions.has(userId)) {
      currentPermission = this.studentPermissions.get(userId)!;
    }

    // Flip it
    const newPermission = !currentPermission;
    this.studentPermissions.set(userId, newPermission);

    if (this.collaborationEnabled) {
      this.collabService.sendPermissionUpdate(newPermission, userId);
    }
  }

  get canIDraw(): boolean {
    if (this.currentUser?.role === 'mentor') return true;
    if (this.currentUser && this.studentPermissions.has(this.currentUser.id)) {
      return this.studentPermissions.get(this.currentUser.id)!;
    }
    return this.globalStudentCanDraw;
  }

  confirmDeleteSession() {
    if (!this.session) return;
    this.apiService.deleteSession(this.session.id).subscribe({
      next: () => {
        this.notificationService.success('Session deleted. bye bye! 👋');
        this.router.navigate(['/dashboard']);
      },
      error: () => this.notificationService.error('Failed to delete session.'),
    });
  }

  undoCanvas() {
    this.canvas()?.undo();
  }

  redoCanvas() {
    this.canvas()?.redo();
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
    const filename = `asoboard-export-${timestamp}.png`;
    this.canvas()?.exportAsPNG(this.currentUser?.role, filename);
  }

  exportCanvasAsPDF() {
    const timestamp = new Date().toISOString().slice(0, 10);
    const title = this.session?.title || 'AsoBoard Export';
    const filename = `asoboard-export-${timestamp}.pdf`;
    this.canvas()?.exportAsPDF(this.currentUser?.role, filename, 1, title);
  }

  closeClearBoardConfirm() {
    this.showClearCanvasConfirm = false;
  }
  closeDeleteSessionConfirm() {
    this.showDeleteSessionConfirm = false;
  }
}
