import { TestBed } from '@angular/core/testing';
import { GameContainerComponent } from './game-container';
import { Session, User } from '../../../models/types';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('Memory Matching Game (Agent Justin)', () => {
  let component: GameContainerComponent;
  const student: User = {
    id: 1,
    username: 'student1',
    email: 's@t.com',
    role: 'student',
  };
  const mentor: User = {
    id: 2,
    username: 'mentor1',
    email: 'm@t.com',
    role: 'mentor',
  };

  function memorySession(config: Record<string, unknown> = {}): Session {
    return {
      id: 1,
      title: 'Memory',
      mode: 'game',
      game_type: 'memory',
      game_config: config,
    };
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [GameContainerComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    vi.useFakeTimers();
    const fixture = TestBed.createComponent(GameContainerComponent);
    component = fixture.componentInstance;
    component.session = memorySession();
    component.currentUser = student;
    component.studentEvents = [];
  });

  afterEach(() => {
    component.stopMemoryTimer();
    vi.useRealTimers();
  });

  describe('Initialization (Agent Justin)', () => {
    it('should default memory state', () => {
      component.session = memorySession();
      component.currentUser = student;
      component.studentEvents = [];
      component.ngOnInit();
      expect(component.memoryAttempts).toBe(0);
      expect(component.memoryMatchedPairIds).toEqual([]);
      expect(component.memoryFlippedCards).toEqual([]);
      expect(component.memoryTimer).toBe(0);
      expect(component.memoryTimerStarted).toBe(false);
      expect(component.memoryScore).toBe(0);
      expect(component.memoryCelebrating).toBe(false);
    });

    it('should load mentor pairs from config', () => {
      const pairs = [
        { label: 'Apple', emoji: '🍎' },
        { label: 'Banana', emoji: '🍌' },
      ];
      component.session = memorySession({ pairs });
      component.currentUser = mentor;
      component.studentEvents = [];
      component.ngOnInit();

      expect(component.memoryPairs).toEqual(pairs);
      expect(component.memoryPairsText).toBe('Apple, Banana');
    });

    it('should load student shuffled cards from config', () => {
      const cards = [
        { id: 0, pairId: 0, label: 'A', emoji: '🍎' },
        { id: 1, pairId: 0, label: 'A', emoji: '🍎' },
      ];
      component.session = memorySession({ shuffledCards: cards });
      component.currentUser = student;
      component.studentEvents = [];
      component.ngOnInit();
      expect(component.memoryShuffledCards).toEqual(cards);
    });

    it('should detect mentor vs student role', () => {
      component.session = memorySession();
      component.currentUser = mentor;
      component.studentEvents = [];
      component.ngOnInit();
      expect(component.isMentor).toBe(true);

      component.currentUser = student;
      expect(component.isMentor).toBe(false);
    });
  });

  describe('Card flipping (Agent Justin)', () => {
    const cards = [
      { id: 0, pairId: 0, label: 'A', emoji: '🍎' },
      { id: 1, pairId: 0, label: 'A', emoji: '🍎' },
      { id: 2, pairId: 1, label: 'B', emoji: '🍌' },
      { id: 3, pairId: 1, label: 'B', emoji: '🍌' },
    ];

    beforeEach(() => {
      component.session = memorySession({ shuffledCards: cards });
      component.currentUser = student;
      component.studentEvents = [];
      component.ngOnInit();
    });

    it('should flip a card', () => {
      component.flipMemoryCard(0);
      expect(component.memoryFlippedCards).toContain(0);
    });

    it('should start timer on first flip', () => {
      component.flipMemoryCard(0);
      expect(component.memoryTimerStarted).toBe(true);
    });

    it('should not flip same card twice', () => {
      component.flipMemoryCard(0);
      component.flipMemoryCard(0);
      expect(component.memoryFlippedCards.length).toBe(1);
    });

    it('should not flip matched card', () => {
      component.memoryMatchedPairIds = [0];
      component.flipMemoryCard(0);
      component.flipMemoryCard(1);
      expect(component.memoryFlippedCards.length).toBe(0);
    });

    it('should not flip when locked', () => {
      component.memoryLock = true;
      component.flipMemoryCard(0);
      expect(component.memoryFlippedCards.length).toBe(0);
    });

    it('should not flip when already answered', () => {
      component.hasStudentAnswered = true;
      component.flipMemoryCard(0);
      expect(component.memoryFlippedCards.length).toBe(0);
    });
  });

  describe('Match and mismatch (Agent Justin)', () => {
    const cards = [
      { id: 0, pairId: 0, label: 'A', emoji: '🍎' },
      { id: 1, pairId: 0, label: 'A', emoji: '🍎' },
      { id: 2, pairId: 1, label: 'B', emoji: '🍌' },
      { id: 3, pairId: 1, label: 'B', emoji: '🍌' },
    ];

    beforeEach(() => {
      component.session = memorySession({ shuffledCards: cards });
      component.currentUser = student;
      component.studentEvents = [];
      component.ngOnInit();
    });

    it('should match pair and increment matched list', () => {
      component.flipMemoryCard(0);
      component.flipMemoryCard(1);
      expect(component.memoryMatchedPairIds).toContain(0);
      expect(component.memoryFlippedCards.length).toBe(0);
      expect(component.memoryLock).toBe(false);
      expect(component.memoryAttempts).toBe(1);
    });

    it('should lock on mismatch then unlock after 800ms', () => {
      component.flipMemoryCard(0);
      component.flipMemoryCard(2);
      expect(component.memoryLock).toBe(true);
      expect(component.memoryFlippedCards.length).toBe(2);

      vi.advanceTimersByTime(900);
      expect(component.memoryLock).toBe(false);
      expect(component.memoryFlippedCards.length).toBe(0);
    });
  });

  describe('Completion and celebration (Agent Justin)', () => {
    it('should celebrate when all pairs matched', () => {
      const cards = [
        { id: 0, pairId: 0, label: 'A', emoji: '🍎' },
        { id: 1, pairId: 0, label: 'A', emoji: '🍎' },
      ];
      component.session = memorySession({ shuffledCards: cards });
      component.currentUser = student;
      component.studentEvents = [];
      component.ngOnInit();

      component.flipMemoryCard(0);
      component.flipMemoryCard(1);

      expect(component.memoryCelebrating).toBe(true);
      expect(component.memoryScore).toBeGreaterThan(0);

      vi.advanceTimersByTime(3000);
      expect(component.memoryCelebrating).toBe(false);
    });

    it('should stop timer on completion', () => {
      const cards = [
        { id: 0, pairId: 0, label: 'A', emoji: '🍎' },
        { id: 1, pairId: 0, label: 'A', emoji: '🍎' },
      ];
      component.session = memorySession({ shuffledCards: cards });
      component.currentUser = student;
      component.studentEvents = [];
      component.ngOnInit();

      component.flipMemoryCard(0);
      component.flipMemoryCard(1);

      expect(component.memoryTimerInterval).toBeNull();
    });
  });

  describe('Score calculation (Agent Justin)', () => {
    it('should reward perfect play', () => {
      const score = component.calculateMemoryScore(4, 4, 30);
      expect(score).toBe(840);
    });

    it('should penalize extra attempts', () => {
      const perfect = component.calculateMemoryScore(4, 4, 30);
      const extra = component.calculateMemoryScore(4, 8, 30);
      expect(perfect).toBeGreaterThan(extra);
    });

    it('should reward faster time', () => {
      const slow = component.calculateMemoryScore(4, 4, 100);
      const fast = component.calculateMemoryScore(4, 4, 10);
      expect(fast).toBeGreaterThan(slow);
    });

    it('should never return less than 10', () => {
      expect(component.calculateMemoryScore(1, 100, 500)).toBeGreaterThanOrEqual(10);
    });
  });

  describe('Timer (Agent Justin)', () => {
    it('should start and advance timer', () => {
      component.startMemoryTimer();
      expect(component.memoryTimerStarted).toBe(true);
      vi.advanceTimersByTime(3000);
      expect(component.memoryTimer).toBe(3);
    });

    it('should not start twice', () => {
      component.startMemoryTimer();
      const id = component.memoryTimerInterval;
      component.startMemoryTimer();
      expect(component.memoryTimerInterval).toBe(id);
    });

    it('should stop and clear interval', () => {
      component.startMemoryTimer();
      component.stopMemoryTimer();
      expect(component.memoryTimerInterval).toBeNull();
    });

    it('should format time as MM:SS', () => {
      component.memoryTimer = 0;
      expect(component.memoryFormattedTime).toBe('00:00');
      component.memoryTimer = 65;
      expect(component.memoryFormattedTime).toBe('01:05');
      component.memoryTimer = 3661;
      expect(component.memoryFormattedTime).toBe('61:01');
    });
  });

  describe('Card state helpers (Agent Justin)', () => {
    const cards = [
      { id: 0, pairId: 0, label: 'A', emoji: '🍎' },
      { id: 1, pairId: 0, label: 'A', emoji: '🍎' },
      { id: 2, pairId: 1, label: 'B', emoji: '🍌' },
    ];

    beforeEach(() => {
      component.session = memorySession({ shuffledCards: cards });
      component.currentUser = student;
      component.studentEvents = [];
      component.ngOnInit();
    });

    it('isMemoryCardFlipped returns true for flipped', () => {
      component.memoryFlippedCards = [0];
      expect(component.isMemoryCardFlipped(0)).toBe(true);
      expect(component.isMemoryCardFlipped(2)).toBe(false);
    });

    it('isMemoryCardFlipped returns true for matched', () => {
      component.memoryMatchedPairIds = [0];
      expect(component.isMemoryCardFlipped(0)).toBe(true);
      expect(component.isMemoryCardFlipped(1)).toBe(true);
    });

    it('isMemoryCardMatched checks pairId', () => {
      component.memoryMatchedPairIds = [0];
      expect(component.isMemoryCardMatched(0)).toBe(true);
      expect(component.isMemoryCardMatched(2)).toBe(false);
    });
  });

  describe('Mentor pair management (Agent Justin)', () => {
    beforeEach(() => {
      component.session = memorySession({
        pairs: [
          { label: 'Apple', emoji: '🍎' },
          { label: 'Banana', emoji: '🍌' },
        ],
      });
      component.currentUser = mentor;
      component.studentEvents = [];
      component.ngOnInit();
    });

    it('addMemoryPair appends with emoji', () => {
      const before = component.memoryPairs.length;
      component.addMemoryPair();
      expect(component.memoryPairs.length).toBe(before + 1);
      expect(component.memoryPairs[before].icon).toBeTruthy();
    });

    it('removeMemoryPair removes by index', () => {
      component.removeMemoryPair(0);
      expect(component.memoryPairs[0].label).toBe('Banana');
    });

    it('autoFillMemoryPairs parses CSV text', () => {
      component.memoryPairsText = 'Cat, Dog, Fish';
      component.autoFillMemoryPairs();
      expect(component.memoryPairs.length).toBe(3);
      expect(component.memoryPairs[0].label).toBe('Cat');
      expect(component.memoryPairs[2].label).toBe('Fish');
    });
  });

  describe('Icon palette (Agent Alpha)', () => {
    it('has >= 20 icons', () => {
      expect(component.memoryIconPalette.length).toBeGreaterThanOrEqual(20);
    });

    it('has unique icons', () => {
      const u = new Set(component.memoryIconPalette);
      expect(u.size).toBe(component.memoryIconPalette.length);
    });
  });

  describe('Sound (Agent Justin)', () => {
    it('playMemorySound does not throw', () => {
      expect(() => component.playMemorySound('flip')).not.toThrow();
      expect(() => component.playMemorySound('match')).not.toThrow();
      expect(() => component.playMemorySound('mismatch')).not.toThrow();
      expect(() => component.playMemorySound('complete')).not.toThrow();
    });
  });

  describe('Cleanup (Agent Justin)', () => {
    it('clears timer on destroy', () => {
      component.startMemoryTimer();
      component.ngOnDestroy();
      expect(component.memoryTimerInterval).toBeNull();
    });
  });
});
