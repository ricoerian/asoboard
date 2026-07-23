import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
} from '@angular/core';

import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';
import { SessionTimeoutService, SessionState } from '../../../services/session-timeout.service';
import { Api } from '../../../services/api';
import { NotificationService } from '../../../services/notification.service';

@Component({
  selector: 'app-session-timeout-warning',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './session-timeout-warning.html',
  styleUrl: './session-timeout-warning.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionTimeoutWarningComponent implements OnInit, OnDestroy {
  private readonly sessionTimeoutService = inject(SessionTimeoutService);
  private readonly apiService = inject(Api);
  private readonly router = inject(Router);
  private readonly notificationService = inject(NotificationService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();

  isVisible = false;
  sessionState: SessionState = {
    isLoggedIn: false,
    remainingTimeMs: 0,
    isWarningActive: false,
    countdownSeconds: 0,
  };

  formattedTime = '00:00';

  ngOnInit(): void {
    this.sessionTimeoutService.warningTriggered$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.showWarning();
    });

    this.sessionTimeoutService.timeoutTriggered$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.handleTimeout();
    });

    this.sessionTimeoutService.sessionState$.pipe(takeUntil(this.destroy$)).subscribe((state) => {
      this.sessionState = state;
      if (state.isWarningActive) {
        this.formattedTime = this.sessionTimeoutService.formatTime(state.remainingTimeMs);
      }
      this.cdr.markForCheck();
    });

    const currentState = this.sessionTimeoutService.getSessionState();
    if (currentState.isWarningActive) {
      this.showWarning();
    }
  }

  private showWarning(): void {
    this.isVisible = true;
    this.cdr.markForCheck();
  }

  closeWarning(): void {
    this.isVisible = false;
    this.cdr.markForCheck();
  }

  onStayLoggedIn(): void {
    this.closeWarning();

    this.apiService.checkAuthStatus().subscribe({
      next: () => {
        this.sessionTimeoutService.extendSession();
        this.notificationService.success(
          'Session extended successfully! You will be warned again in 55 minutes.',
        );
      },
      error: (err) => {
        console.error('Failed to extend session:', err);
        this.notificationService.error('Failed to extend session. Please log in again.');
        this.handleTimeout();
      },
    });
  }

  onLogout(): void {
    this.closeWarning();
    this.performLogout();
  }

  private handleTimeout(): void {
    this.closeWarning();
    this.notificationService.error('Your session has expired. Please log in again.');
    this.performLogout();
  }

  private performLogout(): void {
    this.sessionTimeoutService.stopTracking();

    this.apiService.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: (err) => {
        console.error('Logout error:', err);

        this.router.navigate(['/login']);
      },
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
