import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject, interval, Subscription, takeUntil } from 'rxjs';

export interface SessionState {
  isLoggedIn: boolean;
  remainingTimeMs: number;
  isWarningActive: boolean;
  countdownSeconds: number;
}

@Injectable({
  providedIn: 'root',
})
export class SessionTimeoutService implements OnDestroy {
  private readonly STORAGE_KEY = 'asoboard_login_timestamp';
  private readonly SESSION_LIFETIME_MS = 60 * 60 * 1000;
  private readonly WARNING_THRESHOLD_MS = 5 * 60 * 1000;
  private readonly COUNTDOWN_SECONDS = 60;

  private timerSubscription: Subscription | null = null;
  private countdownSubscription: Subscription | null = null;
  private destroy$ = new Subject<void>();

  private sessionStateSubject = new BehaviorSubject<SessionState>({
    isLoggedIn: false,
    remainingTimeMs: 0,
    isWarningActive: false,
    countdownSeconds: 0,
  });

  private warningTriggeredSubject = new Subject<void>();
  private timeoutTriggeredSubject = new Subject<void>();

  public readonly sessionState$: Observable<SessionState> = this.sessionStateSubject.asObservable();
  public readonly warningTriggered$: Observable<void> = this.warningTriggeredSubject.asObservable();
  public readonly timeoutTriggered$: Observable<void> = this.timeoutTriggeredSubject.asObservable();

  private lastWarningEmit = 0;
  private isActive = false;
  private lastActivityTime = Date.now();

  private activityListener = () => {
    if (this.isActive) {
      const now = Date.now();
      if (now - this.lastActivityTime > 60000) {
        this.lastActivityTime = now;
        this.extendSession();
      }
    }
  };

  constructor() {
    this.checkExistingSession();
  }

  startTracking(): void {
    const loginTimestamp = Date.now();
    sessionStorage.setItem(this.STORAGE_KEY, loginTimestamp.toString());
    this.isActive = true;
    this.lastActivityTime = Date.now();
    this.updateState();
    this.startTimer();

    window.addEventListener('mousemove', this.activityListener, { passive: true });
    window.addEventListener('keydown', this.activityListener, { passive: true });
    window.addEventListener('click', this.activityListener, { passive: true });
  }

  stopTracking(): void {
    this.isActive = false;
    this.stopTimer();
    this.stopCountdown();
    sessionStorage.removeItem(this.STORAGE_KEY);
    this.sessionStateSubject.next({
      isLoggedIn: false,
      remainingTimeMs: 0,
      isWarningActive: false,
      countdownSeconds: 0,
    });

    window.removeEventListener('mousemove', this.activityListener);
    window.removeEventListener('keydown', this.activityListener);
    window.removeEventListener('click', this.activityListener);
  }

  extendSession(): void {
    const newTimestamp = Date.now();
    sessionStorage.setItem(this.STORAGE_KEY, newTimestamp.toString());
    this.stopCountdown();
    this.updateState();
  }

  startCountdown(): void {
    this.stopCountdown();

    let remainingSeconds = this.COUNTDOWN_SECONDS;

    const currentState = this.sessionStateSubject.value;
    this.sessionStateSubject.next({
      ...currentState,
      isWarningActive: true,
      countdownSeconds: remainingSeconds,
    });

    this.countdownSubscription = interval(1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        remainingSeconds--;

        const innerState = this.sessionStateSubject.value;
        this.sessionStateSubject.next({
          ...innerState,
          isWarningActive: true,
          countdownSeconds: Math.max(0, remainingSeconds),
        });

        if (remainingSeconds <= 0) {
          this.stopCountdown();
          this.timeoutTriggeredSubject.next();
        }
      });
  }

  private stopCountdown(): void {
    if (this.countdownSubscription) {
      this.countdownSubscription.unsubscribe();
      this.countdownSubscription = null;
    }

    const currentState = this.sessionStateSubject.value;
    this.sessionStateSubject.next({
      ...currentState,
      isWarningActive: false,
      countdownSeconds: 0,
    });
  }

  private checkExistingSession(): void {
    const storedTimestamp = sessionStorage.getItem(this.STORAGE_KEY);
    if (storedTimestamp) {
      const loginTimestamp = parseInt(storedTimestamp, 10);
      const remainingMs = loginTimestamp + this.SESSION_LIFETIME_MS - Date.now();

      if (remainingMs > 0) {
        this.isActive = true;
        this.startTimer();
      } else {
        sessionStorage.removeItem(this.STORAGE_KEY);
      }
    }
  }

  private startTimer(): void {
    this.stopTimer();

    this.timerSubscription = interval(1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateState();
      });
  }

  private stopTimer(): void {
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
      this.timerSubscription = null;
    }
  }

  private updateState(): void {
    const storedTimestamp = sessionStorage.getItem(this.STORAGE_KEY);
    if (!storedTimestamp || !this.isActive) {
      return;
    }

    const loginTimestamp = parseInt(storedTimestamp, 10);
    const remainingMs = loginTimestamp + this.SESSION_LIFETIME_MS - Date.now();

    if (remainingMs <= 0) {
      this.stopTimer();
      this.timeoutTriggeredSubject.next();
      return;
    }

    const isWarningTime = remainingMs <= this.WARNING_THRESHOLD_MS;

    if (isWarningTime && !this.sessionStateSubject.value.isWarningActive) {
      const now = Date.now();
      if (now - this.lastWarningEmit > 1000) {
        this.lastWarningEmit = now;
        this.warningTriggeredSubject.next();
        this.startCountdown();
      }
    }

    this.sessionStateSubject.next({
      isLoggedIn: true,
      remainingTimeMs: Math.max(0, remainingMs),
      isWarningActive: this.sessionStateSubject.value.isWarningActive,
      countdownSeconds: this.sessionStateSubject.value.countdownSeconds,
    });
  }

  formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  getSessionState(): SessionState {
    return this.sessionStateSubject.value;
  }

  isSessionActive(): boolean {
    return this.isActive && this.sessionStateSubject.value.isLoggedIn;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopTimer();
    this.stopCountdown();

    window.removeEventListener('mousemove', this.activityListener);
    window.removeEventListener('keydown', this.activityListener);
    window.removeEventListener('click', this.activityListener);
  }
}
