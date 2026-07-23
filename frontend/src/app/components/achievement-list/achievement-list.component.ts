import { Component, OnInit, inject } from '@angular/core';

import {
  AchievementService,
  Achievement,
  UserAchievement,
} from '../../services/achievement.service';

@Component({
  selector: 'app-achievement-list',
  standalone: true,
  imports: [],
  styles: [
    `
      .achievements-container {
        padding: 24px;
        background: #fef3c7;
        border-radius: 16px;
        margin: 20px 0;
      }

      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
      }

      .title {
        font-size: 24px;
        font-weight: 700;
        color: #2d3748;
      }

      .stats {
        display: flex;
        gap: 16px;
      }

      .stat-box {
        background: white;
        padding: 12px 20px;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      }

      .stat-label {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: #718096;
        margin-bottom: 4px;
      }

      .stat-value {
        font-size: 20px;
        font-weight: 700;
        color: #0ea5e9;
      }

      .achievements-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 16px;
      }

      .achievement-card {
        background: white;
        padding: 20px;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        transition:
          transform 0.2s,
          box-shadow 0.2s;
      }

      .achievement-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
      }

      .achievement-card.earned {
        border-left: 4px solid #10b981;
      }

      .achievement-card.locked {
        opacity: 0.6;
        filter: grayscale(60%);
      }

      .card-header {
        display: flex;
        gap: 12px;
        margin-bottom: 12px;
      }

      .icon {
        font-size: 32px;
        flex-shrink: 0;
      }

      .info {
        flex: 1;
      }

      .name {
        font-size: 16px;
        font-weight: 600;
        color: #2d3748;
        margin-bottom: 4px;
      }

      .category {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: #718096;
      }

      .description {
        font-size: 14px;
        color: #4a5568;
        line-height: 1.5;
        margin-bottom: 12px;
      }

      .footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 12px;
        border-top: 1px solid #e2e8f0;
      }

      .points {
        font-size: 14px;
        font-weight: 600;
        color: #f59e0b;
      }

      .status {
        font-size: 12px;
        padding: 4px 12px;
        border-radius: 12px;
        font-weight: 600;
      }

      .status.earned {
        background: #c6f6d5;
        color: #22543d;
      }

      .status.locked {
        background: #e2e8f0;
        color: #4a5568;
      }

      .empty-state {
        text-align: center;
        padding: 60px 20px;
        color: #718096;
      }

      .loading {
        text-align: center;
        padding: 40px;
        color: #718096;
      }

      /* Modal Styles */
      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        backdrop-filter: blur(4px);
        animation: fadeIn 0.2s ease-out;
      }

      .modal-content {
        background: white;
        border-radius: 24px;
        width: 90%;
        max-width: 400px;
        padding: 32px;
        position: relative;
        box-shadow:
          0 20px 25px -5px rgba(0, 0, 0, 0.1),
          0 10px 10px -5px rgba(0, 0, 0, 0.04);
        animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      }

      .close-btn {
        position: absolute;
        top: 20px;
        right: 20px;
        background: none;
        border: none;
        font-size: 24px;
        color: #a0aec0;
        cursor: pointer;
        transition: color 0.2s;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
      }

      .close-btn:hover {
        color: #4a5568;
        background: #f7fafc;
      }

      .modal-header {
        text-align: center;
        margin-bottom: 24px;
      }

      .modal-icon {
        font-size: 64px;
        margin-bottom: 16px;
      }

      .modal-title-group h3 {
        font-size: 24px;
        font-weight: 800;
        color: #2d3748;
        margin: 0 0 8px 0;
      }

      .modal-body {
        text-align: center;
        margin-bottom: 24px;
      }

      .modal-body .desc {
        font-size: 16px;
        color: #4a5568;
        line-height: 1.6;
        margin-bottom: 24px;
      }

      .criteria-box {
        background: #f7fafc;
        border-radius: 16px;
        padding: 16px;
        border: 1px solid #e2e8f0;
      }

      .criteria-box h4 {
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: #718096;
        margin: 0 0 8px 0;
        font-weight: 700;
      }

      .criteria-box p {
        font-size: 14px;
        font-weight: 600;
        color: #2d3748;
        margin: 0;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `,
  ],
  template: `
    <div class="achievements-container">
      <div class="header">
        <h2 class="title">
          <i class="fa-solid fa-trophy" style="color: #f59e0b;"></i> Achievements
        </h2>
        <div class="stats">
          <div class="stat-box">
            <div class="stat-label">Earned</div>
            <div class="stat-value">{{ earnedCount }}</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">Total Points</div>
            <div class="stat-value">{{ totalPoints }}</div>
          </div>
        </div>
      </div>

      @if (loading) {
        <div class="loading">Loading achievements...</div>
      } @else if (allAchievements.length === 0) {
        <div class="empty-state">
          <p>No achievements available yet.</p>
        </div>
      } @else {
        <div class="achievements-grid">
          @for (achievement of allAchievements; track achievement.id) {
            <div
              class="achievement-card"
              [class.earned]="isEarned(achievement.id)"
              [class.locked]="!isEarned(achievement.id)"
              (click)="openDetail(achievement)"
              tabindex="0"
              (keydown.enter)="openDetail(achievement)"
              style="cursor: pointer;"
            >
              <div class="card-header">
                <div class="icon">{{ achievement.icon }}</div>
                <div class="info">
                  <div class="name">{{ achievement.name }}</div>
                  <div class="category">{{ achievement.category }}</div>
                </div>
              </div>
              <div class="description">{{ achievement.description }}</div>
              <div class="footer">
                <div class="points">+{{ achievement.points }} pts</div>
                @if (isEarned(achievement.id)) {
                  <div class="status earned">✓ Earned</div>
                } @else {
                  <div class="status locked">🔒 Locked</div>
                }
              </div>
            </div>
          }
        </div>
      }

      @if (selectedAchievement) {
        <div
          class="modal-overlay"
          (click)="closeDetail()"
          tabindex="0"
          (keydown.enter)="closeDetail()"
        >
          <div
            class="modal-content"
            (click)="$event.stopPropagation()"
            tabindex="0"
            (keydown.enter)="$event.stopPropagation()"
          >
            <button class="close-btn" (click)="closeDetail()">
              <i class="fa-solid fa-xmark"></i>
            </button>
            <div class="modal-header">
              <div class="modal-icon">{{ selectedAchievement.icon }}</div>
              <div class="modal-title-group">
                <h3>{{ selectedAchievement.name }}</h3>
                <span class="category">{{ selectedAchievement.category }}</span>
              </div>
            </div>
            <div class="modal-body">
              <p class="desc">{{ selectedAchievement.description }}</p>
              <div class="criteria-box">
                <h4>How to earn</h4>
                <p>
                  Required: {{ selectedAchievement.requirement_value }} ({{
                    selectedAchievement.requirement_type
                  }})
                </p>
              </div>
            </div>
            <div class="footer" style="margin-top: 24px;">
              <div class="points">+{{ selectedAchievement.points }} pts</div>
              @if (isEarned(selectedAchievement.id)) {
                <div class="status earned">✓ Earned</div>
              } @else {
                <div class="status locked">🔒 Locked</div>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class AchievementListComponent implements OnInit {
  private achievementService = inject(AchievementService);

  allAchievements: Achievement[] = [];
  userAchievements: UserAchievement[] = [];
  loading = true;
  selectedAchievement: Achievement | null = null;

  get earnedCount(): number {
    return this.userAchievements.length;
  }

  get totalPoints(): number {
    return this.userAchievements.reduce((sum, ua) => sum + ua.achievement.points, 0);
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;

    // Load all available achievements
    this.achievementService.getAllAchievements().subscribe({
      next: (achievements) => {
        this.allAchievements = achievements;
        this.loadUserAchievements();
      },
      error: (err) => {
        console.error('Failed to load achievements:', err);
        this.loading = false;
      },
    });
  }

  loadUserAchievements(): void {
    this.achievementService.getUserAchievements().subscribe({
      next: (userAchievements) => {
        this.userAchievements = userAchievements;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load user achievements:', err);
        this.loading = false;
      },
    });
  }

  isEarned(achievementId: number): boolean {
    return this.userAchievements.some((ua) => ua.achievement.id === achievementId);
  }

  openDetail(achievement: Achievement) {
    this.selectedAchievement = achievement;
  }

  closeDetail() {
    this.selectedAchievement = null;
  }
}
