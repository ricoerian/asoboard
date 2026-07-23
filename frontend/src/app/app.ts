import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { NotificationComponent } from './components/shared/notification/notification';
import { SessionTimeoutWarningComponent } from './components/shared/session-timeout-warning/session-timeout-warning';
import { AchievementNotificationComponent } from './components/achievement-notification/achievement-notification.component';
import { Api } from './services/api';
import { SessionTimeoutService } from './services/session-timeout.service';
import { ThemeService } from './services/theme.service';
import { LanguageService } from './services/language.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    NotificationComponent,
    SessionTimeoutWarningComponent,
    AchievementNotificationComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit, OnDestroy {
  protected readonly title = signal('asoboard');
  private readonly apiService = inject(Api);
  private readonly sessionTimeoutService = inject(SessionTimeoutService);
  private readonly themeService = inject(ThemeService);
  private readonly languageService = inject(LanguageService);
  private readonly destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.themeService.init();
    this.languageService.init();

    this.apiService.checkAuthStatus().subscribe({
      next: (user) => {
        if (user && user.username) {
          this.sessionTimeoutService.startTracking();
          this.themeService.loadFromApi();
        }
      },
      error: () => {},
    });

    this.apiService.currentUser$.pipe(takeUntil(this.destroy$)).subscribe((user) => {
      if (user && user.username) {
        this.sessionTimeoutService.startTracking();
        this.themeService.loadFromApi();
      } else {
        this.sessionTimeoutService.stopTracking();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.themeService.ngOnDestroy();
  }
}
