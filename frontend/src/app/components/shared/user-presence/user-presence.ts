import {
  Component,
  inject,
  signal,
  OnDestroy,
  OnInit,
  Input,
  Output,
  EventEmitter,
} from '@angular/core';

import {
  CanvasCollaborationService,
  UserPresence,
} from '../../../services/canvas/canvas-collaboration.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-user-presence',
  standalone: true,
  imports: [],
  templateUrl: './user-presence.html',
  styleUrls: ['./user-presence.css'],
})
export class UserPresenceComponent implements OnDestroy, OnInit {
  @Input() userRole: string | null = null;
  @Input() globalStudentCanDraw = true;
  @Input() individualPermissions = new Map<number, boolean>();
  @Output() toggleStudentPermission = new EventEmitter<number>();

  private collabService = inject(CanvasCollaborationService);
  private subscription: Subscription | null = null;

  users = signal<UserPresence[]>([]);
  showList = signal(false);

  ngOnInit() {
    this.subscription = this.collabService.getUserPresence().subscribe((users) => {
      this.users.set(users);
    });
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  toggleList() {
    this.showList.update((v) => !v);
  }

  getOnlineCount(): number {
    return this.users().filter((u) => u.isOnline).length;
  }

  getInitial(username: string): string {
    return username?.charAt(0).toUpperCase() || '?';
  }

  getAvatarColor(userId: number): string {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-orange-500',
      'bg-pink-500',
      'bg-cyan-500',
      'bg-teal-500',
      'bg-yellow-500',
      'bg-red-500',
    ];
    const index = userId % colors.length;
    return colors[index];
  }

  getVisibleUsers(max: number = 3): UserPresence[] {
    return this.users()
      .filter((u) => u.isOnline)
      .slice(0, max);
  }

  getMoreCount(max: number = 3): number {
    const onlineUsers = this.users().filter((u) => u.isOnline);
    return Math.max(0, onlineUsers.length - max);
  }

  isUserAllowedToDraw(userId: number): boolean {
    if (this.individualPermissions.has(userId)) {
      return this.individualPermissions.get(userId)!;
    }
    return this.globalStudentCanDraw;
  }
}
