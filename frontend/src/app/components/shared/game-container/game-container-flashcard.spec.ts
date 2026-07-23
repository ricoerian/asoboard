import { TestBed } from '@angular/core/testing';
import { GameContainerComponent } from './game-container';
import { Session, User } from '../../../models/types';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach } from 'vitest';

describe('Flashcard Game (Agent Ahmad)', () => {
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

  function flashcardSession(config: Record<string, unknown> = {}): Session {
    return {
      id: 1,
      title: 'Flashcard',
      mode: 'game',
      game_type: 'flashcard',
      game_config: config,
    };
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GameContainerComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    const fixture = TestBed.createComponent(GameContainerComponent);
    component = fixture.componentInstance;
  });

  describe('mentor builder', () => {
    it('should load question from config', () => {
      component.currentUser = mentor;
      component.session = flashcardSession({
        question: 'What is 5+3?',
        answer: '8',
      });
      component.ngOnInit();
      expect(component.flashcardQuestion).toBe('What is 5+3?');
      expect(component.flashcardAnswer).toBe('8');
    });

    it('should default question to empty string', () => {
      component.currentUser = mentor;
      component.session = flashcardSession({});
      component.ngOnInit();
      expect(component.flashcardQuestion).toBe('');
      expect(component.flashcardAnswer).toBe('');
    });
  });

  describe('student player', () => {
    it('should load question but not answer', () => {
      component.currentUser = student;
      component.session = flashcardSession({
        question: 'Capital of Japan?',
        answer: 'Tokyo',
      });
      component.ngOnInit();
      expect(component.flashcardQuestion).toBe('Capital of Japan?');
      expect(component.flashcardAnswer).toBe('');
    });

    it('should start with card not flipped', () => {
      component.currentUser = student;
      component.session = flashcardSession({
        question: 'Test?',
        answer: 'Test',
      });
      component.ngOnInit();
      expect(component.flashcardFlipped).toBe(false);
    });

    it('should flip card', () => {
      component.currentUser = student;
      component.session = flashcardSession({
        question: 'Q?',
        answer: 'A',
      });
      component.ngOnInit();
      component.flipFlashcard();
      expect(component.flashcardFlipped).toBe(true);
      component.flipFlashcard();
      expect(component.flashcardFlipped).toBe(false);
    });

    it('should have empty student answer initially', () => {
      component.currentUser = student;
      component.session = flashcardSession({
        question: 'Q?',
        answer: 'A',
      });
      component.ngOnInit();
      expect(component.studentFlashcardAnswer).toBe('');
    });
  });
});
