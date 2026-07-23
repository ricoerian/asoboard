import { Component, Input, ViewChild, ElementRef, AfterViewInit } from '@angular/core';

@Component({
  selector: 'app-webrtc-audio',
  standalone: true,
  template: `<audio #audioEl autoplay></audio>`,
})
export class WebRtcAudioComponent implements AfterViewInit {
  private _stream: MediaStream | null = null;

  @Input() set stream(val: MediaStream) {
    this._stream = val;
    if (this.audioEl && this.audioEl.nativeElement) {
      this.audioEl.nativeElement.srcObject = val;
    }
  }

  get stream(): MediaStream | null {
    return this._stream;
  }

  @ViewChild('audioEl') audioEl!: ElementRef<HTMLAudioElement>;

  ngAfterViewInit() {
    if (this.audioEl && this.audioEl.nativeElement && this._stream) {
      this.audioEl.nativeElement.srcObject = this._stream;
    }
  }
}
