import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import {
  AchievementService,
  Achievement,
  UserAchievement,
  CheckAchievementsResponse,
} from './achievement.service';

describe('AchievementService (Agent Ryan)', () => {
  let service: AchievementService;
  let httpMock: HttpTestingController;
  const baseUrl = 'http://localhost:8000/api';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AchievementService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AchievementService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('checkAndAward', () => {
    it('should POST to check-achievements', () => {
      const mockResponse: CheckAchievementsResponse = { new_achievements: [] };

      service.checkAndAward().subscribe((res) => {
        expect(res).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${baseUrl}/check-achievements/`);
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });

    it('should emit new achievements on success', () => {
      const mockAchievement: Achievement = {
        id: 1,
        name: 'Test Badge',
        description: 'Earned!',
        icon: '🏆',
        category: 'sessions',
        requirement_value: 1,
        requirement_type: 'sessions_completed',
        points: 10,
        is_active: true,
      };
      let emitted: Achievement[] = [];

      service.newAchievements$.subscribe((achievements) => {
        emitted = achievements;
      });

      service.checkAndAward().subscribe();

      const req = httpMock.expectOne(`${baseUrl}/check-achievements/`);
      req.flush({ new_achievements: [mockAchievement] });

      expect(emitted.length).toBe(1);
      expect(emitted[0].name).toBe('Test Badge');
    });

    it('should emit empty when no new achievements', () => {
      let emitted: Achievement[] | undefined;

      service.newAchievements$.subscribe((achievements) => {
        emitted = achievements;
      });

      service.checkAndAward().subscribe();

      const req = httpMock.expectOne(`${baseUrl}/check-achievements/`);
      req.flush({ new_achievements: [] });

      expect(emitted).toEqual([]);
    });
  });

  describe('getUserAchievements', () => {
    it('should GET user-achievements', () => {
      const mockUA: UserAchievement[] = [
        {
          id: 1,
          achievement: {
            id: 1,
            name: 'Test',
            description: 'D',
            icon: '★',
            category: 'sessions',
            requirement_value: 1,
            requirement_type: 'sessions_completed',
            points: 10,
            is_active: true,
          },
          earned_at: '2026-07-01T00:00:00Z',
        },
      ];

      service.getUserAchievements().subscribe((data) => {
        expect(data.length).toBe(1);
        expect(data[0].achievement.name).toBe('Test');
      });

      const req = httpMock.expectOne(`${baseUrl}/user-achievements/`);
      expect(req.request.method).toBe('GET');
      req.flush(mockUA);
    });

    it('should handle empty user achievements', () => {
      service.getUserAchievements().subscribe((data) => {
        expect(data.length).toBe(0);
      });

      const req = httpMock.expectOne(`${baseUrl}/user-achievements/`);
      req.flush([]);
    });
  });

  describe('getAllAchievements', () => {
    it('should GET achievements', () => {
      const mockAchievements: Achievement[] = [
        {
          id: 1,
          name: 'A1',
          description: 'D1',
          icon: '★',
          category: 'sessions',
          requirement_value: 1,
          requirement_type: 'sessions_completed',
          points: 10,
          is_active: true,
        },
        {
          id: 2,
          name: 'A2',
          description: 'D2',
          icon: '●',
          category: 'games',
          requirement_value: 5,
          requirement_type: 'games_played',
          points: 25,
          is_active: false,
        },
      ];

      service.getAllAchievements().subscribe((data) => {
        expect(data.length).toBe(2);
        expect(data[0].name).toBe('A1');
      });

      const req = httpMock.expectOne(`${baseUrl}/achievements/`);
      expect(req.request.method).toBe('GET');
      req.flush(mockAchievements);
    });
  });

  describe('newAchievements$', () => {
    it('should emit empty array initially', () => {
      let initial: Achievement[] | undefined;
      service.newAchievements$.subscribe((val) => {
        initial = val;
      });
      expect(initial).toEqual([]);
    });
  });
});
