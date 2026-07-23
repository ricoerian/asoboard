import { TranslatePipe } from '@ngx-translate/core';
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Api } from '../../services/api';
import { NotificationService } from '../../services/notification.service';
import { LeaderboardEntry, User } from '../../models/types';

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './leaderboard.html',
  styleUrl: './leaderboard.css',
})
export class LeaderboardComponent implements OnInit {
  private router = inject(Router);
  private apiService = inject(Api);
  private notificationService = inject(NotificationService);

  entries: LeaderboardEntry[] = [];
  currentUser: User | null = null;
  currentUserRank: LeaderboardEntry | null = null;
  loading = true;
  activePeriod: 'all_time' | 'weekly' | 'monthly' = 'all_time';

  readonly trophyIcons = [
    'fa-trophy text-yellow-400',
    'fa-trophy text-gray-300',
    'fa-trophy text-amber-600',
  ];
  readonly topColors = ['bg-yellow-400', 'bg-gray-300', 'bg-amber-600'];

  ngOnInit() {
    this.apiService.currentUser$.subscribe((user) => {
      this.currentUser = user;
    });
    this.loadLeaderboard();
  }

  loadLeaderboard() {
    this.loading = true;
    this.apiService
      .getLeaderboard(this.activePeriod === 'all_time' ? undefined : this.activePeriod)
      .subscribe({
        next: (data) => {
          this.entries = data;
          this.findCurrentUserRank();
          this.loading = false;
        },
        error: () => {
          this.notificationService.error('Gagal memuat papan peringkat');
          this.loading = false;
        },
      });
  }

  switchPeriod(period: 'all_time' | 'weekly' | 'monthly') {
    this.activePeriod = period;
    this.loadLeaderboard();
  }

  findCurrentUserRank() {
    if (!this.currentUser) {
      this.currentUserRank = null;
      return;
    }
    const found = this.entries.find((e) => e.user_id === this.currentUser!.id);
    this.currentUserRank = found || null;
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  getRankIcon(rank: number): string {
    if (rank <= 3) return this.trophyIcons[rank - 1];
    return '';
  }

  getPointsWidth(entry: LeaderboardEntry): number {
    const max = this.entries[0]?.total_points || 1;
    return Math.max((entry.total_points / max) * 100, 2);
  }
}
