import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AchievementListComponent } from './achievement-list.component';
import {
  AchievementService,
  Achievement,
  UserAchievement,
} from '../../services/achievement.service';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

describe('AchievementListComponent (Agent Ryan)', () => {
  let component: AchievementListComponent;
  let fixture: ComponentFixture<AchievementListComponent>;
  let getAllSpy: ReturnType<typeof vi.fn>;
  let getUserSpy: ReturnType<typeof vi.fn>;

  const mockAllAchievements: Achievement[] = [
    {
      id: 1,
      name: 'First Steps',
      description: 'Complete 1 session',
      icon: '🎯',
      category: 'sessions',
      requirement_value: 1,
      requirement_type: 'sessions_completed',
      points: 10,
      is_active: true,
    },
    {
      id: 2,
      name: 'Game On!',
      description: 'Play 1 game',
      icon: '🎮',
      category: 'games',
      requirement_value: 1,
      requirement_type: 'games_played',
      points: 10,
      is_active: true,
    },
    {
      id: 3,
      name: 'Dear Diary',
      description: 'Create diary',
      icon: '📔',
      category: 'diaries',
      requirement_value: 1,
      requirement_type: 'diaries_created',
      points: 10,
      is_active: true,
    },
  ];

  const mockUserAchievements: UserAchievement[] = [
    { id: 1, achievement: mockAllAchievements[0], earned_at: '2026-07-01T00:00:00Z' },
  ];

  beforeEach(async () => {
    getAllSpy = vi.fn().mockReturnValue(of(mockAllAchievements));
    getUserSpy = vi.fn().mockReturnValue(of(mockUserAchievements));

    await TestBed.configureTestingModule({
      imports: [AchievementListComponent],
      providers: [
        {
          provide: AchievementService,
          useValue: {
            getAllAchievements: getAllSpy,
            getUserAchievements: getUserSpy,
            newAchievements$: of([]),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AchievementListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show loading initially', () => {
    expect(component.loading).toBe(true);
  });

  it('should load all achievements on init', () => {
    fixture.detectChanges();
    expect(component.allAchievements.length).toBe(3);
    expect(component.loading).toBe(false);
  });

  it('should display achievement cards', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('.achievement-card').length).toBe(3);
  });

  it('should mark earned achievements', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const earnedCards = el.querySelectorAll('.achievement-card.earned');
    expect(earnedCards.length).toBe(1);
  });

  it('should mark locked achievements', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const lockedCards = el.querySelectorAll('.achievement-card.locked');
    expect(lockedCards.length).toBe(2);
  });

  it('should compute earnedCount', () => {
    fixture.detectChanges();
    expect(component.earnedCount).toBe(1);
  });

  it('should compute totalPoints', () => {
    fixture.detectChanges();
    expect(component.totalPoints).toBe(10);
  });

  it('should show earned count in stats', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const statValues = el.querySelectorAll('.stat-value');
    expect(statValues[0].textContent).toContain('1');
  });

  it('should show empty state when no achievements', () => {
    getAllSpy.mockReturnValue(of([]));
    getUserSpy.mockReturnValue(of([]));
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('No achievements available yet');
  });

  it('should render achievement name and description', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('First Steps');
    expect(el.textContent).toContain('Complete 1 session');
  });

  it('should show points value on each card', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('+10 pts');
  });

  it('should show Earned badge for earned achievements', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Earned');
  });

  it('should show Locked badge for locked achievements', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Locked');
  });

  it('should handle API error gracefully', () => {
    getAllSpy.mockReturnValue(throwError(() => new Error('fail')));
    fixture.detectChanges();
    expect(component.loading).toBe(false);
    expect(component.allAchievements.length).toBe(0);
  });

  it('should display category labels', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('sessions');
    expect(el.textContent).toContain('diaries');
  });
});
