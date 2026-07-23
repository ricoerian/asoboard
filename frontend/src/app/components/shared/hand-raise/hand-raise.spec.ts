/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-empty */
import { TestBed } from '@angular/core/testing';
import { HandRaiseComponent } from './hand-raise';
import { CanvasCollaborationService } from '../../../services/canvas/canvas-collaboration.service';
import { of } from 'rxjs';
import { vi } from 'vitest';

describe('HandRaiseComponent', () => {
  let component: HandRaiseComponent;
  let collabServiceSpy: any;
  let fixture: any;

  beforeEach(async () => {
    collabServiceSpy = {
      raiseHand: vi.fn(),
      getHandRaises: vi.fn().mockReturnValue(of()),
    };

    await TestBed.configureTestingModule({
      imports: [HandRaiseComponent],
      providers: [{ provide: CanvasCollaborationService, useValue: collabServiceSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(HandRaiseComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start with hand not raised', () => {
    expect(component.isRaised()).toBe(false);
  });

  it('should toggle hand raise state', () => {
    component.toggleHand();
    expect(component.isRaised()).toBe(true);
    expect(collabServiceSpy.raiseHand).toHaveBeenCalledWith(true);

    component.toggleHand();
    expect(component.isRaised()).toBe(false);
    expect(collabServiceSpy.raiseHand).toHaveBeenCalledWith(false);
  });

  it('should toggle list visibility', () => {
    expect(component.showList()).toBe(false);
    component.toggleList();
    expect(component.showList()).toBe(true);
  });

  it('should return raised count of 0 initially', () => {
    expect(component.getRaisedCount()).toBe(0);
  });

  it('should return empty raised hands list initially', () => {
    expect(component.getRaisedHandsList()).toEqual([]);
  });

  it('should get initial from username', () => {
    expect(component.getInitial('alice')).toBe('A');
    expect(component.getInitial('bob')).toBe('B');
    expect(component.getInitial('')).toBe('?');
    expect(component.getInitial(undefined as any)).toBe('?');
  });

  it('should track raised hands', () => {
    component.raisedHands.update((map) => {
      const newMap = new Map(map);
      newMap.set(1, {
        raised: true,
        username: 'alice',
        userId: 1,
        timestamp: new Date().toISOString(),
      });
      return newMap;
    });

    expect(component.getRaisedCount()).toBe(1);
    expect(component.getRaisedHandsList().length).toBe(1);
    expect(component.getRaisedHandsList()[0].username).toBe('alice');
  });

  it('should accept userRole as input', () => {
    fixture.componentRef.setInput('userRole', 'student');
    expect(component.userRole()).toBe('student');
    fixture.componentRef.setInput('userRole', 'mentor');
    expect(component.userRole()).toBe('mentor');
  });
});
