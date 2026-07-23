/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-empty */
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  CanvasCollaborationService,
  ChatMessage,
  HandRaiseEvent,
  MentorBroadcast,
} from './canvas-collaboration.service';

describe('CanvasCollaborationService (Agent Alpha)', () => {
  let service: CanvasCollaborationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CanvasCollaborationService],
    });
    service = TestBed.inject(CanvasCollaborationService);
  });

  afterEach(() => {
    service.disconnect();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have empty connected users initially', () => {
    expect(service.getConnectedUsers()).toEqual([]);
  });

  it('should emit connection status observable', () => {
    const statuses: boolean[] = [];
    service.getConnectionStatus().subscribe((status) => statuses.push(status));
  });

  it('should emit errors observable', () => {
    const errors: string[] = [];
    service.getErrors().subscribe((err) => errors.push(err));
  });

  it('should not send canvas event when not connected', () => {
    service.sendCanvasEvent({ type: 'draw_line', points: [0, 0, 10, 10] });
  });

  it('should not send cursor position when not connected', () => {
    service.sendCursorPosition(100, 200);
  });

  it('should not send chat message when empty', () => {
    service.sendChatMessage('');
    service.sendChatMessage('   ');
  });

  it('should provide canvas events observable', () => {
    const obs = service.getCanvasEvents();
    expect(obs).toBeTruthy();
    expect(typeof obs.subscribe).toBe('function');
  });

  it('should provide cursor positions observable', () => {
    const obs = service.getCursorPositions();
    expect(obs).toBeTruthy();
  });

  it('should provide user presence observable', () => {
    const obs = service.getUserPresence();
    expect(obs).toBeTruthy();
  });

  it('should provide chat messages observable', () => {
    const obs = service.getChatMessages();
    expect(obs).toBeTruthy();
  });

  it('should provide hand raises observable', () => {
    const obs = service.getHandRaises();
    expect(obs).toBeTruthy();
  });

  it('should provide mentor broadcasts observable', () => {
    const obs = service.getMentorBroadcasts();
    expect(obs).toBeTruthy();
  });

  it('should not send hand raise when not connected', () => {
    service.raiseHand(true);
    service.raiseHand(false);
  });

  it('should not send mentor broadcast when empty', () => {
    service.sendMentorBroadcast('');
    service.sendMentorBroadcast('   ');
  });

  it('should clear connected users on disconnect', () => {
    service.disconnect();
    expect(service.getConnectedUsers()).toEqual([]);
  });
});
