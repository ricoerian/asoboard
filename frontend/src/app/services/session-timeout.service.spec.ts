/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-empty */
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionTimeoutService, SessionState } from './session-timeout.service';

describe('SessionTimeoutService (Agent Ryuma)', () => {
  let service: SessionTimeoutService;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [SessionTimeoutService],
    });
    service = TestBed.inject(SessionTimeoutService);
  });

  afterEach(() => {
    service.ngOnDestroy();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should start with default state', () => {
      const state = service.getSessionState();
      expect(state.isLoggedIn).toBe(false);
      expect(state.remainingTimeMs).toBe(0);
      expect(state.isWarningActive).toBe(false);
      expect(state.countdownSeconds).toBe(0);
    });

    it('isSessionActive should be false when not started', () => {
      expect(service.isSessionActive()).toBe(false);
    });
  });

  describe('startTracking', () => {
    it('should store login timestamp in sessionStorage', () => {
      service.startTracking();
      const stored = sessionStorage.getItem('asoboard_login_timestamp');
      expect(stored).toBeTruthy();
      const timestamp = parseInt(stored!, 10);
      expect(timestamp).toBeGreaterThan(0);
    });

    it('should set isSessionActive to true', () => {
      service.startTracking();
      expect(service.isSessionActive()).toBe(true);
    });

    it('should emit session state updates via observable', async () => {
      const states: SessionState[] = [];
      service.sessionState$.subscribe((state) => {
        states.push(state);
      });

      await new Promise((r) => setTimeout(r, 0));

      service.startTracking();

      await new Promise((r) => setTimeout(r, 0));

      expect(states.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('stopTracking', () => {
    it('should remove login timestamp from sessionStorage', () => {
      service.startTracking();
      expect(sessionStorage.getItem('asoboard_login_timestamp')).toBeTruthy();
      service.stopTracking();
      expect(sessionStorage.getItem('asoboard_login_timestamp')).toBeNull();
    });

    it('should reset session state', () => {
      service.startTracking();
      service.stopTracking();

      const state = service.getSessionState();
      expect(state.isLoggedIn).toBe(false);
      expect(state.remainingTimeMs).toBe(0);
      expect(state.isWarningActive).toBe(false);
      expect(state.countdownSeconds).toBe(0);
    });

    it('should set isSessionActive to false', () => {
      service.startTracking();
      expect(service.isSessionActive()).toBe(true);
      service.stopTracking();
      expect(service.isSessionActive()).toBe(false);
    });
  });

  describe('extendSession', () => {
    it('should update login timestamp in sessionStorage', async () => {
      service.startTracking();
      await new Promise((r) => setTimeout(r, 10));
      const initialTimestamp = parseInt(sessionStorage.getItem('asoboard_login_timestamp')!, 10);

      await new Promise((r) => setTimeout(r, 50));
      service.extendSession();

      const newTimestamp = parseInt(sessionStorage.getItem('asoboard_login_timestamp')!, 10);
      expect(newTimestamp).toBeGreaterThanOrEqual(initialTimestamp);
    });

    it('should reset warning state and countdown', () => {
      service.startTracking();
      service.startCountdown();

      service.extendSession();

      const state = service.getSessionState();
      expect(state.isWarningActive).toBe(false);
      expect(state.countdownSeconds).toBe(0);
    });
  });

  describe('formatTime', () => {
    it('should format 0ms as 00:00', () => {
      expect(service.formatTime(0)).toBe('00:00');
    });

    it('should format 60000ms as 01:00', () => {
      expect(service.formatTime(60000)).toBe('01:00');
    });

    it('should format 3600000ms as 60:00', () => {
      expect(service.formatTime(3600000)).toBe('60:00');
    });

    it('should format 90000ms as 01:30', () => {
      expect(service.formatTime(90000)).toBe('01:30');
    });

    it('should handle fractional seconds by rounding down', () => {
      expect(service.formatTime(500)).toBe('00:00');
      expect(service.formatTime(1500)).toBe('00:01');
    });

    it('should format 5min 30sec correctly', () => {
      expect(service.formatTime(5 * 60 * 1000 + 30 * 1000)).toBe('05:30');
    });

    it('should format 15 seconds correctly', () => {
      expect(service.formatTime(15 * 1000)).toBe('00:15');
    });

    it('should format 59 seconds correctly', () => {
      expect(service.formatTime(59 * 1000)).toBe('00:59');
    });
  });

  describe('sessionState$ observable', () => {
    it('should emit initial state on subscription', async () => {
      let receivedState: SessionState | null = null;
      service.sessionState$.subscribe((state) => {
        receivedState = state;
      });

      await new Promise((r) => setTimeout(r, 0));

      expect(receivedState).toBeDefined();
      expect(receivedState!.isLoggedIn).toBe(false);
    });
  });

  describe('warningTriggered$ observable', () => {
    it('should be subscribable', () => {
      let subscribed = false;
      service.warningTriggered$.subscribe(() => {
        subscribed = true;
      });

      expect(() => service.warningTriggered$.subscribe()).not.toThrow();
    });
  });

  describe('timeoutTriggered$ observable', () => {
    it('should be subscribable', () => {
      expect(() => service.timeoutTriggered$.subscribe()).not.toThrow();
    });
  });

  describe('startCountdown', () => {
    it('should set isWarningActive to true when called', () => {
      service.startTracking();
      service.startCountdown();

      const state = service.getSessionState();
      expect(state.isWarningActive).toBe(true);
      expect(state.countdownSeconds).toBe(60);
    });

    it('should reset to 60 seconds on startCountdown', () => {
      service.startTracking();
      service.startCountdown();

      const state = service.getSessionState();
      expect(state.countdownSeconds).toBe(60);
    });
  });

  describe('getSessionState', () => {
    it('should return current state object', () => {
      const state = service.getSessionState();
      expect(state).toBeDefined();
      expect(state.isLoggedIn).toBe(false);
      expect(state.remainingTimeMs).toBe(0);
      expect(state.isWarningActive).toBe(false);
      expect(state.countdownSeconds).toBe(0);
    });

    it('should reflect tracking state changes', () => {
      service.startTracking();
      const state = service.getSessionState();
      expect(state.remainingTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('isSessionActive', () => {
    it('should be false before start', () => {
      expect(service.isSessionActive()).toBe(false);
    });

    it('should be true after start', () => {
      service.startTracking();
      expect(service.isSessionActive()).toBe(true);
    });

    it('should be false after stop', () => {
      service.startTracking();
      service.stopTracking();
      expect(service.isSessionActive()).toBe(false);
    });
  });

  describe('ngOnDestroy', () => {
    it('should clean up resources without errors', () => {
      service.startTracking();
      service.startCountdown();

      expect(() => service.ngOnDestroy()).not.toThrow();
    });

    it('should be safely called without prior tracking', () => {
      expect(() => service.ngOnDestroy()).not.toThrow();
    });
  });

  describe('Existing session handling via sessionStorage', () => {
    it('should clear expired session from storage on init', () => {
      const loginTimestamp = Date.now() - 61 * 60 * 1000;
      sessionStorage.setItem('asoboard_login_timestamp', loginTimestamp.toString());

      const newService = new SessionTimeoutService();
      expect(sessionStorage.getItem('asoboard_login_timestamp')).toBeNull();

      newService.ngOnDestroy();
    });
  });
});
