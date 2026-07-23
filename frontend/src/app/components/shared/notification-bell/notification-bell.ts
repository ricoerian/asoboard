/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-empty */
import { Component, OnInit, OnDestroy, inject } from '@angular/core';

import { Api } from '../../../services/api';
import { AppNotification } from '../../../models/types';
import { interval, takeUntil } from 'rxjs';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [],
  templateUrl: './notification-bell.html',
  styleUrl: './notification-bell.css',
})
export class NotificationBell implements OnInit, OnDestroy {
  unreadCount = 0;
  notifications: AppNotification[] = [];
  showDropdown = false;
  isLoading = false;

  private apiService = inject(Api);
  private destroy$ = new Subject<void>();

  ngOnInit() {
    this.loadUnreadCount();
    this.loadNotifications();
    interval(30000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadUnreadCount());
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleDropdown() {
    this.showDropdown = !this.showDropdown;
    if (this.showDropdown) {
      this.loadNotifications();
    }
  }

  closeDropdown() {
    this.showDropdown = false;
  }

  loadUnreadCount() {
    this.apiService.getUnreadNotificationCount().subscribe({
      next: (data) => {
        this.unreadCount = data.unread_count;
      },
    });
  }

  loadNotifications() {
    this.isLoading = true;
    this.apiService.getNotifications().subscribe({
      next: (data) => {
        if (Array.isArray(data)) {
          this.notifications = (data as AppNotification[]).slice(0, 20);
        } else if (data && (data as any).results) {
          this.notifications = (data as any).results.slice(0, 20);
        }
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  markAsRead(notif: AppNotification, event?: Event) {
    if (event) event.stopPropagation();
    if (notif.is_read) return;
    this.apiService.markNotificationRead(notif.id).subscribe({
      next: () => {
        notif.is_read = true;
        this.unreadCount = Math.max(0, this.unreadCount - 1);
      },
    });
  }

  markAllRead(event: Event) {
    event.stopPropagation();
    this.apiService.markAllNotificationsRead().subscribe({
      next: () => {
        this.notifications.forEach((n) => (n.is_read = true));
        this.unreadCount = 0;
      },
    });
  }

  deleteNotification(notif: AppNotification, event: Event) {
    event.stopPropagation();
    this.apiService.deleteNotification(notif.id).subscribe({
      next: () => {
        this.notifications = this.notifications.filter((n) => n.id !== notif.id);
        if (!notif.is_read) {
          this.unreadCount = Math.max(0, this.unreadCount - 1);
        }
      },
    });
  }

  timeAgo(dateStr: string): string {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diff = Math.floor((now - then) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 172800) return 'Yesterday';
    return `${Math.floor(diff / 86400)}d ago`;
  }

  typeIcon(type: string): string {
    const icons: Record<string, string> = {
      achievement: 'fa-star',
      enrollment: 'fa-user-plus',
      diary_comment: 'fa-comment-dots',
      system: 'fa-circle-info',
    };
    return icons[type] || 'fa-bell';
  }

  typeColor(type: string): string {
    const colors: Record<string, string> = {
      achievement: 'border-amber-400 bg-amber-50',
      enrollment: 'border-green-400 bg-green-50',
      diary_comment: 'border-blue-400 bg-blue-50',
      system: 'border-sky-400 bg-sky-50',
    };
    return colors[type] || 'border-slate-300 bg-slate-50';
  }

  typeBadge(type: string): string {
    const badges: Record<string, string> = {
      achievement: 'bg-amber-200 text-amber-800',
      enrollment: 'bg-green-200 text-green-800',
      diary_comment: 'bg-blue-200 text-blue-800',
      system: 'bg-sky-200 text-sky-800',
    };
    return badges[type] || 'bg-slate-200 text-slate-800';
  }
}
