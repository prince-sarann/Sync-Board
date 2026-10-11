export type ToolType =
  | 'select'
  | 'pen'
  | 'pencil'
  | 'highlighter'
  | 'eraser'
  | 'line'
  | 'arrow'
  | 'rect'
  | 'circle'
  | 'text'
  | 'laser'
  | 'image';

export type GridStyle = 'dots' | 'grid' | 'lines' | 'none';

export interface Point {
  x: number;
  y: number;
  pressure?: number;
}

export interface BoardElement {
  id: string;
  pageId?: string;
  type: ToolType;
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

export interface WhiteboardPage {
  id: string;
  name: string;
  elements: BoardElement[];
  undoneElements?: BoardElement[];
  createdAt: number;
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

export interface RemoteCursor {
  socketId: string;
  userId: string;
  pageId?: string;
  name: string;
  role: 'teacher' | 'student';
  color: string;
  x: number;
  y: number;
  lastUpdate: number;
}

export interface LaserPoint {
  socketId: string;
  pageId?: string;
  name: string;
  color: string;
  x: number;
  y: number;
  timestamp: number;
  active: boolean;
}

export interface LiveStroke {
  socketId: string;
  userId?: string;
  pageId?: string;
  elementId: string;
  points: Point[];
  tool: string;
  color: string;
  size: number;
}

export interface RoomState {
  code: string;
  title: string;
  isLocked: boolean;
  isEnded: boolean;
  createdAt: number;
  pages?: WhiteboardPage[];
  activePageId?: string;
  elements: BoardElement[];
  participants: Participant[];
}

export type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected';

export interface CanvasTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface ToastMessage {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  duration?: number;
}

export interface VoicePeer {
  socketId: string;
  userId: string;
  name: string;
  color: string;
  role: 'teacher' | 'student';
  isMuted: boolean;
  isSpeaking: boolean;
  stream?: MediaStream;
}

export interface VoiceState {
  isConnected: boolean;
  isConnecting: boolean;
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
  error: string | null;
  activeSpeakers: Set<string>;
}
