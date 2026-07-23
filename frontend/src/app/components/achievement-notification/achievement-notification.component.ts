import { Component, OnInit, OnDestroy, inject } from '@angular/core';

import { AchievementService, Achievement } from '../../services/achievement.service';
import { Subscription } from 'rxjs';

interface NotificationItem {
  achievement: Achievement;
  id: number;
}

@Component({
  selector: 'app-achievement-notification',
  standalone: true,
  imports: [],
  styles: [
    `
      .notification-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        pointer-events: none;
      }

      .notification {
        background: #3b82f6;
        color: white;
        padding: 16px 20px;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(102, 126, 234, 0.3);
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        gap: 12px;
        animation:
          slideIn 0.4s ease-out,
          fadeOut 0.4s ease-in 4.6s forwards;
        pointer-events: auto;
        min-width: 280px;
        max-width: 400px;
      }

      .icon {
        font-size: 32px;
        flex-shrink: 0;
      }

      .content {
        flex: 1;
      }

      .title {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 1px;
        opacity: 0.9;
        margin-bottom: 4px;
      }

      .name {
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 2px;
      }

      .points {
        font-size: 12px;
        opacity: 0.9;
      }

      @keyframes slideIn {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }

      @keyframes fadeOut {
        to {
          opacity: 0;
          transform: translateX(400px);
        }
      }
    `,
  ],
  template: `
    <div class="notification-container">
      @for (item of notifications; track item.id) {
        <div class="notification">
          <div class="icon">{{ item.achievement.icon }}</div>
          <div class="content">
            <div class="title">
              <i class="fa-solid fa-star text-amber-500"></i> Achievement Unlocked!
            </div>
            <div class="name">{{ item.achievement.name }}</div>
            <div class="points">+{{ item.achievement.points }} points</div>
          </div>
        </div>
      }
    </div>
  `,
})
export class AchievementNotificationComponent implements OnInit, OnDestroy {
  private achievementService = inject(AchievementService);
  private subscription?: Subscription;

  notifications: NotificationItem[] = [];
  private notificationId = 0;

  ngOnInit(): void {
    this.subscription = this.achievementService.newAchievements$.subscribe((achievements) => {
      achievements.forEach((achievement) => {
        this.showNotification(achievement);
      });
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  showNotification(achievement: Achievement): void {
    const id = ++this.notificationId;
    this.notifications.push({ achievement, id });

    setTimeout(() => {
      this.notifications = this.notifications.filter((n) => n.id !== id);
    }, 5000);
  }
}
