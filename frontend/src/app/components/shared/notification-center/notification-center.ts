import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  RealtimeNotificationService,
  RealtimeNotification,
} from '../../../services/realtime-notification.service';

@Component({
  selector: 'app-notification-center',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative">
      <!-- Notification Bell Button -->
      <button
        type="button"
        (click)="toggleDropdown()"
        class="relative p-2 text-gray-600 hover:text-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 rounded-lg transition-colors"
        [attr.aria-label]="'Notifications (' + unreadCount() + ' unread)'"
      >
        <i class="fa-solid fa-bell text-xl"></i>
        @if (unreadCount() > 0) {
          <span
            class="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white"
          >
            {{ unreadCount() > 9 ? '9+' : unreadCount() }}
          </span>
        }
      </button>

      <!-- Dropdown Panel -->
      @if (isOpen()) {
        <div
          class="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border-2 border-gray-200 z-50 max-h-[600px] flex flex-col"
        >
          <!-- Header -->
          <div class="flex items-center justify-between p-4 border-b-2 border-gray-100">
            <h3 class="text-lg font-bold text-gray-800 flex items-center gap-2">
              <i class="fa-solid fa-bell text-sky-500"></i>
              Notifications
            </h3>
            @if (unreadCount() > 0) {
              <button
                type="button"
                (click)="markAllRead()"
                class="text-xs font-semibold text-sky-500 hover:text-sky-600 transition-colors px-3 py-1 rounded-lg hover:bg-sky-50"
              >
                Mark all read
              </button>
            }
          </div>

          <!-- Connection Status -->
          @if (!isConnected()) {
            <div
              class="px-4 py-2 bg-yellow-50 border-b border-yellow-200 flex items-center gap-2 text-yellow-800 text-sm"
            >
              <i class="fa-solid fa-circle-exclamation"></i>
              <span>Connecting to notification server...</span>
            </div>
          }

          <!-- Notification List -->
          <div class="overflow-y-auto flex-1" style="max-height: 480px">
            @if (notifications().length === 0) {
              <div class="p-8 text-center text-gray-400">
                <i class="fa-solid fa-inbox text-4xl mb-3"></i>
                <p class="font-semibold">No notifications yet</p>
                <p class="text-sm">We'll notify you when something new happens</p>
              </div>
            } @else {
              @for (notification of notifications(); track notification.id) {
                <div
                  class="p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                  [class.bg-sky-50]="!notification.is_read"
                  (click)="handleNotificationClick(notification)"
                  (keydown.enter)="handleNotificationClick(notification)"
                  tabindex="0"
                  role="button"
                >
                  <div class="flex items-start gap-3">
                    <!-- Icon -->
                    <div
                      class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
                      [class]="getIconBgClass(notification.notification_type)"
                    >
                      <i [class]="getIconClass(notification.notification_type) + ' text-white'"></i>
                    </div>

                    <!-- Content -->
                    <div class="flex-1 min-w-0">
                      <div class="flex items-start justify-between gap-2">
                        <h4 class="font-semibold text-sm text-gray-800 truncate">
                          {{ notification.title }}
                        </h4>
                        @if (!notification.is_read) {
                          <span class="flex-shrink-0 w-2 h-2 bg-sky-500 rounded-full"></span>
                        }
                      </div>
                      <p class="text-sm text-gray-600 mt-1 line-clamp-2">
                        {{ notification.message }}
                      </p>
                      <p class="text-xs text-gray-400 mt-2">
                        {{ formatTime(notification.created_at) }}
                      </p>
                    </div>
                  </div>
                </div>
              }
            }
          </div>

          <!-- Footer -->
          <div class="p-3 border-t-2 border-gray-100 bg-gray-50">
            <button
              type="button"
              (click)="viewAllNotifications()"
              class="w-full text-center text-sm font-semibold text-sky-500 hover:text-sky-600 py-2 rounded-lg hover:bg-white transition-colors"
            >
              View all notifications
              <i class="fa-solid fa-arrow-right ml-2"></i>
            </button>
          </div>
        </div>
      }
    </div>

    <!-- Backdrop to close dropdown -->
    @if (isOpen()) {
      <div class="fixed inset-0 z-40" (click)="closeDropdown()" aria-hidden="true"></div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .line-clamp-2 {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
    `,
  ],
})
export class NotificationCenterComponent {
  private notificationService = inject(RealtimeNotificationService);
  private router = inject(Router);

  // Reactive state from service
  public notifications = this.notificationService.notifications;
  public unreadCount = this.notificationService.unreadCount;
  public isConnected = this.notificationService.isConnected;

  // Local UI state
  public isOpen = signal(false);

  constructor() {
    // Auto-connect on component init
    if (!this.isConnected()) {
      this.notificationService.connect();
    }
  }

  public toggleDropdown(): void {
    this.isOpen.update((open) => !open);
  }

  public closeDropdown(): void {
    this.isOpen.set(false);
  }

  public markAllRead(): void {
    this.notificationService.markAllAsRead();
  }

  public handleNotificationClick(notification: RealtimeNotification): void {
    // Mark as read
    if (!notification.is_read) {
      this.notificationService.markAsRead(notification.id);
    }

    // Navigate based on notification type
    this.closeDropdown();

    if (notification.related_object_id) {
      switch (notification.related_object_type) {
        case 'course':
          this.router.navigate(['/course', notification.related_object_id]);
          break;
        case 'session':
          this.router.navigate(['/session', notification.related_object_id]);
          break;
        case 'diary':
          this.router.navigate(['/diary', notification.related_object_id]);
          break;
        case 'achievement':
          this.router.navigate(['/profile'], { fragment: 'achievements' });
          break;
      }
    }
  }

  public viewAllNotifications(): void {
    this.closeDropdown();
    this.router.navigate(['/profile'], { fragment: 'notifications' });
  }

  public getIconClass(type: string): string {
    switch (type) {
      case 'achievement':
        return 'fa-solid fa-trophy';
      case 'enrollment':
        return 'fa-solid fa-book';
      case 'diary_comment':
        return 'fa-solid fa-comment';
      case 'system':
        return 'fa-solid fa-bell';
      default:
        return 'fa-solid fa-circle-info';
    }
  }

  public getIconBgClass(type: string): string {
    switch (type) {
      case 'achievement':
        return 'bg-yellow-500';
      case 'enrollment':
        return 'bg-sky-500';
      case 'diary_comment':
        return 'bg-purple-500';
      case 'system':
        return 'bg-gray-500';
      default:
        return 'bg-blue-500';
    }
  }

  public formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffMins < 1440) {
      const hours = Math.floor(diffMins / 60);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diffMins / 1440);
      return `${days}d ago`;
    }
  }
}
