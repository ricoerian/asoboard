import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LevelBadgeComponent } from './level-badge';
import { UserLevel } from '../../../models/types';

describe('LevelBadgeComponent', () => {
  let component: LevelBadgeComponent;
  let fixture: ComponentFixture<LevelBadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LevelBadgeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LevelBadgeComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show default level 1 when no data', () => {
    component.levelData = null;
    fixture.detectChanges();
    const number = fixture.nativeElement.querySelector('.level-number');
    expect(number.textContent.trim()).toBe('1');
  });

  it('should display correct level number', () => {
    component.levelData = makeLevel(5, 50, 100);
    fixture.detectChanges();
    const number = fixture.nativeElement.querySelector('.level-number');
    expect(number.textContent.trim()).toBe('5');
  });

  it('should show XP text with progress', () => {
    component.levelData = makeLevel(3, 65, 100);
    fixture.detectChanges();
    const xp = fixture.nativeElement.querySelector('.xp-text');
    expect(xp.textContent.trim()).toBe('65/100 XP');
  });

  it('should set progress bar width correctly', () => {
    component.levelData = makeLevel(2, 30, 100);
    fixture.detectChanges();
    const fill = fixture.nativeElement.querySelector('.xp-bar-fill');
    expect(fill.style.width).toBe('30%');
  });

  it('should show 0% width for 0 progress', () => {
    component.levelData = makeLevel(1, 0, 100);
    fixture.detectChanges();
    const fill = fixture.nativeElement.querySelector('.xp-bar-fill');
    expect(fill.style.width).toBe('0%');
  });

  it('should show 100% width for full bar', () => {
    component.levelData = makeLevel(2, 100, 100);
    fixture.detectChanges();
    const fill = fixture.nativeElement.querySelector('.xp-bar-fill');
    expect(fill.style.width).toBe('100%');
  });

  it('should display total points', () => {
    component.levelData = makeLevel(3, 45, 100, 245);
    fixture.detectChanges();
    const total = fixture.nativeElement.querySelector('.total-points');
    expect(total.textContent.trim()).toContain('245');
  });

  it('should display star icon', () => {
    component.levelData = makeLevel(1, 0, 100);
    fixture.detectChanges();
    const star = fixture.nativeElement.querySelector('.level-star');
    expect(star).toBeTruthy();
    expect(star.classList.contains('fa-star')).toBe(true);
  });

  it('should display Level label', () => {
    component.levelData = makeLevel(4, 20, 100);
    fixture.detectChanges();
    const label = fixture.nativeElement.querySelector('.level-label');
    expect(label.textContent.trim()).toBe('Level');
  });

  it('should fallback XP values when levelData has missing fields', () => {
    component.levelData = {
      level: 2,
      current_xp: 0,
      xp_for_next_level: 100,
      progress_percent: 0,
      total_points: 100,
    };
    fixture.detectChanges();
    const xp = fixture.nativeElement.querySelector('.xp-text');
    expect(xp.textContent.trim()).toBe('0/100 XP');
  });

  it('should handle zero points correctly', () => {
    component.levelData = makeLevel(1, 0, 100, 0);
    fixture.detectChanges();
    const total = fixture.nativeElement.querySelector('.total-points');
    expect(total.textContent.trim()).toContain('0');
  });
});

function makeLevel(level: number, xp: number, next: number, total?: number): UserLevel {
  return {
    level,
    current_xp: xp,
    xp_for_next_level: next,
    progress_percent: xp,
    total_points: total ?? (level - 1) * 100 + xp,
  };
}
