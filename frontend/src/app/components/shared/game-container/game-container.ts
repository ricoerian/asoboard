/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-empty */
import * as Matter from 'matter-js';
import Sortable from 'sortablejs';
import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  ChangeDetectorRef,
  inject,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Session, User, CanvasEvent } from '../../../models/types';
import { Api } from '../../../services/api';
import { NotificationService } from '../../../services/notification.service';
import { AchievementService } from '../../../services/achievement.service';

interface PhysicsObject {
  type: string;
  x: number;
  y: number;
  w?: number;
  h?: number;
  isStatic?: boolean;
  mass?: number;
  bounce?: number;
  friction?: number;
  color?: string;
}

interface MemoryCard {
  id: number;
  pairId: number;
  label: string;
  icon?: string;
}

interface MatterBodyOptions {
  isStatic?: boolean;
  restitution?: number;
  friction?: number;
  mass?: number;
  render: { fillStyle: string };
}

@Component({
  selector: 'app-game-container',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './game-container.html',
  styleUrl: './game-container.css',
})
export class GameContainerComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() session!: Session;
  @Input() currentUser!: User | null;
  @Input() studentEvents: CanvasEvent[] = [];

  @Output() eventCreated = new EventEmitter<CanvasEvent>();
  @Output() configUpdated = new EventEmitter<Record<string, unknown>>();

  private apiService = inject(Api);
  private notificationService = inject(NotificationService);
  private achievementService = inject(AchievementService);
  private cdr = inject(ChangeDetectorRef);

  hasStudentAnswered = false;
  studentAnswerIsCorrect: boolean | null = null;

  get isMentor(): boolean {
    return this.currentUser?.role === 'mentor';
  }

  trackByIndex(index: number): number {
    return index;
  }

  triviaQuestion = '';
  triviaOptions: string[] = ['', '', '', ''];
  triviaCorrectIndex = 0;
  studentSelectedAnswer: number | null = null;

  @ViewChild('puzzleList', { static: false }) puzzleListRef?: ElementRef;
  puzzleText = 'Step 1, Step 2, Step 3';
  puzzleWords: string[] = [];
  studentPuzzleWords: string[] = [];
  puzzleSortable?: Sortable;

  @ViewChild('mathOptionsList', { static: false }) mathOptionsRef?: ElementRef;
  @ViewChild('mathSlotList', { static: false }) mathSlotRef?: ElementRef;
  mathLeftLabel = '1000g';
  mathOptionsStr = '500g, 500g, 200g, 100g';
  mathCorrectCombinationStr = '500g, 500g';
  mathOptions: string[] = [];
  studentMathSlot: string[] = [];
  mathOptionsSortable?: Sortable;
  mathSlotSortable?: Sortable;

  colorTargetLabel = 'Purple';
  colorOptionsStr = 'Red, Blue, Yellow, Green';
  colorCorrectCombinationStr = 'Red, Blue';
  colorOptions: string[] = [];
  studentColors: string[] = [];

  chemFormulaName = 'Water';
  chemComponents: { label: string; count: number }[] = [
    { label: 'H', count: 2 },
    { label: 'O', count: 1 },
  ];
  chemDecoysStr = 'C, N, Cl';
  availableAtoms: string[] = [];
  studentChemCounts: { [key: string]: number } = {};
  chemAnimating = false;

  @ViewChild('physicsCanvas', { static: false }) physicsCanvas!: ElementRef<HTMLCanvasElement>;
  physicsEngine: Matter.Engine | null = null;
  physicsRender: Matter.Render | null = null;
  physicsRunner: Matter.Runner | null = null;

  physicsQuestion = 'Which box hits the ground first?';
  physicsOptions: string[] = ['Red Box', 'Blue Box'];
  physicsCorrectIndex = 0;
  physicsGravity = 1.0;
  physicsWind = 0.0;
  physicsObjects: PhysicsObject[] = [
    {
      type: 'rectangle',
      x: 300,
      y: 390,
      w: 600,
      h: 20,
      isStatic: true,
      mass: 1,
      bounce: 0.1,
      friction: 0.1,
      color: '#94a3b8',
    },
    {
      type: 'rectangle',
      x: 200,
      y: 100,
      w: 40,
      h: 40,
      isStatic: false,
      mass: 10,
      bounce: 0.8,
      friction: 0.1,
      color: '#ef4444',
    },
    {
      type: 'rectangle',
      x: 400,
      y: 100,
      w: 40,
      h: 40,
      isStatic: false,
      mass: 1,
      bounce: 0.2,
      friction: 0.1,
      color: '#3b82f6',
    },
  ];
  physicsAnimating = false;

  memoryPairsText = 'Apple, Banana, Cat, Dog';
  memoryPairs: { label: string; icon?: string }[] = [];
  memoryShuffledCards: MemoryCard[] = [];
  memoryFlippedCards: number[] = [];
  memoryMatchedPairIds: number[] = [];
  memoryAttempts = 0;
  memoryLock = false;
  memoryTimer = 0;
  memoryTimerInterval: ReturnType<typeof setInterval> | null = null;
  memoryTimerStarted = false;
  memoryScore = 0;
  memoryCelebrating = false;

  memoryIconPalette = [
    'star',
    'heart',
    'moon',
    'sun',
    'cloud',
    'bolt',
    'fire',
    'leaf',
    'gem',
    'crown',
    'rocket',
    'car',
    'plane',
    'tree',
    'fish',
    'dog',
    'cat',
    'paw',
    'music',
    'guitar',
    'camera',
    'book',
    'pencil',
    'palette',
    'gamepad',
    'trophy',
    'medal',
    'gift',
    'cake',
    'ice-cream',
  ];

  mazeRows = 7;
  mazeCols = 7;
  MazeGrid: number[][] = [];
  MazeStart: { row: number; col: number } = { row: 0, col: 0 };
  MazeEnd: { row: number; col: number } = { row: 6, col: 6 };
  MazeSolution: { row: number; col: number }[] = [];
  studentMazePath: { row: number; col: number }[] = [];

  wordAnswer = 'Hello';
  wordHint = 'A greeting';
  wordScrambledLetters: string[] = [];
  studentWordGuess = '';

  flashcardQuestion = '';
  flashcardAnswer = '';
  studentFlashcardAnswer = '';
  flashcardFlipped = false;

  ngOnInit() {
    this.loadGameConfig();
  }

  ngAfterViewInit() {
    if (this.session.game_type === 'physics') {
      setTimeout(() => this.initPhysics(), 100);
    }
    setTimeout(() => this.initSortables(), 200);
  }

  ngOnDestroy() {
    this.cleanupPhysics();
    this.stopMemoryTimer();
    if (this.puzzleSortable) this.puzzleSortable.destroy();
    if (this.mathOptionsSortable) this.mathOptionsSortable.destroy();
    if (this.mathSlotSortable) this.mathSlotSortable.destroy();
  }

  initSortables() {
    if (this.session.game_type === 'puzzle' && this.puzzleListRef) {
      this.puzzleSortable = new Sortable(this.puzzleListRef.nativeElement, {
        animation: 150,
        disabled: this.hasStudentAnswered,
        onEnd: (evt) => {
          const item = this.studentPuzzleWords.splice(evt.oldIndex!, 1)[0];
          this.studentPuzzleWords.splice(evt.newIndex!, 0, item);
        },
      });
    }

    if (
      this.session.game_type === 'math' &&
      this.mathOptionsRef &&
      this.mathSlotRef &&
      !this.isMentor
    ) {
      this.mathOptionsSortable = new Sortable(this.mathOptionsRef.nativeElement, {
        group: 'math',
        animation: 150,
        disabled: this.hasStudentAnswered,
        onEnd: (evt) => {
          if (evt.to === this.mathSlotRef?.nativeElement) {
            const item = this.mathOptions.splice(evt.oldIndex!, 1)[0];
            this.studentMathSlot.push(item);
            this.cdr.detectChanges();
          }
        },
      });
      this.mathSlotSortable = new Sortable(this.mathSlotRef.nativeElement, {
        group: 'math',
        animation: 150,
        disabled: this.hasStudentAnswered,
        onEnd: (evt) => {
          if (evt.to === this.mathOptionsRef?.nativeElement) {
            const item = this.studentMathSlot.splice(evt.oldIndex!, 1)[0];
            this.mathOptions.push(item);
            this.cdr.detectChanges();
          }
        },
      });
    }
  }

  loadGameConfig() {
    const config = this.session.game_config || {};

    if (!this.isMentor) {
      const answerEvent = this.studentEvents.find(
        (e) => e.type === this.session.game_type + '_answer',
      );
      if (answerEvent) {
        this.hasStudentAnswered = true;
        let parsed: unknown = null;
        try {
          parsed = JSON.parse(answerEvent.text || 'null');
        } catch {
          parsed = answerEvent.text;
        }

        if (this.session.game_type === 'trivia') this.studentSelectedAnswer = Number(parsed);
        if (this.session.game_type === 'puzzle') this.studentPuzzleWords = parsed as string[];
        if (this.session.game_type === 'math') this.studentMathSlot = parsed as string[];
        if (this.session.game_type === 'color') this.studentColors = parsed as string[];
        if (this.session.game_type === 'chemistry')
          this.studentChemCounts = parsed as { [key: string]: number };
        if (this.session.game_type === 'physics') this.studentSelectedAnswer = Number(parsed);
        if (this.session.game_type === 'memory') this.memoryMatchedPairIds = parsed as number[];
        if (this.session.game_type === 'maze')
          this.studentMazePath = parsed as { row: number; col: number }[];
        if (this.session.game_type === 'word_scramble') this.studentWordGuess = String(parsed);

        this.apiService.checkGameAnswer(this.session.id, parsed).subscribe((res) => {
          this.studentAnswerIsCorrect = res.is_correct;
          this.cdr.detectChanges();
        });
      }
    }

    if (this.session.game_type === 'trivia') {
      this.triviaQuestion = (config['question'] as string) || '';
      this.triviaOptions = (config['options'] as string[]) || ['', '', '', ''];
      this.triviaCorrectIndex = Number(config['correctIndex']) || 0;
    } else if (this.session.game_type === 'puzzle') {
      if (this.isMentor) {
        this.puzzleText = ((config['puzzleItems'] as string[]) || []).join(', ');
      } else {
        if (!this.hasStudentAnswered) {
          this.studentPuzzleWords = (config['puzzleWords'] as string[]) || [];
        }
      }
    } else if (this.session.game_type === 'math') {
      this.mathLeftLabel = (config['leftLabel'] as string) || '1000g';
      if (this.isMentor) {
        this.mathOptionsStr = ((config['options'] as string[]) || []).join(', ');
        this.mathCorrectCombinationStr = ((config['correctCombination'] as string[]) || []).join(
          ', ',
        );
      } else {
        if (!this.hasStudentAnswered) {
          this.mathOptions = (config['options'] as string[]) || [];
        }
      }
    } else if (this.session.game_type === 'color') {
      this.colorTargetLabel = (config['targetLabel'] as string) || 'Purple';
      if (this.isMentor) {
        this.colorOptionsStr = ((config['options'] as string[]) || []).join(', ');
        this.colorCorrectCombinationStr = ((config['correctCombination'] as string[]) || []).join(
          ', ',
        );
      } else {
        this.colorOptions = (config['options'] as string[]) || [];
      }
    } else if (this.session.game_type === 'chemistry') {
      this.chemFormulaName = (config['formulaName'] as string) || 'Water';
      if (this.isMentor) {
        this.chemComponents = (config['components'] as { label: string; count: number }[]) || [
          { label: 'H', count: 2 },
          { label: 'O', count: 1 },
        ];
        this.chemDecoysStr = ((config['decoys'] as string[]) || []).join(', ');
      } else {
        this.availableAtoms = (config['availableAtoms'] as string[]) || [];
      }
    } else if (this.session.game_type === 'physics') {
      this.physicsQuestion = (config['question'] as string) || 'What will happen?';
      this.physicsOptions = (config['options'] as string[]) || ['Option A', 'Option B'];
      this.physicsCorrectIndex = Number(config['correctIndex']) || 0;
      this.physicsGravity = config['gravity'] !== undefined ? Number(config['gravity']) : 1.0;
      this.physicsWind = config['wind'] !== undefined ? Number(config['wind']) : 0.0;
      if (config['objects']) {
        this.physicsObjects = config['objects'] as PhysicsObject[];
      }
    } else if (this.session.game_type === 'memory') {
      if (this.isMentor) {
        this.memoryPairs = (config['pairs'] as { label: string; icon?: string }[]) || [];
        this.memoryPairsText = this.memoryPairs.map((p) => p.label).join(', ');
      } else {
        this.memoryShuffledCards = (config['shuffledCards'] as MemoryCard[]) || [];
      }
    } else if (this.session.game_type === 'maze') {
      this.mazeRows = config['rows'] !== undefined ? Number(config['rows']) : 7;
      this.mazeCols = config['cols'] !== undefined ? Number(config['cols']) : 7;
      this.MazeGrid =
        (config['grid'] as number[][]) || this.generateEmptyMaze(this.mazeRows, this.mazeCols);
      this.MazeStart = (config['start'] as { row: number; col: number }) || { row: 0, col: 0 };
      this.MazeEnd = (config['end'] as { row: number; col: number }) || {
        row: this.mazeRows - 1,
        col: this.mazeCols - 1,
      };
      if (this.isMentor) {
        this.MazeSolution = (config['solutionPath'] as { row: number; col: number }[]) || [];
      }
    } else if (this.session.game_type === 'word_scramble') {
      this.wordHint = (config['hint'] as string) || '';
      if (this.isMentor) {
        this.wordAnswer = (config['answer'] as string) || '';
      } else {
        this.wordScrambledLetters = (config['scrambledLetters'] as string[]) || [];
      }
    } else if (this.session.game_type === 'flashcard') {
      this.flashcardQuestion = (config['question'] as string) || '';
      if (this.isMentor) {
        this.flashcardAnswer = (config['answer'] as string) || '';
      }
    }
  }

  saveMentorsConfig() {
    if (!this.isMentor) return;

    let newConfig: Record<string, unknown> = {};

    if (this.session.game_type === 'trivia') {
      newConfig = {
        question: this.triviaQuestion,
        options: this.triviaOptions,
        correctIndex: Number(this.triviaCorrectIndex),
      };
    } else if (this.session.game_type === 'puzzle') {
      newConfig = {
        puzzleItems: this.puzzleText
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s),
      };
    } else if (this.session.game_type === 'math') {
      newConfig = {
        leftLabel: this.mathLeftLabel,
        options: this.mathOptionsStr
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s),
        correctCombination: this.mathCorrectCombinationStr
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s),
      };
    } else if (this.session.game_type === 'color') {
      newConfig = {
        targetLabel: this.colorTargetLabel,
        options: this.colorOptionsStr
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s),
        correctCombination: this.colorCorrectCombinationStr
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s),
      };
    } else if (this.session.game_type === 'chemistry') {
      newConfig = {
        formulaName: this.chemFormulaName,
        components: this.chemComponents,
        decoys: this.chemDecoysStr
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s),
      };
    } else if (this.session.game_type === 'physics') {
      newConfig = {
        question: this.physicsQuestion,
        options: this.physicsOptions,
        correctIndex: Number(this.physicsCorrectIndex),
        gravity: this.physicsGravity,
        wind: this.physicsWind,
        objects: this.physicsObjects,
      };
    } else if (this.session.game_type === 'memory') {
      newConfig = {
        pairs: this.memoryPairs
          .map((p) => ({
            label: p.label?.trim() || '',
            icon: p.icon || '',
          }))
          .filter((p) => p.label || p.icon),
      };
    } else if (this.session.game_type === 'maze') {
      newConfig = {
        rows: this.mazeRows,
        cols: this.mazeCols,
        grid: this.MazeGrid,
        start: this.MazeStart,
        end: this.MazeEnd,
        solutionPath: this.MazeSolution,
      };
    } else if (this.session.game_type === 'word_scramble') {
      newConfig = {
        answer: this.wordAnswer,
        hint: this.wordHint,
      };
    } else if (this.session.game_type === 'flashcard') {
      newConfig = {
        question: this.flashcardQuestion,
        answer: this.flashcardAnswer,
      };
    }

    const payload = { game_config: newConfig };
    this.apiService.updateSession(this.session.id, payload).subscribe({
      next: (updated: Session | { data?: Session }) => {
        const updatedSession =
          'data' in updated && updated.data ? updated.data : (updated as Session);
        this.session.game_config = updatedSession.game_config;
        this.notificationService.success(`${this.session.game_type} game published!`);
        this.configUpdated.emit(this.session.game_config);
        if (this.session.game_type === 'physics') this.setupPhysicsWorld();
        this.cdr.detectChanges();
      },
      error: () => this.notificationService.error('Failed to save game config.'),
    });
  }

  submitStudentAnswer(answerData: unknown) {
    if (this.isMentor || this.hasStudentAnswered) return;

    this.hasStudentAnswered = true;
    if (this.puzzleSortable) this.puzzleSortable.option('disabled', true);
    if (this.mathOptionsSortable) this.mathOptionsSortable.option('disabled', true);
    if (this.mathSlotSortable) this.mathSlotSortable.option('disabled', true);

    this.apiService.checkGameAnswer(this.session.id, answerData).subscribe({
      next: (res) => {
        this.studentAnswerIsCorrect = res.is_correct;
        const ev: CanvasEvent = {
          type: this.session.game_type + '_answer',
          text: JSON.stringify(answerData),
          timestamp: Date.now(),
          id: Date.now().toString(),
        };
        this.eventCreated.emit(ev);

        if (res.is_correct) this.notificationService.success('Correct Answer!');
        else this.notificationService.error('Oops! Incorrect Answer.');

        this.achievementService.checkAndAward().subscribe({
          next: (response) => {
            if (response.new_achievements.length > 0) {
              console.log('New achievements unlocked!', response.new_achievements);
            }
          },
          error: (err) => {
            console.error('Failed to check achievements:', err);
          },
        });

        this.cdr.detectChanges();
      },
      error: () => {
        this.hasStudentAnswered = false;
        if (this.puzzleSortable) this.puzzleSortable.option('disabled', false);
        if (this.mathOptionsSortable) this.mathOptionsSortable.option('disabled', false);
        if (this.mathSlotSortable) this.mathSlotSortable.option('disabled', false);
        this.notificationService.error('Failed to verify answer');
        this.cdr.detectChanges();
      },
    });
  }

  addTriviaOption() {
    this.triviaOptions.push('');
  }
  removeTriviaOption(i: number) {
    this.triviaOptions.splice(i, 1);
  }
  submitTriviaAnswer(index: number) {
    this.studentSelectedAnswer = index;
    this.submitStudentAnswer(index);
  }

  submitPuzzle() {
    this.submitStudentAnswer(this.studentPuzzleWords);
  }

  submitMath() {
    this.submitStudentAnswer(this.studentMathSlot);
  }

  toggleColor(color: string) {
    if (this.hasStudentAnswered) return;
    const idx = this.studentColors.indexOf(color);
    if (idx > -1) this.studentColors.splice(idx, 1);
    else this.studentColors.push(color);
  }
  submitColor() {
    this.submitStudentAnswer(this.studentColors);
  }

  addChemComponent() {
    this.chemComponents.push({ label: 'New', count: 1 });
  }
  removeChemComponent(i: number) {
    this.chemComponents.splice(i, 1);
  }
  incrementStudentChem(label: string) {
    if (this.hasStudentAnswered || this.chemAnimating) return;
    this.studentChemCounts[label] = (this.studentChemCounts[label] || 0) + 1;
  }
  decrementStudentChem(label: string) {
    if (this.hasStudentAnswered || this.chemAnimating) return;
    if (this.studentChemCounts[label] > 0) this.studentChemCounts[label]--;
  }
  get studentChemTotal() {
    return Object.values(this.studentChemCounts).reduce((a, b) => a + b, 0);
  }
  submitChem() {
    this.chemAnimating = true;
    setTimeout(() => {
      this.chemAnimating = false;
      this.submitStudentAnswer(this.studentChemCounts);
      this.cdr.detectChanges();
    }, 1500);
  }

  addPhysicsOption() {
    this.physicsOptions.push('');
  }
  removePhysicsOption(i: number) {
    this.physicsOptions.splice(i, 1);
  }
  addPhysicsObject() {
    this.physicsObjects.push({
      type: 'circle',
      x: 100,
      y: 100,
      w: 20,
      h: 20,
      isStatic: false,
      mass: 1,
      bounce: 0.5,
      friction: 0.1,
      color: '#3b82f6',
    });
    this.setupPhysicsWorld();
  }
  removePhysicsObject(i: number) {
    this.physicsObjects.splice(i, 1);
    this.setupPhysicsWorld();
  }

  cleanupPhysics() {
    if (this.physicsRender) {
      Matter.Render.stop(this.physicsRender);
      this.physicsRender.canvas.remove();
      this.physicsRender = null;
    }
    if (this.physicsRunner) {
      Matter.Runner.stop(this.physicsRunner);
      this.physicsRunner = null;
    }
    if (this.physicsEngine) {
      Matter.Engine.clear(this.physicsEngine);
      this.physicsEngine = null;
    }
  }

  initPhysics() {
    if (!this.physicsCanvas) return;
    this.cleanupPhysics();

    this.physicsEngine = Matter.Engine.create();
    this.physicsRender = Matter.Render.create({
      element: this.physicsCanvas.nativeElement.parentElement!,
      canvas: this.physicsCanvas.nativeElement,
      engine: this.physicsEngine,
      options: { width: 600, height: 400, wireframes: false, background: '#f8fafc' },
    });
    this.physicsRunner = Matter.Runner.create();

    this.setupPhysicsWorld();
    Matter.Render.run(this.physicsRender);
  }

  setupPhysicsWorld() {
    if (!this.physicsEngine) return;
    Matter.World.clear(this.physicsEngine.world, false);

    const bodies = [];
    for (const obj of this.physicsObjects) {
      const opts: MatterBodyOptions = {
        isStatic: obj.isStatic,
        restitution: obj.bounce || 0,
        friction: obj.friction || 0,
        render: { fillStyle: obj.color || '#cbd5e1' },
      };
      if (!obj.isStatic) opts.mass = obj.mass || 1;

      if (obj.type === 'rectangle') {
        bodies.push(Matter.Bodies.rectangle(obj.x, obj.y, obj.w || 50, obj.h || 50, opts));
      } else {
        bodies.push(Matter.Bodies.circle(obj.x, obj.y, obj.w || 25, opts));
      }
    }

    this.physicsEngine.world.gravity.y = this.physicsGravity;
    this.physicsEngine.world.gravity.x = this.physicsWind;

    Matter.World.add(this.physicsEngine.world, bodies);
  }

  simulatePhysics() {
    if (!this.physicsEngine || !this.physicsRunner || this.physicsAnimating) return;
    this.physicsAnimating = true;

    this.setupPhysicsWorld();

    Matter.Runner.run(this.physicsRunner, this.physicsEngine);

    if (!this.isMentor && !this.hasStudentAnswered) {
      setTimeout(() => {
        this.physicsAnimating = false;
        Matter.Runner.stop(this.physicsRunner!);
        this.submitStudentAnswer(this.studentSelectedAnswer);
      }, 3000);
    } else {
      setTimeout(() => {
        this.physicsAnimating = false;
        Matter.Runner.stop(this.physicsRunner!);
      }, 3000);
    }
  }

  selectPhysicsAnswer(i: number) {
    if (this.hasStudentAnswered || this.physicsAnimating) return;
    this.studentSelectedAnswer = i;
  }

  startMemoryTimer() {
    if (this.memoryTimerStarted || this.memoryTimerInterval) return;
    this.memoryTimerStarted = true;
    this.memoryTimerInterval = setInterval(() => {
      this.memoryTimer++;
      this.cdr.detectChanges();
    }, 1000);
  }

  stopMemoryTimer() {
    if (this.memoryTimerInterval) {
      clearInterval(this.memoryTimerInterval);
      this.memoryTimerInterval = null;
    }
  }

  playMemorySound(type: 'flip' | 'match' | 'mismatch' | 'complete') {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.value = 0.1;

      if (type === 'flip') {
        osc.frequency.value = 500;
        osc.type = 'sine';
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.1);
      } else if (type === 'match') {
        osc.frequency.value = 600;
        osc.type = 'sine';
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      } else if (type === 'mismatch') {
        osc.frequency.value = 400;
        osc.type = 'square';
        gain.gain.value = 0.05;
        osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
      } else if (type === 'complete') {
        osc.frequency.value = 523;
        osc.type = 'sine';
        gain.gain.value = 0.15;
        const now = ctx.currentTime;
        osc.frequency.setValueAtTime(523, now);
        osc.frequency.setValueAtTime(659, now + 0.15);
        osc.frequency.setValueAtTime(784, now + 0.3);
        osc.frequency.setValueAtTime(1047, now + 0.45);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
        osc.start(now);
        osc.stop(now + 0.7);
      }
    } catch {}
  }

  calculateMemoryScore(totalPairs: number, attempts: number, timeSeconds: number): number {
    const perfectAttempts = totalPairs;
    const attemptPenalty = Math.max(0, attempts - perfectAttempts) * 10;
    const timeBonus = Math.max(0, 500 - timeSeconds * 2);
    const baseScore = totalPairs * 100;
    return Math.max(10, baseScore - attemptPenalty + timeBonus);
  }

  get memoryFormattedTime(): string {
    const mins = Math.floor(this.memoryTimer / 60);
    const secs = this.memoryTimer % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  addMemoryPair() {
    const nextIcon =
      this.memoryIconPalette[this.memoryPairs.length % this.memoryIconPalette.length];
    this.memoryPairs.push({ label: '', icon: nextIcon });
  }

  removeMemoryPair(index: number) {
    this.memoryPairs.splice(index, 1);
  }

  autoFillMemoryPairs() {
    const labels = this.memoryPairsText
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s);
    this.memoryPairs = labels.map((label, i) => ({
      label,
      icon: this.memoryIconPalette[i % this.memoryIconPalette.length],
    }));
  }

  flipMemoryCard(cardId: number) {
    if (this.hasStudentAnswered || this.memoryLock) return;
    if (this.memoryFlippedCards.includes(cardId)) return;
    const card = this.memoryShuffledCards.find((c) => c.id === cardId);
    if (!card) return;
    if (this.memoryMatchedPairIds.includes(card.pairId)) return;

    if (!this.memoryTimerStarted) this.startMemoryTimer();
    this.playMemorySound('flip');
    this.memoryFlippedCards.push(cardId);

    if (this.memoryFlippedCards.length === 2) {
      this.memoryAttempts++;
      this.memoryLock = true;
      const c1 = this.memoryShuffledCards.find((c) => c.id === this.memoryFlippedCards[0])!;
      const c2 = this.memoryShuffledCards.find((c) => c.id === this.memoryFlippedCards[1])!;
      if (c1.pairId === c2.pairId) {
        this.playMemorySound('match');
        this.memoryMatchedPairIds.push(c1.pairId);
        this.memoryFlippedCards = [];
        this.memoryLock = false;
        this.cdr.detectChanges();
        if (this.memoryMatchedPairIds.length === this.memoryShuffledCards.length / 2) {
          this.stopMemoryTimer();
          this.memoryScore = this.calculateMemoryScore(
            this.memoryMatchedPairIds.length,
            this.memoryAttempts,
            this.memoryTimer,
          );
          this.memoryCelebrating = true;
          this.playMemorySound('complete');
          setTimeout(() => {
            this.memoryCelebrating = false;
            this.submitStudentAnswer(this.memoryMatchedPairIds);
          }, 2500);
        }
      } else {
        this.playMemorySound('mismatch');
        setTimeout(() => {
          this.memoryFlippedCards = [];
          this.memoryLock = false;
          this.cdr.detectChanges();
        }, 800);
      }
    }
  }

  isMemoryCardFlipped(cardId: number): boolean {
    return (
      this.memoryFlippedCards.includes(cardId) ||
      this.memoryMatchedPairIds.includes(
        this.memoryShuffledCards.find((c) => c.id === cardId)?.pairId ?? -1,
      )
    );
  }

  isMemoryCardMatched(cardId: number): boolean {
    return this.memoryMatchedPairIds.includes(
      this.memoryShuffledCards.find((c) => c.id === cardId)?.pairId ?? -1,
    );
  }

  generateEmptyMaze(rows: number, cols: number): number[][] {
    return Array.from({ length: rows }, () => Array(cols).fill(0));
  }

  regenerateMaze() {
    this.MazeGrid = this.generateEmptyMaze(this.mazeRows, this.mazeCols);
    this.MazeSolution = [];
    this.studentMazePath = [];
  }

  toggleMazeWall(row: number, col: number) {
    if (this.hasStudentAnswered) return;
    if (row === this.MazeStart.row && col === this.MazeStart.col) return;
    if (row === this.MazeEnd.row && col === this.MazeEnd.col) return;
    this.MazeGrid[row][col] = this.MazeGrid[row][col] === 1 ? 0 : 1;
    this.MazeSolution = [];
  }

  setMazeStart(row: number, col: number) {
    if (this.hasStudentAnswered) return;
    if (this.MazeGrid[row][col] === 1) return;
    this.MazeStart = { row, col };
    this.studentMazePath = [];
  }

  setMazeEnd(row: number, col: number) {
    if (this.hasStudentAnswered) return;
    if (this.MazeGrid[row][col] === 1) return;
    this.MazeEnd = { row, col };
    this.studentMazePath = [];
  }

  navigateMaze(row: number, col: number) {
    if (this.hasStudentAnswered) return;
    if (this.MazeGrid[row][col] === 1) return;

    if (this.studentMazePath.length === 0) {
      if (row === this.MazeStart.row && col === this.MazeStart.col) {
        this.studentMazePath.push({ row, col });
      }
      return;
    }

    const last = this.studentMazePath[this.studentMazePath.length - 1];
    const dist = Math.abs(last.row - row) + Math.abs(last.col - col);
    if (dist !== 1) return;

    if (this.studentMazePath.length > 1) {
      const prev = this.studentMazePath[this.studentMazePath.length - 2];
      if (prev.row === row && prev.col === col) {
        this.studentMazePath.pop();
        return;
      }
    }

    this.studentMazePath.push({ row, col });
    if (row === this.MazeEnd.row && col === this.MazeEnd.col) {
      this.submitStudentAnswer(this.studentMazePath);
    }
  }

  isMazeCellInPath(row: number, col: number): boolean {
    return this.studentMazePath.some((p) => p.row === row && p.col === col);
  }

  isMazeCellCurrent(row: number, col: number): boolean {
    if (this.studentMazePath.length === 0) return false;
    const last = this.studentMazePath[this.studentMazePath.length - 1];
    return last.row === row && last.col === col;
  }

  isMazeCellAdjacentToCurrent(row: number, col: number): boolean {
    if (this.studentMazePath.length === 0) {
      return row === this.MazeStart.row && col === this.MazeStart.col;
    }
    const last = this.studentMazePath[this.studentMazePath.length - 1];
    const dist = Math.abs(last.row - row) + Math.abs(last.col - col);
    return dist === 1;
  }

  mazePathIndex(row: number, col: number): number {
    return this.studentMazePath.findIndex((p) => p.row === row && p.col === col);
  }

  submitWordGuess() {
    this.submitStudentAnswer(this.studentWordGuess);
  }

  flipFlashcard() {
    this.flashcardFlipped = !this.flashcardFlipped;
  }

  submitFlashcardAnswer() {
    this.submitStudentAnswer(this.studentFlashcardAnswer);
  }
}
