/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-empty */
import { TestBed } from '@angular/core/testing';
import { SessionChatComponent } from './session-chat';
import { CanvasCollaborationService } from '../../../services/canvas/canvas-collaboration.service';
import { of } from 'rxjs';
import { vi } from 'vitest';

describe('SessionChatComponent', () => {
  let component: SessionChatComponent;
  let collabServiceSpy: any;

  beforeEach(async () => {
    collabServiceSpy = {
      sendChatMessage: vi.fn(),
      getChatMessages: vi.fn().mockReturnValue(of()),
    };

    await TestBed.configureTestingModule({
      imports: [SessionChatComponent],
      providers: [{ provide: CanvasCollaborationService, useValue: collabServiceSpy }],
    }).compileComponents();

    component = TestBed.createComponent(SessionChatComponent).componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle chat open/close', () => {
    expect(component.isOpen()).toBe(false);
    component.toggleChat();
    expect(component.isOpen()).toBe(true);
    component.toggleChat();
    expect(component.isOpen()).toBe(false);
  });

  it('should send message and clear input', () => {
    component.messageInput.set('Hello world');
    component.sendMessage();
    expect(collabServiceSpy.sendChatMessage).toHaveBeenCalledWith('Hello world');
    expect(component.messageInput()).toBe('');
  });

  it('should not send empty message', () => {
    component.messageInput.set('   ');
    component.sendMessage();
    expect(collabServiceSpy.sendChatMessage).not.toHaveBeenCalled();
  });

  it('should handle Enter key', () => {
    vi.spyOn(component, 'sendMessage');
    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    event.preventDefault = vi.fn();
    component.onKeydown(event);
    expect(component.sendMessage).toHaveBeenCalled();
  });

  it('should prevent default on Enter key', () => {
    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    const spy = vi.spyOn(event, 'preventDefault');
    component.onKeydown(event);
    expect(spy).toHaveBeenCalled();
  });

  it('should return correct role badge color', () => {
    expect(component.getRoleBadgeColor('mentor')).toContain('blue');
    expect(component.getRoleBadgeColor('student')).toContain('green');
    expect(component.getRoleBadgeColor('staff')).toContain('orange');
    expect(component.getRoleBadgeColor('unknown')).toContain('gray');
  });

  it('should return correct role icon', () => {
    expect(component.getRoleIcon('mentor')).toBe('fa-chalkboard-user');
    expect(component.getRoleIcon('student')).toBe('fa-graduation-cap');
    expect(component.getRoleIcon('staff')).toBe('fa-briefcase');
    expect(component.getRoleIcon('unknown')).toBe('fa-user');
  });

  it('should format time correctly', () => {
    const now = new Date();
    const justNow = new Date(now.getTime() - 30000);
    const minutes = new Date(now.getTime() - 5 * 60 * 1000);
    const hours = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    expect(component.formatTime(justNow.toISOString())).toBe('just now');
    expect(component.formatTime(minutes.toISOString())).toBe('5m ago');
    expect(component.formatTime(hours.toISOString())).toBe('2h ago');
  });

  it('should initialize with empty messages', () => {
    expect(component.messages()).toEqual([]);
  });

  it('should handle onInputChange', () => {
    component.onInputChange('test message');
    expect(component.messageInput()).toBe('test message');
  });

  it('should get initial from username', () => {
    expect(component.getInitial('alice')).toBe('A');
    expect(component.getInitial(undefined)).toBe('?');
  });
});
