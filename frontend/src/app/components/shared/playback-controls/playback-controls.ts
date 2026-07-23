import { TranslatePipe } from '@ngx-translate/core';
import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  inject,
} from '@angular/core';
import { NotificationService } from '../../../services/notification.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-playback-controls',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './playback-controls.html',
  styleUrl: './playback-controls.css',
})
export class PlaybackControlsComponent {
  @ViewChild('audioPlayer') audioPlayer!: ElementRef<HTMLAudioElement>;

  @Input() audioUrl = '';
  @Input() isPlaying = false;
  @Input() isRecording = false;
  @Input() userRole: 'mentor' | 'student' | 'staff' | 'parent' | null = null;
  @Input() currentTime = 0;
  @Input() duration = 0;

  @Output() playStateChange = new EventEmitter<void>();
  @Output() pauseStateChange = new EventEmitter<void>();
  @Output() seekChange = new EventEmitter<number>();
  @Output() timeUpdate = new EventEmitter<number>();
  @Output() startRecording = new EventEmitter<void>();
  @Output() startCanvasOnlyRecording = new EventEmitter<void>();
  @Output() stopRecording = new EventEmitter<void>();
  @Output() playbackSpeedChange = new EventEmitter<number>();
  @Output() durationChange = new EventEmitter<number>();

  playbackSpeed = 1.0;
  speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

  private animationFrameId: number | null = null;
  private notificationService = inject(NotificationService);

  togglePlay() {
    const audio = this.audioPlayer.nativeElement;
    if (audio.paused) {
      if (!this.audioUrl) {
        return;
      }
      audio.play().catch(() => {
        this.notificationService.error('Playback failed. Please try again.');
      });
    } else {
      audio.pause();
    }
  }

  onPlay() {
    this.playStateChange.emit();
    this.startSmoothTimeUpdate();
  }

  onPause() {
    this.pauseStateChange.emit();
    this.stopSmoothTimeUpdate();
  }

  startSmoothTimeUpdate() {
    const loop = () => {
      if (this.audioPlayer?.nativeElement && !this.audioPlayer.nativeElement.paused) {
        this.currentTime = this.audioPlayer.nativeElement.currentTime * 1000;
        this.timeUpdate.emit(this.currentTime);
        this.animationFrameId = requestAnimationFrame(loop);
      }
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  stopSmoothTimeUpdate() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  onTimeUpdate(event: Event) {
    const target = event.target as HTMLAudioElement;
    this.currentTime = target.currentTime * 1000;
    this.timeUpdate.emit(this.currentTime);
  }

  onLoadedMetadata(event: Event) {
    const target = event.target as HTMLAudioElement;
    this.duration = target.duration * 1000;
    this.durationChange.emit(this.duration);
  }

  onSeek(event: Event) {
    if (this.duration === 0) return;
    const container = event.currentTarget as HTMLElement;
    const rect = container.getBoundingClientRect();
    let x = 0;
    if (event instanceof MouseEvent) {
      x = event.clientX - rect.left;
    } else if (event instanceof KeyboardEvent) {
      x = rect.width / 2;
    }
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const newTime = percentage * this.duration;
    this.audioPlayer.nativeElement.currentTime = newTime / 1000;
    this.seekChange.emit(newTime);
  }

  seek(deltaMs: number) {
    if (this.duration === 0) return;
    const newTime = Math.max(0, Math.min(this.duration, this.currentTime + deltaMs));
    this.audioPlayer.nativeElement.currentTime = newTime / 1000;
    this.currentTime = newTime;
    this.seekChange.emit(newTime);
  }

  onSpeedChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const speed = parseFloat(select.value);
    this.playbackSpeed = speed;
    this.audioPlayer.nativeElement.playbackRate = speed;
    this.playbackSpeedChange.emit(speed);
  }

  formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  get nativeElement() {
    return this.audioPlayer?.nativeElement;
  }
}
