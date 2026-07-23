import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, Notification } from '../../../services/notification.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification.html',
  styleUrl: './notification.css',
})
export class NotificationComponent implements OnInit {
  private notificationService = inject(NotificationService);
  notifications$!: Observable<Notification[]>;

  ngOnInit() {
    this.notifications$ = this.notificationService.notifications$;
  }

  getNotificationClass(n: Notification) {
    return {
      'bg-green-50 border-green-200': n.type === 'success',
      'bg-red-50 border-red-200': n.type === 'error',
      'bg-blue-50 border-blue-200': n.type === 'info',
      'bg-amber-50 border-amber-200': n.type === 'warning',
    };
  }

  remove(id: number) {
    this.notificationService.remove(id);
  }
}
