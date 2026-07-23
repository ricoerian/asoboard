/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-empty */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StreakBadgeComponent } from './streak-badge';
import { UserStreak } from '../../../models/types';

describe('StreakBadgeComponent', () => {
  let component: StreakBadgeComponent;
  let fixture: ComponentFixture<StreakBadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StreakBadgeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(StreakBadgeComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show 0 when no streak', () => {
    fixture.detectChanges();
    const count = fixture.nativeElement.querySelector('.streak-count');
    expect(count.textContent.trim()).toBe('0');
  });

  it('should display current streak count', () => {
    component.streak = {
      id: 1,
      username: 'test',
      current_streak: 7,
      longest_streak: 7,
      last_active_date: '2026-07-01',
    };
    fixture.detectChanges();
    const count = fixture.nativeElement.querySelector('.streak-count');
    expect(count.textContent.trim()).toBe('7');
  });

  it('should display longest streak', () => {
    component.streak = {
      id: 1,
      username: 'test',
      current_streak: 3,
      longest_streak: 15,
      last_active_date: '2026-07-01',
    };
    fixture.detectChanges();
    const best = fixture.nativeElement.querySelector('.streak-best');
    expect(best.textContent.trim()).toContain('15');
  });

  it('should not show milestone when not leveled up', () => {
    component.streak = {
      id: 1,
      username: 'test',
      current_streak: 5,
      longest_streak: 5,
      last_active_date: '2026-07-01',
    };
    fixture.detectChanges();
    const milestone = fixture.nativeElement.querySelector('.milestone-popup');
    expect(milestone).toBeNull();
  });

  it('should show milestone when leveled up', () => {
    component.streak = {
      id: 1,
      username: 'test',
      current_streak: 7,
      longest_streak: 7,
      last_active_date: '2026-07-01',
    };
    component.leveledUp = true;
    fixture.detectChanges();
    const milestone = fixture.nativeElement.querySelector('.milestone-popup');
    expect(milestone).toBeTruthy();
    expect(milestone.textContent?.trim()).toContain('7 Hari');
  });

  it('should apply milestone class when leveled up', () => {
    component.streak = {
      id: 1,
      username: 'test',
      current_streak: 30,
      longest_streak: 30,
      last_active_date: '2026-07-01',
    };
    component.leveledUp = true;
    fixture.detectChanges();
    const card = fixture.nativeElement.querySelector('.streak-card');
    expect(card.classList.contains('milestone')).toBe(true);
  });

  it('should not apply milestone class when not leveled up', () => {
    component.streak = {
      id: 1,
      username: 'test',
      current_streak: 5,
      longest_streak: 5,
      last_active_date: '2026-07-01',
    };
    fixture.detectChanges();
    const card = fixture.nativeElement.querySelector('.streak-card');
    expect(card.classList.contains('milestone')).toBe(false);
  });

  it('should display flame icon', () => {
    component.streak = {
      id: 1,
      username: 'test',
      current_streak: 1,
      longest_streak: 1,
      last_active_date: '2026-07-01',
    };
    fixture.detectChanges();
    const flame = fixture.nativeElement.querySelector('.streak-icon');
    expect(flame).toBeTruthy();
    expect(flame.classList.contains('fa-fire')).toBe(true);
  });

  it('should handle null streak', () => {
    component.streak = null;
    fixture.detectChanges();
    const count = fixture.nativeElement.querySelector('.streak-count');
    expect(count.textContent.trim()).toBe('0');
  });

  it('should display streak label', () => {
    component.streak = {
      id: 1,
      username: 'test',
      current_streak: 3,
      longest_streak: 3,
      last_active_date: '2026-07-01',
    };
    fixture.detectChanges();
    const label = fixture.nativeElement.querySelector('.streak-label');
    expect(label.textContent.trim()).toBe('Hari Berturut-turut');
  });
});
