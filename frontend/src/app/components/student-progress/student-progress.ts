import { TranslatePipe } from '@ngx-translate/core';
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { Api } from '../../services/api';
import { NotificationService } from '../../services/notification.service';

interface Session {
  id: number;
  title: string;
  mode: string;
  created_at: string;
  is_correct?: boolean;
}

interface WeeklyActivity {
  label: string;
  value: number;
}

import { StudentInsightsComponent } from '../analytics/student-insights/student-insights';

@Component({
  selector: 'app-student-progress',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe, StudentInsightsComponent],
  templateUrl: './student-progress.html',
  styleUrl: './student-progress.css',
})
export class StudentProgressComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private apiService = inject(Api);
  private notificationService = inject(NotificationService);

  totalSessions = 0;
  totalCanvasTime = 0;
  totalGames = 0;
  accuracyRate = 0;
  maxActivity = 0;
  weeklyActivity: WeeklyActivity[] = [];
  recentSessions: Session[] = [];
  currentStudentId?: number;

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      let studentId = params['student_id'] ? Number(params['student_id']) : undefined;

      this.apiService.checkAuthStatus().subscribe({
        next: (user) => {
          const parsedUser = typeof user === 'string' ? JSON.parse(user as string) : user;
          if (!studentId && parsedUser.role === 'student') {
            studentId = parsedUser.id;
          }
          this.currentStudentId = studentId;
          this.loadProgressData(studentId);
        },
      });
    });
  }

  loadProgressData(studentId?: number) {
    this.apiService.getStudentProgress(studentId).subscribe({
      next: (data) => {
        this.totalSessions = data.total_sessions;
        this.totalCanvasTime = data.total_canvas_time;
        this.totalGames = data.total_games;
        this.accuracyRate = data.accuracy_rate;
        this.maxActivity = data.max_activity;
        this.weeklyActivity = data.weekly_activity;
        this.recentSessions = data.recent_sessions;
      },
      error: () => {
        this.notificationService.error('Failed to load progress data');
        this.weeklyActivity = [
          { label: 'Mon', value: 0 },
          { label: 'Tue', value: 0 },
          { label: 'Wed', value: 0 },
          { label: 'Thu', value: 0 },
          { label: 'Fri', value: 0 },
          { label: 'Sat', value: 0 },
          { label: 'Sun', value: 0 },
        ];
      },
    });
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  formatTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  viewSession(sessionId: number) {
    this.route.queryParams
      .subscribe((params) => {
        const queryParams: Record<string, string> = {};
        if (params['student_id']) {
          queryParams['student_id'] = params['student_id'];
        }
        this.router.navigate(['/session', sessionId], { queryParams });
      })
      .unsubscribe();
  }
}
