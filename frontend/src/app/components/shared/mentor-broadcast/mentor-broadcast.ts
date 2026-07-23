import { Component, inject, signal, OnDestroy, input, OnInit } from '@angular/core';

import { FormsModule } from '@angular/forms';
import {
  CanvasCollaborationService,
  MentorBroadcast,
} from '../../../services/canvas/canvas-collaboration.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-mentor-broadcast',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './mentor-broadcast.html',
  styleUrls: ['./mentor-broadcast.css'],
})
export class MentorBroadcastComponent implements OnDestroy, OnInit {
  private collabService = inject(CanvasCollaborationService);
  private subscription: Subscription | null = null;

  broadcasts = signal<MentorBroadcast[]>([]);
  userRole = input<'mentor' | 'student' | 'staff' | 'parent' | null>(null);
  broadcastInput = signal('');

  ngOnInit() {
    this.subscription = this.collabService.getMentorBroadcasts().subscribe((broadcast) => {
      if (broadcast.message && broadcast.message.trim()) {
        this.broadcasts.update((list) => [broadcast, ...list]);
      }
    });
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  sendBroadcast() {
    const msg = this.broadcastInput().trim();
    if (!msg || this.userRole() !== 'mentor') return;

    this.collabService.sendMentorBroadcast(msg);
    this.broadcastInput.set('');
  }

  onInputChange(value: string) {
    this.broadcastInput.set(value);
  }

  dismissBroadcast(index: number) {
    this.broadcasts.update((list) => list.filter((_, i) => i !== index));
  }

  getInitial(username: string): string {
    return username?.charAt(0).toUpperCase() || '?';
  }
}
