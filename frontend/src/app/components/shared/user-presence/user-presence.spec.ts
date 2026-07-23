/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-empty */
import { TestBed } from '@angular/core/testing';
import { UserPresenceComponent } from './user-presence';
import { CanvasCollaborationService } from '../../../services/canvas/canvas-collaboration.service';
import { of } from 'rxjs';
import { vi } from 'vitest';

describe('UserPresenceComponent', () => {
  let component: UserPresenceComponent;
  let collabServiceSpy: any;

  beforeEach(async () => {
    collabServiceSpy = {
      getUserPresence: vi.fn().mockReturnValue(of([])),
    };

    await TestBed.configureTestingModule({
      imports: [UserPresenceComponent],
      providers: [{ provide: CanvasCollaborationService, useValue: collabServiceSpy }],
    }).compileComponents();

    component = TestBed.createComponent(UserPresenceComponent).componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start with empty users', () => {
    expect(component.users()).toEqual([]);
  });

  it('should toggle list visibility', () => {
    expect(component.showList()).toBe(false);
    component.toggleList();
    expect(component.showList()).toBe(true);
  });

  it('should return 0 online count initially', () => {
    expect(component.getOnlineCount()).toBe(0);
  });

  it('should count only online users', () => {
    component.users.set([
      { userId: 1, username: 'alice', isOnline: true, joinedAt: '' },
      { userId: 2, username: 'bob', isOnline: false, joinedAt: '' },
      { userId: 3, username: 'charlie', isOnline: true, joinedAt: '' },
    ]);
    expect(component.getOnlineCount()).toBe(2);
  });

  it('should get initial from username', () => {
    expect(component.getInitial('alice')).toBe('A');
    expect(component.getInitial('bob')).toBe('B');
    expect(component.getInitial(undefined as any)).toBe('?');
  });

  it('should return avatar color', () => {
    const color1 = component.getAvatarColor(1);
    const color2 = component.getAvatarColor(2);
    expect(color1).toContain('bg-');
    expect(color2).toContain('bg-');
  });

  it('should get visible users up to max', () => {
    component.users.set([
      { userId: 1, username: 'alice', isOnline: true, joinedAt: '' },
      { userId: 2, username: 'bob', isOnline: true, joinedAt: '' },
      { userId: 3, username: 'charlie', isOnline: true, joinedAt: '' },
      { userId: 4, username: 'diana', isOnline: true, joinedAt: '' },
    ]);
    expect(component.getVisibleUsers(3).length).toBe(3);
    expect(component.getMoreCount(3)).toBe(1);
  });

  it('should return 0 more count when under max', () => {
    component.users.set([
      { userId: 1, username: 'alice', isOnline: true, joinedAt: '' },
      { userId: 2, username: 'bob', isOnline: true, joinedAt: '' },
    ]);
    expect(component.getMoreCount(3)).toBe(0);
  });
});
