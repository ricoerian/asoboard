/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-empty */
import { TestBed } from '@angular/core/testing';
import { MentorBroadcastComponent } from './mentor-broadcast';
import { CanvasCollaborationService } from '../../../services/canvas/canvas-collaboration.service';
import { of } from 'rxjs';
import { vi } from 'vitest';

describe('MentorBroadcastComponent', () => {
  let component: MentorBroadcastComponent;
  let collabServiceSpy: any;
  let fixture: any;

  beforeEach(async () => {
    collabServiceSpy = {
      sendMentorBroadcast: vi.fn(),
      getMentorBroadcasts: vi.fn().mockReturnValue(of()),
    };

    await TestBed.configureTestingModule({
      imports: [MentorBroadcastComponent],
      providers: [{ provide: CanvasCollaborationService, useValue: collabServiceSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(MentorBroadcastComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start with empty broadcasts', () => {
    expect(component.broadcasts()).toEqual([]);
  });

  it('should start with empty broadcast input', () => {
    expect(component.broadcastInput()).toBe('');
  });

  it('should send broadcast when mentor and clear input', () => {
    fixture.componentRef.setInput('userRole', 'mentor');
    component.broadcastInput.set('Hello students!');
    component.sendBroadcast();
    expect(collabServiceSpy.sendMentorBroadcast).toHaveBeenCalledWith('Hello students!');
    expect(component.broadcastInput()).toBe('');
  });

  it('should not send empty broadcast', () => {
    fixture.componentRef.setInput('userRole', 'mentor');
    component.broadcastInput.set('   ');
    component.sendBroadcast();
    expect(collabServiceSpy.sendMentorBroadcast).not.toHaveBeenCalled();
  });

  it('should not send broadcast if not mentor', () => {
    fixture.componentRef.setInput('userRole', 'student');
    component.broadcastInput.set('Hello');
    component.sendBroadcast();
    expect(collabServiceSpy.sendMentorBroadcast).not.toHaveBeenCalled();
  });

  it('should dismiss broadcast by index', () => {
    component.broadcasts.set([
      { message: 'Message 1', username: 'mentor1', timestamp: '' },
      { message: 'Message 2', username: 'mentor2', timestamp: '' },
      { message: 'Message 3', username: 'mentor3', timestamp: '' },
    ]);
    component.dismissBroadcast(1);
    expect(component.broadcasts().length).toBe(2);
    expect(component.broadcasts()[0].message).toBe('Message 1');
    expect(component.broadcasts()[1].message).toBe('Message 3');
  });

  it('should get initial from username', () => {
    expect(component.getInitial('mentor1')).toBe('M');
    expect(component.getInitial(undefined as any)).toBe('?');
  });

  it('should accept userRole as input', () => {
    fixture.componentRef.setInput('userRole', 'mentor');
    expect(component.userRole()).toBe('mentor');
  });

  it('should handle onInputChange', () => {
    component.onInputChange('test message');
    expect(component.broadcastInput()).toBe('test message');
  });
});
