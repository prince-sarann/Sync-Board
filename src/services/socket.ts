import { io, Socket } from 'socket.io-client';
import { BoardElement, ConnectionStatus, Participant, Point, RoomState, VoicePeer, WhiteboardPage } from '../types';

class SocketService {
  private socket: Socket | null = null;
  private statusListeners: Set<(status: ConnectionStatus) => void> = new Set();
  private currentStatus: ConnectionStatus = 'disconnected';
  private currentRoomCode: string | null = null;
  private currentUserId: string = '';

  constructor() {
    // Generate or retrieve persistent user identity from session storage
    if (typeof window !== 'undefined') {
      let storedId = sessionStorage.getItem('syncboard_user_id');
      if (!storedId) {
        storedId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        sessionStorage.setItem('syncboard_user_id', storedId);
      }
      this.currentUserId = storedId;
    }
  }

  public getUserId(): string {
    return this.currentUserId;
  }

  public connect(): Socket {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    if (this.socket) {
      this.socket.connect();
      return this.socket;
    }

    // Connect to same origin
    const url = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    
    this.socket = io(url, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    this.socket.on('connect', () => {
      this.setStatus('connected');
      // If was previously in a room, re-join seamlessly
      if (this.currentRoomCode) {
        this.joinRoom(this.currentRoomCode);
      }
    });

    this.socket.on('reconnect_attempt', () => {
      this.setStatus('reconnecting');
    });

    this.socket.on('disconnect', () => {
      this.setStatus('disconnected');
    });

    this.socket.on('connect_error', () => {
      this.setStatus('reconnecting');
    });

    return this.socket;
  }

  public getSocket(): Socket | null {
    return this.socket;
  }

  public getStatus(): ConnectionStatus {
    return this.currentStatus;
  }

  public onStatusChange(callback: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(callback);
    callback(this.currentStatus);
    return () => {
      this.statusListeners.delete(callback);
    };
  }

  private setStatus(status: ConnectionStatus) {
    this.currentStatus = status;
    this.statusListeners.forEach((listener) => {
      try {
        listener(status);
      } catch (err) {
        console.error('Error in status listener:', err);
      }
    });
  }

  // Create room
  public async createRoom(preferredName?: string, title?: string): Promise<{ success: boolean; code?: string; room?: RoomState; user?: Participant; error?: string }> {
    const socket = this.connect();
    return new Promise((resolve) => {
      socket.emit('create_room', { preferredName, userId: this.currentUserId, title }, (response: any) => {
        if (response && response.success) {
          this.currentRoomCode = response.code;
          resolve(response);
        } else {
          resolve({ success: false, error: response?.error || 'Failed to create class' });
        }
      });
    });
  }

  // Join room
  public async joinRoom(code: string, preferredName?: string): Promise<{ success: boolean; code?: string; room?: RoomState; user?: Participant; message?: string }> {
    const socket = this.connect();
    return new Promise((resolve) => {
      socket.emit('join_room', { code: code.toUpperCase().trim(), preferredName, userId: this.currentUserId }, (response: any) => {
        if (response && response.success) {
          this.currentRoomCode = response.code;
          resolve(response);
        } else {
          resolve({ success: false, message: response?.message || 'Failed to join class' });
        }
      });
    });
  }

  // ==========================================
  // MULTI-PAGE WHITEBOARD ACTIONS
  // ==========================================

  public async emitPageCreate(code: string, name?: string): Promise<{ success: boolean; pageId?: string; page?: WhiteboardPage; error?: string }> {
    const socket = this.connect();
    return new Promise((resolve) => {
      socket.emit('page_create', { code, name }, (response: any) => {
        resolve(response || { success: false, error: 'Failed to create page' });
      });
    });
  }

  public emitPageSwitch(code: string, pageId: string) {
    if (!this.socket) return;
    this.socket.emit('page_switch', { code, pageId });
  }

  public emitPageRename(code: string, pageId: string, name: string) {
    if (!this.socket) return;
    this.socket.emit('page_rename', { code, pageId, name });
  }

  public async emitPageDelete(code: string, pageId: string): Promise<{ success: boolean; activePageId?: string; error?: string }> {
    const socket = this.connect();
    return new Promise((resolve) => {
      socket.emit('page_delete', { code, pageId }, (response: any) => {
        resolve(response || { success: false, error: 'Failed to delete page' });
      });
    });
  }

  public async emitPageDuplicate(code: string, pageId: string): Promise<{ success: boolean; pageId?: string; error?: string }> {
    const socket = this.connect();
    return new Promise((resolve) => {
      socket.emit('page_duplicate', { code, pageId }, (response: any) => {
        resolve(response || { success: false, error: 'Failed to duplicate page' });
      });
    });
  }

  // Live in-progress stroke drawing
  public emitLiveStroke(code: string, elementId: string, point: Point, tool: string, color: string, size: number, pageId?: string) {
    if (!this.socket) return;
    this.socket.emit('draw_live_step', { code, pageId, elementId, point, tool, color, size });
  }

  // Finalized element addition
  public emitElementAdd(code: string, element: BoardElement, pageId?: string) {
    if (!this.socket) return;
    this.socket.emit('element_add', { code, pageId, element });
  }

  // Batch element addition
  public emitElementsBatch(code: string, elements: BoardElement[], pageId?: string) {
    if (!this.socket) return;
    this.socket.emit('elements_add_batch', { code, pageId, elements });
  }

  // Element update
  public emitElementUpdate(code: string, elementId: string, updates: Partial<BoardElement>, pageId?: string) {
    if (!this.socket) return;
    this.socket.emit('element_update', { code, pageId, elementId, updates });
  }

  // Element delete
  public emitElementDelete(code: string, elementId: string, pageId?: string) {
    if (!this.socket) return;
    this.socket.emit('element_delete', { code, pageId, elementId });
  }

  // Board clear (active page)
  public emitBoardClear(code: string, pageId?: string) {
    if (!this.socket) return;
    this.socket.emit('board_clear', { code, pageId });
  }

  // Board undo (active page)
  public emitBoardUndo(code: string, pageId?: string) {
    if (!this.socket) return;
    this.socket.emit('board_undo', { code, pageId });
  }

  // Board redo (active page)
  public emitBoardRedo(code: string, pageId?: string) {
    if (!this.socket) return;
    this.socket.emit('board_redo', { code, pageId });
  }

  // Lock / Unlock board
  public emitBoardLock(code: string, isLocked: boolean) {
    if (!this.socket) return;
    this.socket.emit('board_lock_toggle', { code, isLocked });
  }

  // End Class
  public emitClassEnd(code: string) {
    if (!this.socket) return;
    this.socket.emit('class_end', { code });
  }

  // Cursor movement
  public emitCursorMove(code: string, x: number, y: number, pageId?: string) {
    if (!this.socket) return;
    this.socket.emit('cursor_move', { code, pageId, x, y });
  }

  // Laser pointer
  public emitLaserPointer(code: string, x: number, y: number, active: boolean, pageId?: string) {
    if (!this.socket) return;
    this.socket.emit('laser_pointer', { code, pageId, x, y, active });
  }

  // Leave room
  public leaveRoom(code: string) {
    if (this.socket) {
      this.socket.emit('leave_room', { code });
    }
    this.currentRoomCode = null;
  }

  // ==========================================
  // WEBRTC VOICE SIGNALING METHODS
  // ==========================================

  public async emitVoiceJoin(code: string): Promise<{ success: boolean; existingVoicePeers?: VoicePeer[]; message?: string }> {
    const socket = this.connect();
    return new Promise((resolve) => {
      socket.emit('voice_join', { code }, (response: any) => {
        if (response && response.success) {
          resolve(response);
        } else {
          resolve({ success: false, message: response?.message || 'Voice connection failed.' });
        }
      });
    });
  }

  public emitVoiceSignal(code: string, targetSocketId: string, signal: any) {
    if (!this.socket) return;
    this.socket.emit('voice_signal', { code, targetSocketId, signal });
  }

  public emitVoiceMuteToggle(code: string, isMuted: boolean) {
    if (!this.socket) return;
    this.socket.emit('voice_mute_toggle', { code, isMuted });
  }

  public emitVoiceSpeaking(code: string, isSpeaking: boolean) {
    if (!this.socket) return;
    this.socket.emit('voice_speaking', { code, isSpeaking });
  }

  public emitVoiceLeave(code: string) {
    if (!this.socket) return;
    this.socket.emit('voice_leave', { code });
  }
}

export const socketService = new SocketService();
