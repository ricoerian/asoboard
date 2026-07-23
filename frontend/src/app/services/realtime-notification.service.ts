import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { NotificationService } from './notification.service';

export interface RealtimeNotification {
  id: number;
  title: string;
  message: string;
  notification_type: 'achievement' | 'enrollment' | 'diary_comment' | 'system';
  related_object_id?: number;
  related_object_type?: string;
  is_read: boolean;
  created_at: string;
}

export interface UnreadCountResponse {
  unread_count: number;
}

@Injectable({
  providedIn: 'root',
})
export class RealtimeNotificationService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private http = inject(HttpClient);
  private toastService = inject(NotificationService);

  // Reactive signals
  private notificationsSignal = signal<RealtimeNotification[]>([]);
  private unreadCountSignal = signal<number>(0);
  private isConnectedSignal = signal<boolean>(false);

  // Public readonly signals
  public readonly notifications = this.notificationsSignal.asReadonly();
  public readonly unreadCount = this.unreadCountSignal.asReadonly();
  public readonly isConnected = this.isConnectedSignal.asReadonly();

  // Observable for new notification events
  private newNotificationSubject = new Subject<RealtimeNotification>();
  public readonly newNotification$ = this.newNotificationSubject.asObservable();

  /**
   * Connect to WebSocket notification channel
   */
  public connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[RealtimeNotification] Already connected');
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/notifications/`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[RealtimeNotification] WebSocket connected');
        this.isConnectedSignal.set(true);
        this.reconnectAttempts = 0;
        this.requestUnreadCount();
        this.loadNotifications();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('[RealtimeNotification] Parse error:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[RealtimeNotification] WebSocket error:', error);
      };

      this.ws.onclose = (event) => {
        console.log('[RealtimeNotification] WebSocket closed:', event.code);
        this.isConnectedSignal.set(false);

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
          setTimeout(() => {
            this.reconnectAttempts++;
            this.connect();
          }, delay);
        }
      };
    } catch (error) {
      console.error('[RealtimeNotification] Failed to create WebSocket:', error);
    }
  }

  public disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnectedSignal.set(false);
    }
  }

  private handleMessage(data: unknown): void {
    if (!data || typeof data !== 'object') return;
    const msg = data as Record<string, unknown>;
    switch (msg['type']) {
      case 'connection_established':
        console.log('[RealtimeNotification] Connected:', msg);
        break;

      case 'notification': {
        const notification: RealtimeNotification = msg['notification'] as RealtimeNotification;
        this.notificationsSignal.update((n) => [notification, ...n]);

        if (!notification.is_read) {
          this.unreadCountSignal.update((c) => c + 1);
        }

        this.newNotificationSubject.next(notification);
        this.showToast(notification);
        console.log('[RealtimeNotification] New:', notification);
        break;
      }

      case 'unread_count':
        this.unreadCountSignal.set(msg['count'] as number);
        break;

      case 'mark_read_response':
        if (msg['success']) {
          this.notificationsSignal.update((notifications) =>
            notifications.map((n) =>
              n.id === (msg['notification_id'] as string | number) ? { ...n, is_read: true } : n,
            ),
          );
          this.unreadCountSignal.update((c) => Math.max(0, c - 1));
        }
        break;

      case 'mark_all_read_response':
        this.notificationsSignal.update((n) => n.map((x) => ({ ...x, is_read: true })));
        this.unreadCountSignal.set(0);
        break;

      case 'error':
        console.error('[RealtimeNotification] Error:', msg['message']);
        break;
    }
  }

  private showToast(notification: RealtimeNotification): void {
    const icon = this.getNotificationIcon(notification.notification_type);
    const message = `${icon} ${notification.title}: ${notification.message}`;

    switch (notification.notification_type) {
      case 'achievement':
        this.toastService.success(message);
        break;
      case 'enrollment':
        this.toastService.success(message);
        break;
      case 'diary_comment':
        this.toastService.show(message, 'info');
        break;
      default:
        this.toastService.show(message, 'info');
    }
  }

  private getNotificationIcon(type: string): string {
    switch (type) {
      case 'achievement':
        return '🏆';
      case 'enrollment':
        return '📚';
      case 'diary_comment':
        return '💬';
      case 'system':
        return '🔔';
      default:
        return '📢';
    }
  }

  private requestUnreadCount(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'get_unread_count' }));
    }
  }

  public loadNotifications(limit: number = 20): void {
    this.http.get<RealtimeNotification[]>(`/api/notifications/?limit=${limit}`).subscribe({
      next: (notifications) => {
        this.notificationsSignal.set(notifications);
        const unread = notifications.filter((n) => !n.is_read).length;
        this.unreadCountSignal.set(unread);
      },
      error: (error) => {
        console.error('[RealtimeNotification] Load error:', error);
      },
    });
  }

  public markAsRead(notificationId: number): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'mark_read',
          notification_id: notificationId,
        }),
      );
    } else {
      this.http.patch(`/api/notifications/${notificationId}/`, { is_read: true }).subscribe({
        next: () => {
          this.notificationsSignal.update((n) =>
            n.map((x) => (x.id === notificationId ? { ...x, is_read: true } : x)),
          );
          this.unreadCountSignal.update((c) => Math.max(0, c - 1));
        },
        error: (e) => console.error('[RealtimeNotification] Mark read error:', e),
      });
    }
  }

  public markAllAsRead(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'mark_all_read' }));
    } else {
      this.http.post('/api/notifications/mark_all_read/', {}).subscribe({
        next: () => {
          this.notificationsSignal.update((n) => n.map((x) => ({ ...x, is_read: true })));
          this.unreadCountSignal.set(0);
        },
        error: (e) => console.error('[RealtimeNotification] Mark all error:', e),
      });
    }
  }

  public getNotifications(params?: {
    is_read?: boolean;
    type?: string;
    limit?: number;
    offset?: number;
  }): Observable<RealtimeNotification[]> {
    let query = '';
    if (params) {
      const parts: string[] = [];
      if (params.is_read !== undefined) parts.push(`is_read=${params.is_read}`);
      if (params.type) parts.push(`type=${params.type}`);
      if (params.limit) parts.push(`limit=${params.limit}`);
      if (params.offset) parts.push(`offset=${params.offset}`);
      query = parts.length > 0 ? '?' + parts.join('&') : '';
    }
    return this.http.get<RealtimeNotification[]>(`/api/notifications/${query}`);
  }
}
