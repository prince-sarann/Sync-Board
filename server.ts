import express, { Request, Response } from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  maxHttpBufferSize: 1e7, // 10MB for image/drawing payloads
});

app.use(express.json());

// Interface definitions
export interface Point {
  x: number;
  y: number;
  pressure?: number;
}

export interface BoardElement {
  id: string;
  pageId?: string;
  type: 'pen' | 'pencil' | 'highlighter' | 'eraser' | 'line' | 'arrow' | 'rect' | 'circle' | 'text' | 'select' | 'laser' | 'image';
  points?: Point[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  color: string;
  size: number;
  text?: string;
  imageUrl?: string;
  fontSize?: number;
  filled?: boolean;
  opacity?: number;
  userId: string;
  userName: string;
  userRole?: 'teacher' | 'student';
  timestamp: number;
}

export interface Participant {
  socketId: string;
  userId: string;
  name: string;
  role: 'teacher' | 'student';
  color: string;
  joinedAt: number;
  isVoiceActive?: boolean;
  isMuted?: boolean;
  isSpeaking?: boolean;
  cursor?: { x: number; y: number; lastActive: number };
}

export interface WhiteboardPage {
  id: string;
  name: string;
  elements: BoardElement[];
  undoneElements: BoardElement[];
  createdAt: number;
}

export interface ClassRoom {
  code: string;
  title: string;
  teacherSocketId: string;
  teacherUserId: string;
  isLocked: boolean;
  isEnded: boolean;
  createdAt: number;
  lastActivity: number;
  pages: WhiteboardPage[];
  activePageId: string;
  participants: Map<string, Participant>;
  voiceParticipants: Set<string>; // Set of socketIds connected to voice in this room
  studentCounter: number;
}

const PARTICIPANT_COLORS = [
  '#4F46E5', // Indigo
  '#059669', // Emerald
  '#DC2626', // Red
  '#D97706', // Amber
  '#0891B2', // Cyan
  '#7C3AED', // Violet
  '#DB2777', // Pink
  '#EA580C', // Orange
  '#0D9488', // Teal
  '#2563EB', // Blue
  '#9333EA', // Purple
  '#16A34A', // Green
];

const activeRooms = new Map<string, ClassRoom>();

// Generate 6-char unique alphanumeric code (unambiguous characters)
function generateClassCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let attempts = 0;
  while (attempts < 1000) {
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    if (!activeRooms.has(code)) {
      return code;
    }
    attempts++;
  }
  return 'SYNC' + Math.floor(10 + Math.random() * 89);
}

function getParticipantColor(index: number): string {
  return PARTICIPANT_COLORS[index % PARTICIPANT_COLORS.length];
}

function getRoomPage(room: ClassRoom, pageId?: string): WhiteboardPage | undefined {
  const targetId = pageId || room.activePageId;
  return room.pages.find((p) => p.id === targetId) || room.pages[0];
}

// REST API Health Check & Room Info
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', time: Date.now(), activeRoomsCount: activeRooms.size });
});

app.get('/api/room/:code', (req: Request, res: Response) => {
  const code = (req.params.code || '').toUpperCase().trim();
  const room = activeRooms.get(code);
  if (!room || room.isEnded) {
    return res.status(404).json({ exists: false, message: 'Class not found or has ended' });
  }

  return res.json({
    exists: true,
    code: room.code,
    title: room.title,
    isLocked: room.isLocked,
    participantsCount: room.participants.size,
    pagesCount: room.pages.length,
    createdAt: room.createdAt,
  });
});

// Socket.IO Room Management & Real-time Collaboration
io.on('connection', (socket: Socket) => {
  let currentRoomCode: string | null = null;
  let currentUserId: string | null = null;

  // Create new classroom
  socket.on('create_room', (data: { preferredName?: string; userId?: string; title?: string }, callback) => {
    try {
      const code = generateClassCode();
      const userId = data.userId || `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const teacherName = data.preferredName?.trim() || 'Teacher';
      const teacherColor = '#4F46E5';

      const teacherParticipant: Participant = {
        socketId: socket.id,
        userId,
        name: teacherName,
        role: 'teacher',
        color: teacherColor,
        joinedAt: Date.now(),
      };

      const initialPage: WhiteboardPage = {
        id: `page_${Date.now()}_1`,
        name: 'Page 1',
        elements: [],
        undoneElements: [],
        createdAt: Date.now(),
      };

      const room: ClassRoom = {
        code,
        title: data.title?.trim() || 'Collaborative Whiteboard',
        teacherSocketId: socket.id,
        teacherUserId: userId,
        isLocked: false,
        isEnded: false,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        pages: [initialPage],
        activePageId: initialPage.id,
        participants: new Map([[socket.id, teacherParticipant]]),
        voiceParticipants: new Set<string>(),
        studentCounter: 1,
      };

      activeRooms.set(code, room);
      currentRoomCode = code;
      currentUserId = userId;

      socket.join(code);

      const response = {
        success: true,
        code,
        room: {
          code,
          title: room.title,
          isLocked: room.isLocked,
          isEnded: room.isEnded,
          createdAt: room.createdAt,
          pages: room.pages.map(p => ({ id: p.id, name: p.name, elements: p.elements, createdAt: p.createdAt })),
          activePageId: room.activePageId,
          elements: initialPage.elements,
          participants: Array.from(room.participants.values()),
        },
        user: teacherParticipant,
      };

      if (typeof callback === 'function') {
        callback(response);
      }
    } catch (err: any) {
      if (typeof callback === 'function') {
        callback({ success: false, error: err.message || 'Failed to create class' });
      }
    }
  });

  // Join existing classroom
  socket.on('join_room', (data: { code: string; preferredName?: string; userId?: string }, callback) => {
    try {
      const rawCode = data.code?.toUpperCase().trim();
      if (!rawCode) {
        if (typeof callback === 'function') {
          return callback({ success: false, message: 'Class Code is required.' });
        }
        return;
      }

      const room = activeRooms.get(rawCode);
      if (!room) {
        if (typeof callback === 'function') {
          return callback({ success: false, message: 'Class not found. Please check the Class Code.' });
        }
        return;
      }

      if (room.isEnded) {
        if (typeof callback === 'function') {
          return callback({ success: false, message: 'This class has ended.' });
        }
        return;
      }

      const userId = data.userId || `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const isTeacher = room.teacherUserId === userId;

      let participantName: string;
      let participantRole: 'teacher' | 'student';

      if (isTeacher) {
        participantRole = 'teacher';
        participantName = data.preferredName?.trim() || 'Teacher';
        room.teacherSocketId = socket.id;
      } else {
        participantRole = 'student';
        if (data.preferredName && data.preferredName.trim().length > 0) {
          participantName = data.preferredName.trim();
        } else {
          participantName = `Student ${room.studentCounter++}`;
        }
      }

      const colorIndex = room.participants.size;
      const participantColor = isTeacher ? '#4F46E5' : getParticipantColor(colorIndex);

      const participant: Participant = {
        socketId: socket.id,
        userId,
        name: participantName,
        role: participantRole,
        color: participantColor,
        joinedAt: Date.now(),
      };

      room.participants.set(socket.id, participant);
      room.lastActivity = Date.now();
      currentRoomCode = rawCode;
      currentUserId = userId;

      socket.join(rawCode);

      // Notify other participants in the room
      socket.to(rawCode).emit('user_joined', { participant });

      const activePage = getRoomPage(room);

      const roomState = {
        code: room.code,
        title: room.title,
        isLocked: room.isLocked,
        isEnded: room.isEnded,
        createdAt: room.createdAt,
        pages: room.pages.map(p => ({ id: p.id, name: p.name, elements: p.elements, createdAt: p.createdAt })),
        activePageId: room.activePageId,
        elements: activePage ? activePage.elements : [],
        participants: Array.from(room.participants.values()),
      };

      if (typeof callback === 'function') {
        callback({
          success: true,
          code: room.code,
          room: roomState,
          user: participant,
        });
      }
    } catch (err: any) {
      if (typeof callback === 'function') {
        callback({ success: false, message: err.message || 'Could not join classroom' });
      }
    }
  });

  // ==========================================
  // MULTI-PAGE SYSTEM MANAGEMENT
  // ==========================================

  // Create a new blank page
  socket.on('page_create', (data: { code: string; name?: string }, callback) => {
    try {
      const { code } = data;
      if (!code) return;
      const room = activeRooms.get(code);
      if (!room || room.isEnded) return;

      const participant = room.participants.get(socket.id);
      if (room.isLocked && participant?.role !== 'teacher') return;

      const pageNumber = room.pages.length + 1;
      const pageName = data.name?.trim() || `Page ${pageNumber}`;
      const newPageId = `page_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      const newPage: WhiteboardPage = {
        id: newPageId,
        name: pageName,
        elements: [],
        undoneElements: [],
        createdAt: Date.now(),
      };

      room.pages.push(newPage);
      room.activePageId = newPageId;
      room.lastActivity = Date.now();

      const publicPages = room.pages.map(p => ({ id: p.id, name: p.name, elements: p.elements, createdAt: p.createdAt }));

      // Broadcast new page and page switch to all participants
      io.to(code).emit('pages_sync', {
        pages: publicPages,
        activePageId: newPageId,
        pageAdded: { id: newPage.id, name: newPage.name },
      });

      if (typeof callback === 'function') {
        callback({ success: true, pageId: newPageId, page: newPage });
      }
    } catch (err: any) {
      if (typeof callback === 'function') {
        callback({ success: false, error: err.message });
      }
    }
  });

  // Switch active page
  socket.on('page_switch', (data: { code: string; pageId: string }) => {
    try {
      const { code, pageId } = data;
      if (!code || !pageId) return;
      const room = activeRooms.get(code);
      if (!room || room.isEnded) return;

      const pageExists = room.pages.some(p => p.id === pageId);
      if (!pageExists) return;

      room.activePageId = pageId;
      room.lastActivity = Date.now();

      io.to(code).emit('page_switched', { pageId });
    } catch {
      // Safe fallback
    }
  });

  // Rename a page
  socket.on('page_rename', (data: { code: string; pageId: string; name: string }) => {
    try {
      const { code, pageId, name } = data;
      if (!code || !pageId || !name || !name.trim()) return;
      const room = activeRooms.get(code);
      if (!room || room.isEnded) return;

      const participant = room.participants.get(socket.id);
      if (room.isLocked && participant?.role !== 'teacher') return;

      const targetPage = room.pages.find(p => p.id === pageId);
      if (targetPage) {
        targetPage.name = name.trim();
        room.lastActivity = Date.now();

        io.to(code).emit('page_renamed', { pageId, name: targetPage.name });
      }
    } catch {
      // Safe fallback
    }
  });

  // Delete a page
  socket.on('page_delete', (data: { code: string; pageId: string }, callback) => {
    try {
      const { code, pageId } = data;
      if (!code || !pageId) return;
      const room = activeRooms.get(code);
      if (!room || room.isEnded) return;

      const participant = room.participants.get(socket.id);
      if (participant?.role !== 'teacher') {
        if (typeof callback === 'function') callback({ success: false, error: 'Only teacher can delete pages.' });
        return;
      }

      // Do not delete if only 1 page remains
      if (room.pages.length <= 1) {
        if (typeof callback === 'function') callback({ success: false, error: 'Cannot delete the only remaining page.' });
        return;
      }

      const pageIndex = room.pages.findIndex(p => p.id === pageId);
      if (pageIndex !== -1) {
        room.pages.splice(pageIndex, 1);

        // If the active page was deleted, switch to adjacent page
        if (room.activePageId === pageId) {
          const nextIndex = Math.min(pageIndex, room.pages.length - 1);
          room.activePageId = room.pages[nextIndex].id;
        }

        room.lastActivity = Date.now();
        const publicPages = room.pages.map(p => ({ id: p.id, name: p.name, elements: p.elements, createdAt: p.createdAt }));

        io.to(code).emit('pages_sync', {
          pages: publicPages,
          activePageId: room.activePageId,
        });

        if (typeof callback === 'function') callback({ success: true, activePageId: room.activePageId });
      }
    } catch (err: any) {
      if (typeof callback === 'function') callback({ success: false, error: err.message });
    }
  });

  // Duplicate a page
  socket.on('page_duplicate', (data: { code: string; pageId: string }, callback) => {
    try {
      const { code, pageId } = data;
      if (!code || !pageId) return;
      const room = activeRooms.get(code);
      if (!room || room.isEnded) return;

      const participant = room.participants.get(socket.id);
      if (room.isLocked && participant?.role !== 'teacher') return;

      const sourcePage = room.pages.find(p => p.id === pageId);
      if (!sourcePage) return;

      const newPageId = `page_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const duplicatedElements: BoardElement[] = sourcePage.elements.map(el => ({
        ...el,
        id: `el_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        pageId: newPageId,
      }));

      const newPage: WhiteboardPage = {
        id: newPageId,
        name: `${sourcePage.name} (Copy)`,
        elements: duplicatedElements,
        undoneElements: [],
        createdAt: Date.now(),
      };

      const sourceIndex = room.pages.findIndex(p => p.id === pageId);
      room.pages.splice(sourceIndex + 1, 0, newPage);
      room.activePageId = newPageId;
      room.lastActivity = Date.now();

      const publicPages = room.pages.map(p => ({ id: p.id, name: p.name, elements: p.elements, createdAt: p.createdAt }));

      io.to(code).emit('pages_sync', {
        pages: publicPages,
        activePageId: newPageId,
      });

      if (typeof callback === 'function') callback({ success: true, pageId: newPageId });
    } catch (err: any) {
      if (typeof callback === 'function') callback({ success: false, error: err.message });
    }
  });

  // ==========================================
  // DRAWING & ELEMENT OPERATIONS
  // ==========================================

  // Live drawing in-progress preview (transmits in-flight stroke points)
  socket.on('draw_live_step', (data: { code: string; pageId?: string; elementId: string; point: Point; tool: string; color: string; size: number }) => {
    if (!data.code) return;
    const room = activeRooms.get(data.code);
    if (!room || room.isEnded) return;
    if (room.isLocked) {
      const participant = room.participants.get(socket.id);
      if (participant?.role !== 'teacher') return;
    }

    const targetPageId = data.pageId || room.activePageId;

    socket.to(data.code).emit('draw_live_step', {
      socketId: socket.id,
      userId: currentUserId,
      pageId: targetPageId,
      elementId: data.elementId,
      point: data.point,
      tool: data.tool,
      color: data.color,
      size: data.size,
    });
  });

  // Add finalized element to active page
  socket.on('element_add', (data: { code: string; pageId?: string; element: BoardElement }, callback) => {
    const { code, element } = data;
    if (!code || !element) return;
    const room = activeRooms.get(code);
    if (!room || room.isEnded) {
      if (typeof callback === 'function') callback({ success: false, error: 'Class unavailable' });
      return;
    }

    if (room.isLocked) {
      const participant = room.participants.get(socket.id);
      if (participant?.role !== 'teacher') {
        if (typeof callback === 'function') callback({ success: false, error: 'Board is locked by teacher' });
        return;
      }
    }

    const targetPage = getRoomPage(room, data.pageId || element.pageId);
    if (!targetPage) return;

    element.pageId = targetPage.id;
    element.timestamp = Date.now();
    targetPage.elements.push(element);
    targetPage.undoneElements = []; // clear redo stack on new action
    room.lastActivity = Date.now();

    socket.to(code).emit('element_added', { pageId: targetPage.id, element });

    if (typeof callback === 'function') {
      callback({ success: true, elementId: element.id, pageId: targetPage.id });
    }
  });

  // Batch elements
  socket.on('elements_add_batch', (data: { code: string; pageId?: string; elements: BoardElement[] }) => {
    const { code, elements } = data;
    if (!code || !elements || !elements.length) return;
    const room = activeRooms.get(code);
    if (!room || room.isEnded) return;

    if (room.isLocked) {
      const participant = room.participants.get(socket.id);
      if (participant?.role !== 'teacher') return;
    }

    const targetPage = getRoomPage(room, data.pageId);
    if (!targetPage) return;

    elements.forEach(el => { el.pageId = targetPage.id; });
    targetPage.elements.push(...elements);
    targetPage.undoneElements = [];
    room.lastActivity = Date.now();

    socket.to(code).emit('elements_batch_added', { pageId: targetPage.id, elements });
  });

  // Update element
  socket.on('element_update', (data: { code: string; pageId?: string; elementId: string; updates: Partial<BoardElement> }) => {
    const { code, elementId, updates } = data;
    if (!code || !elementId) return;
    const room = activeRooms.get(code);
    if (!room || room.isEnded) return;

    if (room.isLocked) {
      const participant = room.participants.get(socket.id);
      if (participant?.role !== 'teacher') return;
    }

    const targetPage = getRoomPage(room, data.pageId);
    if (!targetPage) return;

    const index = targetPage.elements.findIndex(el => el.id === elementId);
    if (index !== -1) {
      targetPage.elements[index] = { ...targetPage.elements[index], ...updates };
      room.lastActivity = Date.now();
      socket.to(code).emit('element_updated', { pageId: targetPage.id, elementId, updates });
    }
  });

  // Delete element
  socket.on('element_delete', (data: { code: string; pageId?: string; elementId: string }) => {
    const { code, elementId } = data;
    if (!code || !elementId) return;
    const room = activeRooms.get(code);
    if (!room || room.isEnded) return;

    if (room.isLocked) {
      const participant = room.participants.get(socket.id);
      if (participant?.role !== 'teacher') return;
    }

    const targetPage = getRoomPage(room, data.pageId);
    if (!targetPage) return;

    const initialLen = targetPage.elements.length;
    targetPage.elements = targetPage.elements.filter(el => el.id !== elementId);
    if (targetPage.elements.length !== initialLen) {
      room.lastActivity = Date.now();
      socket.to(code).emit('element_deleted', { pageId: targetPage.id, elementId });
    }
  });

  // Clear CURRENT page board
  socket.on('board_clear', (data: { code: string; pageId?: string }) => {
    const { code } = data;
    if (!code) return;
    const room = activeRooms.get(code);
    if (!room || room.isEnded) return;

    const participant = room.participants.get(socket.id);
    if (participant?.role !== 'teacher') {
      return; // only teacher can clear the entire board
    }

    const targetPage = getRoomPage(room, data.pageId);
    if (!targetPage) return;

    if (targetPage.elements.length > 0) {
      targetPage.undoneElements = [...targetPage.elements];
      targetPage.elements = [];
      room.lastActivity = Date.now();
      io.to(code).emit('board_cleared', {
        pageId: targetPage.id,
        clearedBy: participant.name,
        pageName: targetPage.name,
      });
    }
  });

  // Undo (Page-scoped)
  socket.on('board_undo', (data: { code: string; pageId?: string }) => {
    const { code } = data;
    if (!code) return;
    const room = activeRooms.get(code);
    if (!room || room.isEnded) return;

    const targetPage = getRoomPage(room, data.pageId);
    if (!targetPage) return;

    const participant = room.participants.get(socket.id);
    if (room.isLocked && participant?.role !== 'teacher') return;

    // If whole board was just cleared, restoring the cleared board elements
    if (targetPage.elements.length === 0 && targetPage.undoneElements.length > 0) {
      targetPage.elements = [...targetPage.undoneElements];
      targetPage.undoneElements = [];
      room.lastActivity = Date.now();
      io.to(code).emit('board_state_sync', { pageId: targetPage.id, elements: targetPage.elements });
      return;
    }

    if (targetPage.elements.length === 0) return;

    // Find element to undo
    let elIndex = -1;
    if (participant?.role === 'teacher') {
      elIndex = targetPage.elements.length - 1;
    } else {
      for (let i = targetPage.elements.length - 1; i >= 0; i--) {
        if (targetPage.elements[i].userId === currentUserId) {
          elIndex = i;
          break;
        }
      }
    }

    if (elIndex !== -1) {
      const [undone] = targetPage.elements.splice(elIndex, 1);
      targetPage.undoneElements.push(undone);
      room.lastActivity = Date.now();
      io.to(code).emit('board_state_sync', { pageId: targetPage.id, elements: targetPage.elements });
    }
  });

  // Redo (Page-scoped)
  socket.on('board_redo', (data: { code: string; pageId?: string }) => {
    const { code } = data;
    if (!code) return;
    const room = activeRooms.get(code);
    if (!room || room.isEnded) return;

    const targetPage = getRoomPage(room, data.pageId);
    if (!targetPage || targetPage.undoneElements.length === 0) return;

    const participant = room.participants.get(socket.id);
    if (room.isLocked && participant?.role !== 'teacher') return;

    const redone = targetPage.undoneElements.pop();
    if (redone) {
      targetPage.elements.push(redone);
      room.lastActivity = Date.now();
      io.to(code).emit('board_state_sync', { pageId: targetPage.id, elements: targetPage.elements });
    }
  });

  // Lock / Unlock board (Teacher only)
  socket.on('board_lock_toggle', (data: { code: string; isLocked: boolean }) => {
    const { code, isLocked } = data;
    if (!code) return;
    const room = activeRooms.get(code);
    if (!room || room.isEnded) return;

    const participant = room.participants.get(socket.id);
    if (participant?.role !== 'teacher') return;

    room.isLocked = !!isLocked;
    room.lastActivity = Date.now();
    io.to(code).emit('board_lock_changed', { isLocked: room.isLocked });
  });

  // End Class (Teacher only)
  socket.on('class_end', (data: { code: string }) => {
    const { code } = data;
    if (!code) return;
    const room = activeRooms.get(code);
    if (!room) return;

    const participant = room.participants.get(socket.id);
    if (participant?.role !== 'teacher') return;

    room.isEnded = true;
    room.lastActivity = Date.now();

    io.to(code).emit('class_ended', {
      message: 'The teacher has ended this class.',
      code: room.code,
    });
  });

  // Live cursor movement (throttled)
  socket.on('cursor_move', (data: { code: string; pageId?: string; x: number; y: number }) => {
    if (!data.code) return;
    const room = activeRooms.get(data.code);
    if (!room || room.isEnded) return;

    const participant = room.participants.get(socket.id);
    if (!participant) return;

    participant.cursor = {
      x: data.x,
      y: data.y,
      lastActive: Date.now(),
    };

    socket.to(data.code).emit('cursor_moved', {
      socketId: socket.id,
      userId: participant.userId,
      pageId: data.pageId || room.activePageId,
      name: participant.name,
      role: participant.role,
      color: participant.color,
      x: data.x,
      y: data.y,
    });
  });

  // Laser pointer broadcast
  socket.on('laser_pointer', (data: { code: string; pageId?: string; x: number; y: number; active: boolean }) => {
    if (!data.code) return;
    const room = activeRooms.get(data.code);
    if (!room || room.isEnded) return;

    const participant = room.participants.get(socket.id);
    if (!participant) return;

    socket.to(data.code).emit('laser_pointer', {
      socketId: socket.id,
      name: participant.name,
      pageId: data.pageId || room.activePageId,
      color: participant.color,
      x: data.x,
      y: data.y,
      active: data.active,
    });
  });

  // ==========================================
  // REAL-TIME WEBRTC VOICE SIGNALING
  // ==========================================

  // User joins voice in the current room
  socket.on('voice_join', (data: { code: string }, callback) => {
    try {
      if (!data.code) return;
      const rawCode = data.code.toUpperCase().trim();
      const room = activeRooms.get(rawCode);
      if (!room || room.isEnded) {
        if (typeof callback === 'function') {
          callback({ success: false, message: 'Class is unavailable for voice.' });
        }
        return;
      }

      const participant = room.participants.get(socket.id);
      if (!participant) {
        if (typeof callback === 'function') {
          callback({ success: false, message: 'Participant not found in room.' });
        }
        return;
      }

      participant.isVoiceActive = true;
      participant.isMuted = false;
      participant.isSpeaking = false;

      const existingVoicePeers: Array<{
        socketId: string;
        userId: string;
        name: string;
        color: string;
        role: 'teacher' | 'student';
        isMuted: boolean;
        isSpeaking: boolean;
      }> = [];

      for (const peerSocketId of room.voiceParticipants) {
        if (peerSocketId !== socket.id) {
          const peer = room.participants.get(peerSocketId);
          if (peer && peer.isVoiceActive) {
            existingVoicePeers.push({
              socketId: peer.socketId,
              userId: peer.userId,
              name: peer.name,
              color: peer.color,
              role: peer.role,
              isMuted: !!peer.isMuted,
              isSpeaking: !!peer.isSpeaking,
            });
          }
        }
      }

      room.voiceParticipants.add(socket.id);

      socket.to(rawCode).emit('voice_peer_joined', {
        socketId: socket.id,
        userId: participant.userId,
        name: participant.name,
        color: participant.color,
        role: participant.role,
        isMuted: false,
        isSpeaking: false,
      });

      if (typeof callback === 'function') {
        callback({
          success: true,
          existingVoicePeers,
        });
      }
    } catch (err: any) {
      if (typeof callback === 'function') {
        callback({ success: false, message: err.message || 'Voice join failed.' });
      }
    }
  });

  // Relay WebRTC signals
  socket.on('voice_signal', (data: { code: string; targetSocketId: string; signal: any }) => {
    try {
      if (!data.code || !data.targetSocketId || !data.signal) return;
      const rawCode = data.code.toUpperCase().trim();
      const room = activeRooms.get(rawCode);
      if (!room || room.isEnded) return;

      if (room.voiceParticipants.has(data.targetSocketId) && room.voiceParticipants.has(socket.id)) {
        io.to(data.targetSocketId).emit('voice_signal', {
          senderSocketId: socket.id,
          signal: data.signal,
        });
      }
    } catch {
      // Safe fallback
    }
  });

  // Broadcast Mute status toggle
  socket.on('voice_mute_toggle', (data: { code: string; isMuted: boolean }) => {
    try {
      if (!data.code) return;
      const rawCode = data.code.toUpperCase().trim();
      const room = activeRooms.get(rawCode);
      if (!room || room.isEnded) return;

      const participant = room.participants.get(socket.id);
      if (participant) {
        participant.isMuted = !!data.isMuted;
        if (participant.isMuted) {
          participant.isSpeaking = false;
        }
        socket.to(rawCode).emit('voice_mute_changed', {
          socketId: socket.id,
          isMuted: participant.isMuted,
        });
      }
    } catch {
      // Ignore safely
    }
  });

  // Broadcast Active Speaking detection
  socket.on('voice_speaking', (data: { code: string; isSpeaking: boolean }) => {
    try {
      if (!data.code) return;
      const rawCode = data.code.toUpperCase().trim();
      const room = activeRooms.get(rawCode);
      if (!room || room.isEnded) return;

      const participant = room.participants.get(socket.id);
      if (participant && !participant.isMuted) {
        participant.isSpeaking = !!data.isSpeaking;
        socket.to(rawCode).emit('voice_speaking_changed', {
          socketId: socket.id,
          isSpeaking: participant.isSpeaking,
        });
      }
    } catch {
      // Ignore safely
    }
  });

  // User leaves voice
  socket.on('voice_leave', (data: { code: string }) => {
    try {
      if (!data.code) return;
      const rawCode = data.code.toUpperCase().trim();
      const room = activeRooms.get(rawCode);
      if (room) {
        const participant = room.participants.get(socket.id);
        if (participant) {
          participant.isVoiceActive = false;
          participant.isSpeaking = false;
        }
        room.voiceParticipants.delete(socket.id);
        socket.to(rawCode).emit('voice_peer_left', { socketId: socket.id });
      }
    } catch {
      // Ignore safely
    }
  });

  // User leaves classroom intentionally
  socket.on('leave_room', (data: { code: string }) => {
    try {
      if (!data.code) return;
      const room = activeRooms.get(data.code);
      if (room) {
        const participant = room.participants.get(socket.id);
        room.participants.delete(socket.id);
        if (room.voiceParticipants.has(socket.id)) {
          room.voiceParticipants.delete(socket.id);
          socket.to(data.code).emit('voice_peer_left', { socketId: socket.id });
        }
        socket.leave(data.code);
        if (participant) {
          socket.to(data.code).emit('user_left', {
            socketId: socket.id,
            userId: participant.userId,
            name: participant.name,
            remainingCount: room.participants.size,
          });
        }
      }
    } catch {
      // Ignore safely
    }
  });

  // Disconnect handler
  socket.on('disconnect', () => {
    try {
      if (currentRoomCode) {
        const room = activeRooms.get(currentRoomCode);
        if (room) {
          const participant = room.participants.get(socket.id);
          room.participants.delete(socket.id);
          if (room.voiceParticipants.has(socket.id)) {
            room.voiceParticipants.delete(socket.id);
            socket.to(currentRoomCode).emit('voice_peer_left', { socketId: socket.id });
          }
          if (participant) {
            socket.to(currentRoomCode).emit('user_left', {
              socketId: socket.id,
              userId: participant.userId,
              name: participant.name,
              remainingCount: room.participants.size,
            });
          }
        }
      }
    } catch {
      // Ignore safely
    }
  });
});

// Periodic cleanup of inactive ended rooms older than 6 hours
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of activeRooms.entries()) {
    if (room.isEnded && now - room.lastActivity > 2 * 60 * 60 * 1000) {
      activeRooms.delete(code);
    } else if (room.participants.size === 0 && now - room.lastActivity > 6 * 60 * 60 * 1000) {
      activeRooms.delete(code);
    }
  }
}, 30 * 60 * 1000);

// Setup Vite development middleware or static production serving
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';
  const PORT = Number(process.env.PORT) || 3000;

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`SyncBoard server is running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
