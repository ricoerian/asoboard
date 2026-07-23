/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-empty */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AchievementNotificationComponent } from './achievement-notification.component';
import { AchievementService, Achievement } from '../../services/achievement.service';
import { ReplaySubject, of } from 'rxjs';
import { vi } from 'vitest';

describe('AchievementNotificationComponent (Agent Ryan)', () => {
  let component: AchievementNotificationComponent;
  let fixture: ComponentFixture<AchievementNotificationComponent>;
  let newAchievementsSubject: ReplaySubject<Achievement[]>;

  const mockAchievement: Achievement = {
    id: 1,
    name: 'First Steps',
    description: 'Complete 1 session',
    icon: '🎯',
    category: 'sessions',
    requirement_value: 1,
    requirement_type: 'sessions_completed',
    points: 10,
    is_active: true,
  };

  beforeEach(async () => {
    newAchievementsSubject = new ReplaySubject<Achievement[]>(1);

    await TestBed.configureTestingModule({
      imports: [AchievementNotificationComponent],
      providers: [
        {
          provide: AchievementService,
          useValue: {
            newAchievements$: newAchievementsSubject.asObservable(),
            checkAndAward: vi.fn(),
            getUserAchievements: vi.fn(),
            getAllAchievements: vi.fn(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AchievementNotificationComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should show no notifications initially', () => {
    fixture.detectChanges();
    expect(component.notifications.length).toBe(0);
  });

  it('should show notification when new achievement emitted', () => {
    component.showNotification(mockAchievement);
    fixture.detectChanges();

    expect(component.notifications.length).toBe(1);
    expect(component.notifications[0].achievement.name).toBe('First Steps');
  });

  it('should display achievement name and points', () => {
    component.showNotification(mockAchievement);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('First Steps');
    expect(el.textContent).toContain('+10 points');
  });

  it('should display achievement icon via FA', () => {
    component.showNotification(mockAchievement);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.icon')?.textContent?.trim()).toBe('🎯');
  });

  it('should show Achievement Unlocked header', () => {
    component.showNotification(mockAchievement);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Achievement Unlocked!');
  });

  it('should handle multiple achievements in one emit', () => {
    const second: Achievement = {
      id: 2,
      name: 'Game On!',
      description: 'Play 1 game',
      icon: '🎮',
      category: 'games',
      requirement_value: 1,
      requirement_type: 'games_played',
      points: 10,
      is_active: true,
    };
    component.showNotification(mockAchievement);
    component.showNotification(second);
    fixture.detectChanges();

    expect(component.notifications.length).toBe(2);
  });

  it('should remove notification after 5 seconds', () => {
    vi.useFakeTimers();
    component.showNotification(mockAchievement);
    fixture.detectChanges();
    expect(component.notifications.length).toBe(1);

    vi.advanceTimersByTime(5000);
    fixture.detectChanges();
    expect(component.notifications.length).toBe(0);
    vi.useRealTimers();
  });

  it('should keep newer notifications', () => {
    vi.useFakeTimers();
    component.showNotification(mockAchievement);

    vi.advanceTimersByTime(3000);

    const newer: Achievement = { ...mockAchievement, id: 2, name: 'Second Win' };
    component.showNotification(newer);
    expect(component.notifications.length).toBe(2);

    vi.advanceTimersByTime(3000);
    expect(component.notifications.length).toBe(1);
    vi.useRealTimers();
  });

  it('should emit empty without showing notification', () => {
    fixture.detectChanges();
    newAchievementsSubject.next([]);
    fixture.detectChanges();
    expect(component.notifications.length).toBe(0);
  });
});
