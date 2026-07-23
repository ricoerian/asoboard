/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-empty */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionTimeoutWarningComponent } from './session-timeout-warning';
import { SessionTimeoutService, SessionState } from '../../../services/session-timeout.service';
import { Api } from '../../../services/api';
import { NotificationService } from '../../../services/notification.service';

describe('SessionTimeoutWarningComponent (Agent Ryuma)', () => {
  let component: SessionTimeoutWarningComponent;
  let fixture: ComponentFixture<SessionTimeoutWarningComponent>;
  let warningTriggeredSubject: Subject<void>;
  let timeoutTriggeredSubject: Subject<void>;
  let sessionStateSubject: Subject<SessionState>;
  let sessionTimeoutService: any;
  let apiService: any;
  let router: any;
  let notificationService: any;

  beforeEach(async () => {
    warningTriggeredSubject = new Subject<void>();
    timeoutTriggeredSubject = new Subject<void>();
    sessionStateSubject = new Subject<SessionState>();

    sessionTimeoutService = {
      formatTime: vi.fn((ms: number) => {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }),
      getSessionState: vi.fn(() => ({
        isLoggedIn: true,
        remainingTimeMs: 300000,
        isWarningActive: false,
        countdownSeconds: 0,
      })),
      extendSession: vi.fn(),
      stopTracking: vi.fn(),
      warningTriggered$: warningTriggeredSubject.asObservable(),
      timeoutTriggered$: timeoutTriggeredSubject.asObservable(),
      sessionState$: sessionStateSubject.asObservable(),
    };

    apiService = {
      checkAuthStatus: vi.fn(),
      logout: vi.fn(),
    };

    router = {
      navigate: vi.fn(),
    };

    notificationService = {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [SessionTimeoutWarningComponent],
      providers: [
        { provide: SessionTimeoutService, useValue: sessionTimeoutService },
        { provide: Api, useValue: apiService },
        { provide: Router, useValue: router },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SessionTimeoutWarningComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    warningTriggeredSubject.complete();
    timeoutTriggeredSubject.complete();
    sessionStateSubject.complete();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Modal Visibility', () => {
    it('should not be visible initially', () => {
      expect(component.isVisible).toBe(false);
    });

    it('should show modal when warning is triggered', () => {
      warningTriggeredSubject.next();
      fixture.detectChanges();
      expect(component.isVisible).toBe(true);
    });

    it('should hide modal when closed', () => {
      warningTriggeredSubject.next();
      fixture.detectChanges();
      expect(component.isVisible).toBe(true);

      component.closeWarning();
      expect(component.isVisible).toBe(false);
    });

    it('should render modal in DOM when visible', () => {
      warningTriggeredSubject.next();
      fixture.detectChanges();

      const modalElement = fixture.nativeElement.querySelector('.session-timeout-modal');
      expect(modalElement).toBeTruthy();
    });

    it('should not render modal when not visible', () => {
      fixture.detectChanges();

      const modalElement = fixture.nativeElement.querySelector('.session-timeout-modal');
      expect(modalElement).toBeNull();
    });
  });

  describe('Stay Logged In Action', () => {
    beforeEach(() => {
      warningTriggeredSubject.next();
      fixture.detectChanges();
    });

    it('should call checkAuthStatus and extendSession', () => {
      apiService.checkAuthStatus.mockReturnValue(
        of({
          id: 1,
          username: 'test',
          email: 'test@test.com',
          role: 'student',
        }),
      );

      component.onStayLoggedIn();

      expect(apiService.checkAuthStatus).toHaveBeenCalled();
      expect(sessionTimeoutService.extendSession).toHaveBeenCalled();
    });

    it('should show success notification', () => {
      apiService.checkAuthStatus.mockReturnValue(
        of({
          id: 1,
          username: 'test',
          email: 'test@test.com',
          role: 'student',
        }),
      );

      component.onStayLoggedIn();

      expect(notificationService.success).toHaveBeenCalledWith(
        expect.stringContaining('Session extended'),
      );
    });

    it('should close modal after stay logged in', () => {
      apiService.checkAuthStatus.mockReturnValue(
        of({ id: 1, username: 'test', email: '', role: 'student' }),
      );
      component.onStayLoggedIn();
      expect(component.isVisible).toBe(false);
    });

    it('should handle extend failure by logging out', () => {
      apiService.checkAuthStatus.mockReturnValue(throwError(() => new Error('Network error')));
      apiService.logout.mockReturnValue(of({}));

      component.onStayLoggedIn();

      expect(notificationService.error).toHaveBeenCalled();
      expect(apiService.logout).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('Logout Action', () => {
    it('should call logout API and redirect', () => {
      apiService.logout.mockReturnValue(of({}));

      warningTriggeredSubject.next();
      fixture.detectChanges();

      component.onLogout();

      expect(apiService.logout).toHaveBeenCalled();
      expect(sessionTimeoutService.stopTracking).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('should close modal on logout', () => {
      apiService.logout.mockReturnValue(of({}));
      warningTriggeredSubject.next();
      fixture.detectChanges();
      expect(component.isVisible).toBe(true);

      component.onLogout();
      expect(component.isVisible).toBe(false);
    });

    it('should redirect even if logout API fails', () => {
      apiService.logout.mockReturnValue(throwError(() => new Error('Logout failed')));

      component.onLogout();

      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('Timeout Handling', () => {
    it('should auto-logout when timeout triggered', () => {
      apiService.logout.mockReturnValue(of({}));

      timeoutTriggeredSubject.next();

      expect(notificationService.error).toHaveBeenCalledWith(expect.stringContaining('expired'));
      expect(apiService.logout).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('should close modal before handling timeout', () => {
      apiService.logout.mockReturnValue(of({}));

      warningTriggeredSubject.next();
      fixture.detectChanges();
      expect(component.isVisible).toBe(true);

      timeoutTriggeredSubject.next();
      expect(component.isVisible).toBe(false);
    });
  });

  describe('Session State Subscription', () => {
    it('should update session state when state changes', () => {
      const newState: SessionState = {
        isLoggedIn: true,
        remainingTimeMs: 299000,
        isWarningActive: true,
        countdownSeconds: 59,
      };

      sessionStateSubject.next(newState);

      expect(component.sessionState).toEqual(newState);
    });

    it('should format time when warning is active', () => {
      const newState: SessionState = {
        isLoggedIn: true,
        remainingTimeMs: 299000,
        isWarningActive: true,
        countdownSeconds: 59,
      };

      sessionStateSubject.next(newState);

      expect(sessionTimeoutService.formatTime).toHaveBeenCalledWith(299000);
    });
  });

  describe('Existing Warning State on Init', () => {
    it('should show modal if warning already active', () => {
      sessionTimeoutService.getSessionState.mockReturnValue({
        isLoggedIn: true,
        remainingTimeMs: 300000,
        isWarningActive: true,
        countdownSeconds: 60,
      });

      const newFixture = TestBed.createComponent(SessionTimeoutWarningComponent);
      const newComponent = newFixture.componentInstance;
      newFixture.detectChanges();

      expect(newComponent.isVisible).toBe(true);
    });

    it('should not show modal if warning not active', () => {
      sessionTimeoutService.getSessionState.mockReturnValue({
        isLoggedIn: true,
        remainingTimeMs: 300000,
        isWarningActive: false,
        countdownSeconds: 0,
      });

      const newFixture = TestBed.createComponent(SessionTimeoutWarningComponent);
      const newComponent = newFixture.componentInstance;
      newFixture.detectChanges();

      expect(newComponent.isVisible).toBe(false);
    });
  });

  describe('Template Rendering', () => {
    it('should render Stay Logged In button', () => {
      warningTriggeredSubject.next();
      fixture.detectChanges();

      const buttons = fixture.nativeElement.querySelectorAll('button');
      const stayButton = Array.from(buttons).find((btn: any) =>
        btn.textContent.includes('Stay Logged In'),
      );
      expect(stayButton).toBeTruthy();
    });

    it('should render Logout button', () => {
      warningTriggeredSubject.next();
      fixture.detectChanges();

      const buttons = fixture.nativeElement.querySelectorAll('button');
      const logoutButton = Array.from(buttons).find((btn: any) =>
        btn.textContent.includes('Logout'),
      );
      expect(logoutButton).toBeTruthy();
    });

    it('should show EXPIRED text when countdown is 0', () => {
      warningTriggeredSubject.next();
      fixture.detectChanges();

      const newState: SessionState = {
        isLoggedIn: true,
        remainingTimeMs: 0,
        isWarningActive: true,
        countdownSeconds: 0,
      };

      sessionStateSubject.next(newState);
      fixture.detectChanges();

      const expiredElement = fixture.nativeElement.querySelector('.countdown-expired');
      expect(expiredElement).toBeTruthy();
      expect(expiredElement.textContent).toContain('EXPIRED');
    });

    it('should display countdown number when active', () => {
      warningTriggeredSubject.next();
      fixture.detectChanges();

      const newState: SessionState = {
        isLoggedIn: true,
        remainingTimeMs: 300000,
        isWarningActive: true,
        countdownSeconds: 45,
      };

      sessionStateSubject.next(newState);
      fixture.detectChanges();

      const countdownElement = fixture.nativeElement.querySelector('.countdown-number');
      expect(countdownElement).toBeTruthy();
      expect(countdownElement.textContent).toContain('45');
    });
  });

  describe('ngOnDestroy', () => {
    it('should clean up subscriptions', () => {
      component.ngOnDestroy();
      expect(() => {
        warningTriggeredSubject.next();
        timeoutTriggeredSubject.next();
      }).not.toThrow();
    });
  });
});
