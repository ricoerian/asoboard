import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, BehaviorSubject } from 'rxjs';

export interface Achievement {
  id: number;
  name: string;
  description: string;
  icon: string;
  category: string;
  requirement_value: number;
  requirement_type: string;
  points: number;
  is_active: boolean;
  created_at?: string;
}

export interface UserAchievement {
  id: number;
  achievement: Achievement;
  earned_at: string;
}

export interface CheckAchievementsResponse {
  new_achievements: Achievement[];
}

@Injectable({
  providedIn: 'root',
})
export class AchievementService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:8000/api';

  private newAchievementSource = new BehaviorSubject<Achievement[]>([]);
  newAchievements$ = this.newAchievementSource.asObservable();

  constructor() {}

  checkAndAward(): Observable<CheckAchievementsResponse> {
    return this.http
      .post<CheckAchievementsResponse>(`${this.baseUrl}/check-achievements/`, {})
      .pipe(
        tap((response) => {
          if (response.new_achievements && response.new_achievements.length > 0) {
            this.newAchievementSource.next(response.new_achievements);
          }
        }),
      );
  }

  getUserAchievements(): Observable<UserAchievement[]> {
    return this.http.get<UserAchievement[]>(`${this.baseUrl}/user-achievements/`);
  }

  getAllAchievements(): Observable<Achievement[]> {
    return this.http.get<Achievement[]>(`${this.baseUrl}/achievements/`);
  }
}
