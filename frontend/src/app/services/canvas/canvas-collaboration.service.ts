/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-empty */
import { Injectable } from '@angular/core';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { Subject, Observable, BehaviorSubject } from 'rxjs';

export interface RemoteCanvasEvent {
  type: 'draw_line' | 'line' | 'draw_shape' | 'clear';
  shapeType?: string;
  userId?: number;
  username?: string;
  tool?: string;
  globalCompositeOperation?: string;
  points?: number[];
  stroke?: string;
  strokeWidth?: number;
  tension?: number;
  fill?: string;
  opacity?: number;
  role?: 'mentor' | 'student' | 'staff' | 'parent' | null;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  radius?: number;
  radiusX?: number;
  radiusY?: number;
  timestamp?: number;
}

export interface CursorPosition {
  x: number;
  y: number;
  userId: number;
  username: string;
  color: string;
}

export interface UserPresence {
  userId: number;
  username: string;
  isOnline: boolean;
  joinedAt: string;
  role?: string;
}

export interface ChatMessage {
  message: string;
  username: string;
  userId?: number;
  role?: string;
  timestamp: string;
}

export interface HandRaiseEvent {
  raised: boolean;
  username: string;
  userId?: number;
  timestamp: string;
}

export interface MentorBroadcast {
  message: string;
  username: string;
  timestamp: string;
  canvasState?: string;
  targetUserId?: number;
  canvasWidth?: number;
  canvasHeight?: number;
}

export interface WebSocketMessage {
  type:
    | 'canvas_event'
    | 'cursor_move'
    | 'cursor_position'
    | 'user_joined'
    | 'user_left'
    | 'chat_message'
    | 'hand_raise'
    | 'mentor_broadcast'
    | 'presence_sync'
    | 'permission_update'
    | 'webrtc_signal'
    | 'clear'
    | 'error';
  event?: RemoteCanvasEvent;
  position?: { x: number; y: number };
  username?: string;
  user_id?: number;
  role?: string;
  message?: string;
  raised?: boolean;
  timestamp?: string;
  hand_raised?: boolean;
  recent_chats?: ChatMessage[];
  canDraw?: boolean;
  targetUserId?: number;
  payload?: any;
  target_id?: number;
  sender_id?: number;
  canvas_state?: string;
  canvas_width?: number;
  canvas_height?: number;
}

@Injectable({
  providedIn: 'root',
})
export class CanvasCollaborationService {
  private socket$: WebSocketSubject<WebSocketMessage> | null = null;
  private sessionId: number | null = null;

  private canvasEvents$ = new Subject<RemoteCanvasEvent>();
  private cursorPositions$ = new Subject<CursorPosition>();
  private userPresence$ = new BehaviorSubject<UserPresence[]>([]);
  private connectionStatus$ = new Subject<boolean>();
  private errors$ = new Subject<string>();
  private chatMessages$ = new Subject<ChatMessage>();
  private handRaises$ = new Subject<HandRaiseEvent>();
  private mentorBroadcasts$ = new Subject<MentorBroadcast>();
  private permissionUpdates$ = new Subject<{ canDraw: boolean; targetUserId?: number }>();
  private webrtcSignals$ = new Subject<{ senderId: number; payload: any }>();
  private clearBoard$ = new Subject<void>();
  private userJoinedSubject$ = new Subject<number>();

  private currentUser: { id: number; username: string; color: string } | null = null;
  private connectedUsers: Map<number, UserPresence> = new Map();
  private myHandRaised = false;
  private myChatMessages: ChatMessage[] = [];

  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  connect(sessionId: number, user: { id: number; username: string; color: string }): void {
    this.sessionId = sessionId;
    this.currentUser = user;
    this.reconnectAttempts = 0;

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.hostname}:8000/ws/canvas/${sessionId}/`;

    this.socket$ = webSocket<WebSocketMessage>({
      url: wsUrl,
      openObserver: {
        next: () => {
          this.connectionStatus$.next(true);
          this.reconnectAttempts = 0;
        },
      },
      closeObserver: {
        next: (event) => {
          this.connectionStatus$.next(false);
          this.handleDisconnect();
        },
      },
    });

    this.socket$.subscribe({
      next: (message) => this.handleMessage(message),
      error: (err) => this.handleError(err),
    });
  }

  disconnect(): void {
    if (this.socket$) {
      this.socket$.complete();
      this.socket$ = null;
    }
    this.sessionId = null;
    this.currentUser = null;
    this.connectedUsers.clear();
    this.myHandRaised = false;
    this.myChatMessages = [];
    this.userPresence$.next([]);
  }

  sendCanvasEvent(event: RemoteCanvasEvent): void {
    if (!this.socket$ || !this.currentUser) return;

    const enrichedEvent: RemoteCanvasEvent = {
      ...event,
      userId: this.currentUser.id,
      username: this.currentUser.username,
      timestamp: Date.now(),
    };

    this.socket$.next({
      type: 'canvas_event',
      event: enrichedEvent,
    });
  }

  sendCursorPosition(x: number, y: number): void {
    if (!this.socket$ || !this.currentUser) return;

    this.socket$.next({
      type: 'cursor_move',
      position: { x, y },
    });
  }

  sendChatMessage(message: string): void {
    if (!this.socket$ || !message.trim()) return;

    this.socket$.next({
      type: 'chat_message',
      message: message.trim().slice(0, 500),
    });
  }

  raiseHand(raise: boolean): void {
    if (!this.socket$) return;

    this.myHandRaised = raise;
    this.socket$.next({
      type: 'hand_raise',
      raised: raise,
    });
  }

  sendMentorBroadcast(
    message: string,
    canvasState?: string,
    targetUserId?: number,
    canvasWidth?: number,
    canvasHeight?: number,
  ): void {
    if (!this.socket$) return;
    if (!message.trim() && !canvasState) return;

    this.socket$.next({
      type: 'mentor_broadcast',
      message: message ? message.trim().slice(0, 500) : '',
      canvas_state: canvasState,
      targetUserId: targetUserId,
      canvas_width: canvasWidth,
      canvas_height: canvasHeight,
    });
  }

  sendPresenceSync(): void {
    if (!this.socket$ || !this.currentUser) return;

    this.socket$.next({
      type: 'presence_sync',
      username: this.currentUser.username,
      user_id: this.currentUser.id,
      timestamp: new Date().toISOString(),
      hand_raised: this.myHandRaised,
      recent_chats: this.myChatMessages,
    });
  }

  getCanvasEvents(): Observable<RemoteCanvasEvent> {
    return this.canvasEvents$.asObservable();
  }

  getCursorPositions(): Observable<CursorPosition> {
    return this.cursorPositions$.asObservable();
  }

  getUserPresence(): Observable<UserPresence[]> {
    return this.userPresence$.asObservable();
  }

  getConnectionStatus(): Observable<boolean> {
    return this.connectionStatus$.asObservable();
  }

  getErrors(): Observable<string> {
    return this.errors$.asObservable();
  }

  getChatMessages(): Observable<ChatMessage> {
    return this.chatMessages$.asObservable();
  }

  getHandRaises(): Observable<HandRaiseEvent> {
    return this.handRaises$.asObservable();
  }

  getMentorBroadcasts(): Observable<MentorBroadcast> {
    return this.mentorBroadcasts$.asObservable();
  }

  getPermissionUpdates(): Observable<{ canDraw: boolean; targetUserId?: number }> {
    return this.permissionUpdates$.asObservable();
  }

  getWebRtcSignals(): Observable<{ senderId: number; payload: any }> {
    return this.webrtcSignals$.asObservable();
  }

  getClearBoard(): Observable<void> {
    return this.clearBoard$.asObservable();
  }

  public get userJoined$(): Observable<number> {
    return this.userJoinedSubject$.asObservable();
  }

  sendPermissionUpdate(canDraw: boolean, targetUserId?: number): void {
    if (!this.socket$ || !this.currentUser) return;
    this.socket$.next({
      type: 'permission_update',
      canDraw,
      targetUserId,
    });
  }

  sendWebRtcSignal(targetUserId: number, payload: any): void {
    if (!this.socket$ || !this.currentUser) return;
    this.socket$.next({
      type: 'webrtc_signal',
      target_id: targetUserId,
      payload: payload,
    });
  }

  sendClearBoard(): void {
    if (!this.socket$ || !this.currentUser) return;
    this.socket$.next({
      type: 'clear',
    });
  }

  getConnectedUsers(): UserPresence[] {
    return Array.from(this.connectedUsers.values());
  }

  private handleMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case 'canvas_event':
        if (message.event && message.username && message.event.userId !== this.currentUser?.id) {
          this.canvasEvents$.next({
            ...message.event,
            username: message.username,
          });
        }
        break;

      case 'cursor_move':
        if (message.position && message.user_id !== this.currentUser?.id) {
          const user = this.connectedUsers.get(message.user_id || 0);
          this.cursorPositions$.next({
            x: message.position.x,
            y: message.position.y,
            userId: message.user_id || 0,
            username: message.username || 'Unknown',
            color: user ? '#3b82f6' : '#f59e0b',
          });
        }
        break;

      case 'user_joined':
        if (message.user_id && message.username) {
          const presence: UserPresence = {
            userId: message.user_id,
            username: message.username,
            isOnline: true,
            joinedAt: message.timestamp || new Date().toISOString(),
            role: message.role,
          };
          this.connectedUsers.set(message.user_id, presence);
          this.userPresence$.next(this.getConnectedUsers());
          this.userJoinedSubject$.next(message.user_id);

          if (this.currentUser && message.user_id !== this.currentUser.id) {
            this.sendPresenceSync();
          }
        }
        break;

      case 'presence_sync':
        if (
          message.user_id &&
          message.username &&
          this.currentUser &&
          message.user_id !== this.currentUser.id
        ) {
          const presence: UserPresence = {
            userId: message.user_id,
            username: message.username,
            isOnline: true,
            joinedAt: message.timestamp || new Date().toISOString(),
            role: message.role,
          };
          this.connectedUsers.set(message.user_id, presence);
          this.userPresence$.next(this.getConnectedUsers());

          if (message.hand_raised !== undefined) {
            this.handRaises$.next({
              raised: message.hand_raised,
              username: message.username,
              userId: message.user_id,
              timestamp: message.timestamp || new Date().toISOString(),
            });
          }
          if (message.recent_chats && Array.isArray(message.recent_chats)) {
            message.recent_chats.forEach((chat) => {
              this.chatMessages$.next(chat);
            });
          }
        }
        break;

      case 'user_left':
        if (message.user_id) {
          this.connectedUsers.delete(message.user_id);
          this.userPresence$.next(this.getConnectedUsers());
        }
        break;

      case 'chat_message': {
        const chatMsg: ChatMessage = {
          message: message.message || '',
          username: message.username || 'Unknown',
          userId: message.user_id,
          role: message.role,
          timestamp: message.timestamp || new Date().toISOString(),
        };
        if (chatMsg.userId === this.currentUser?.id) {
          this.myChatMessages.push(chatMsg);
        }
        this.chatMessages$.next(chatMsg);
        break;
      }

      case 'hand_raise':
        this.handRaises$.next({
          raised: message.raised || false,
          username: message.username || 'Unknown',
          userId: message.user_id,
          timestamp: message.timestamp || new Date().toISOString(),
        });
        break;

      case 'mentor_broadcast':
        this.mentorBroadcasts$.next({
          message: message.message || '',
          username: message.username || 'Mentor',
          timestamp: message.timestamp || new Date().toISOString(),
          canvasState: message.canvas_state,
          targetUserId: message.targetUserId,
          canvasWidth: message.canvas_width,
          canvasHeight: message.canvas_height,
        });
        break;

      case 'permission_update':
        if (message.canDraw !== undefined) {
          this.permissionUpdates$.next({
            canDraw: message.canDraw,
            targetUserId: message.targetUserId,
          });
        }
        break;

      case 'webrtc_signal':
        if (message.payload && message.sender_id) {
          this.webrtcSignals$.next({
            senderId: message.sender_id,
            payload: message.payload,
          });
        }
        break;

      case 'clear':
        this.clearBoard$.next();
        break;

      case 'error':
        this.errors$.next(message.message || 'WebSocket error');
        break;
    }
  }

  private handleError(error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : 'WebSocket connection failed';
    this.errors$.next(errorMessage);
  }

  private handleDisconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts && this.sessionId && this.currentUser) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

      setTimeout(() => {
        if (this.sessionId && this.currentUser) {
          this.connect(this.sessionId, this.currentUser);
        }
      }, delay);
    } else {
      this.errors$.next('Max reconnection attempts reached. Please refresh the page.');
    }
  }
}
