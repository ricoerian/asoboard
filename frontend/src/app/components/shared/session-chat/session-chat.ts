import { Component, inject, signal, OnDestroy, input, OnInit } from '@angular/core';

import { FormsModule } from '@angular/forms';
import {
  CanvasCollaborationService,
  ChatMessage,
} from '../../../services/canvas/canvas-collaboration.service';
import { Subscription } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-session-chat',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  templateUrl: './session-chat.html',
  styleUrls: ['./session-chat.css'],
})
export class SessionChatComponent implements OnDestroy, OnInit {
  private collabService = inject(CanvasCollaborationService);
  private subscription: Subscription | null = null;

  isOpen = signal(false);
  userRole = input<'mentor' | 'student' | 'staff' | 'parent' | null>(null);
  messageInput = signal('');
  messages = signal<ChatMessage[]>([]);

  ngOnInit() {
    this.subscription = this.collabService.getChatMessages().subscribe((msg) => {
      this.messages.update((msgs) => {
        const exists = msgs.some(
          (m) =>
            m.timestamp === msg.timestamp && m.userId === msg.userId && m.message === msg.message,
        );
        if (exists) return msgs;

        const newMsgs = [...msgs, msg];
        newMsgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        return newMsgs;
      });
    });
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  toggleChat() {
    this.isOpen.update((v) => !v);
  }

  sendMessage() {
    const msg = this.messageInput().trim();
    if (!msg) return;

    this.collabService.sendChatMessage(msg);
    this.messageInput.set('');
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  onInputChange(value: string) {
    this.messageInput.set(value);
  }

  getInitial(username: string | undefined): string {
    return username?.charAt(0).toUpperCase() || '?';
  }

  getRoleBadgeColor(role: string | undefined): string {
    if (role === 'mentor') return 'bg-blue-100 text-blue-800 border-blue-200';
    if (role === 'student') return 'bg-green-100 text-green-800 border-green-200';
    if (role === 'staff') return 'bg-orange-100 text-orange-800 border-orange-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  }

  formatTime(timestamp: string | undefined): string {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
  }

  getRoleIcon(role: string | undefined): string {
    if (role === 'mentor') return 'fa-chalkboard-user';
    if (role === 'student') return 'fa-graduation-cap';
    if (role === 'staff') return 'fa-briefcase';
    return 'fa-user';
  }
}
