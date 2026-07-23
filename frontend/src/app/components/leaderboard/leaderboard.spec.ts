import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LeaderboardComponent } from './leaderboard';
import { LeaderboardEntry } from '../../models/types';
import { Api } from '../../services/api';
import { NotificationService } from '../../services/notification.service';
import { of, throwError } from 'rxjs';

describe('LeaderboardComponent', () => {
  let component: LeaderboardComponent;
  let fixture: ComponentFixture<LeaderboardComponent>;
  let getLeaderboardSpy: ReturnType<typeof vi.fn>;
  let mockNotification: Partial<NotificationService>;

  const mockEntries: LeaderboardEntry[] = [
    {
      rank: 1,
      user_id: 1,
      username: 'budi',
      role: 'student',
      total_points: 500,
      achievements_count: 5,
    },
    {
      rank: 2,
      user_id: 2,
      username: 'siti',
      role: 'student',
      total_points: 350,
      achievements_count: 3,
    },
  ];

  function createMockApi() {
    getLeaderboardSpy = vi.fn().mockReturnValue(of([]));
    return {
      currentUser$: of(null),
      getLeaderboard: getLeaderboardSpy as unknown as Api['getLeaderboard'],
    };
  }

  function initComponent(data?: LeaderboardEntry[], skipDetect = false) {
    if (data) {
      getLeaderboardSpy.mockReturnValue(of(data));
    }
    fixture = TestBed.createComponent(LeaderboardComponent);
    component = fixture.componentInstance;
    if (!skipDetect) {
      fixture.detectChanges();
    }
  }

  beforeEach(async () => {
    mockNotification = { error: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [LeaderboardComponent],
      providers: [
        provideRouter([]),
        { provide: Api, useValue: createMockApi() },
        { provide: NotificationService, useValue: mockNotification },
      ],
    }).compileComponents();
  });

  it('should create', () => {
    initComponent(mockEntries);
    expect(component).toBeTruthy();
  });

  it('should show loading state initially', () => {
    initComponent(undefined, true);
    expect(component.loading).toBe(true);
  });

  it('should display entries after loading', () => {
    initComponent(mockEntries);
    const cards = fixture.nativeElement.querySelectorAll('.entry-card');
    expect(cards.length).toBe(2);
  });

  it('should show trophy for rank 1', () => {
    initComponent(mockEntries);
    const trophy = fixture.nativeElement.querySelector('.trophy');
    expect(trophy).toBeTruthy();
    const iconElement = trophy.querySelector('i');
    expect(iconElement).toBeTruthy();
    expect(iconElement.classList.contains('fa-trophy')).toBe(true);
  });

  it('should switch period to weekly', () => {
    initComponent(mockEntries);
    getLeaderboardSpy.mockClear();
    getLeaderboardSpy.mockReturnValue(of(mockEntries));
    component.switchPeriod('weekly');
    expect(getLeaderboardSpy).toHaveBeenCalledWith('weekly');
  });

  it('should switch period to monthly', () => {
    initComponent(mockEntries);
    getLeaderboardSpy.mockClear();
    getLeaderboardSpy.mockReturnValue(of(mockEntries));
    component.switchPeriod('monthly');
    expect(getLeaderboardSpy).toHaveBeenCalledWith('monthly');
  });

  it('should show empty state', () => {
    initComponent();
    expect(fixture.nativeElement.querySelector('.empty-state')).toBeTruthy();
  });

  it('should handle API error gracefully', () => {
    getLeaderboardSpy.mockReturnValue(throwError(() => new Error('fail')));
    initComponent();
    fixture.detectChanges();
    expect(mockNotification.error).toHaveBeenCalled();
  });

  it('should get correct rank icon', () => {
    initComponent();
    expect(component.getRankIcon(1)).toBe('fa-trophy text-yellow-400');
    expect(component.getRankIcon(2)).toBe('fa-trophy text-gray-300');
    expect(component.getRankIcon(3)).toBe('fa-trophy text-amber-600');
    expect(component.getRankIcon(5)).toBe('');
  });

  it('should calculate points width', () => {
    initComponent(mockEntries);
    expect(component.getPointsWidth(mockEntries[0])).toBe(100);
  });

  it('should handle zero max points', () => {
    initComponent(mockEntries);
    component.entries = [
      {
        rank: 1,
        user_id: 1,
        username: 'z',
        role: 'student',
        total_points: 0,
        achievements_count: 0,
      },
    ];
    expect(component.getPointsWidth(component.entries[0])).toBe(2);
  });

  it('should find current user rank', () => {
    const mockApiWithUser = {
      currentUser$: of({ id: 1, username: 'budi', email: '', role: 'student' }),
      getLeaderboard: getLeaderboardSpy as unknown as Api['getLeaderboard'],
    };
    TestBed.overrideProvider(Api, { useValue: mockApiWithUser });
    TestBed.compileComponents();
    initComponent(mockEntries);
    expect(component.currentUserRank?.rank).toBe(1);
  });
});
