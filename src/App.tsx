/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  BoardElement,
  CanvasTransform,
  ConnectionStatus,
  GridStyle,
  LaserPoint,
  LiveStroke,
  Participant,
  Point,
  RemoteCursor,
  ToastMessage,
  ToolType,
  VoicePeer,
  VoiceState,
  WhiteboardPage,
} from './types';
import { socketService } from './services/socket';
import { voiceManager } from './services/voice';
import { Canvas } from './components/whiteboard/Canvas';
import { Toolbar } from './components/whiteboard/Toolbar';
import { TopBar } from './components/whiteboard/TopBar';
import { PageNavigation } from './components/whiteboard/PageNavigation';
import { UndoRedoControls } from './components/whiteboard/UndoRedoControls';
import { ShareModal } from './components/whiteboard/ShareModal';
import { ParticipantListModal } from './components/whiteboard/ParticipantListModal';
import { ClassEndedModal } from './components/whiteboard/ClassEndedModal';
import { VoiceControlBar } from './components/voice/VoiceControlBar';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ToastContainer } from './components/common/Toast';
import { LandingPage } from './components/landing/LandingPage';
import { copyBoardToClipboard, exportAllPagesToPDF, exportToPDF, exportToPNG } from './utils/export';

export default function App() {
  // App Navigation & Session State
  const [inClassroom, setInClassroom] = useState(false);
  const [classCode, setClassCode] = useState<string>('');
  const [roomTitle, setRoomTitle] = useState<string>('Whiteboard Session');
  const [currentUser, setCurrentUser] = useState<Participant | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLocked, setIsLocked] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [joinErrorMessage, setJoinErrorMessage] = useState<string | null>(null);

  // URL Deep Link detection (e.g. /join/K7P2XA or ?code=K7P2XA)
  const [initialJoinCode, setInitialJoinCode] = useState<string>('');

  // Multi-Page Whiteboard State
  const [pages, setPages] = useState<WhiteboardPage[]>([
    { id: 'page_1', name: 'Page 1', elements: [], createdAt: Date.now() },
  ]);
  const [activePageId, setActivePageId] = useState<string>('page_1');

  // Live in-flight drawing previews and collaborative indicators
  const [liveStrokes, setLiveStrokes] = useState<Map<string, LiveStroke>>(new Map());
  const [remoteCursors, setRemoteCursors] = useState<Map<string, RemoteCursor>>(new Map());
  const [laserPoints, setLaserPoints] = useState<Map<string, LaserPoint>>(new Map());

  // WebRTC Voice State
  const [voiceState, setVoiceState] = useState<VoiceState>(voiceManager.getState());
  const [voicePeers, setVoicePeers] = useState<VoicePeer[]>([]);

  // Active Tool & Settings
  const [currentTool, setCurrentTool] = useState<ToolType>('pen');
  const [currentColor, setCurrentColor] = useState<string>('#1E293B');
  const [currentSize, setCurrentSize] = useState<number>(4);
  const [isFilled, setIsFilled] = useState<boolean>(false);
  const [gridStyle, setGridStyle] = useState<GridStyle>('dots');
  const [transform, setTransform] = useState<CanvasTransform>({ scale: 1, offsetX: 0, offsetY: 0 });

  // Modals & Dialogs
  const [showShareModal, setShowShareModal] = useState(false);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [showClassEndedModal, setShowClassEndedModal] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showEndClassConfirm, setShowEndClassConfirm] = useState(false);

  // Toast Notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', duration = 3000) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, message, type, duration }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Compute active page & active elements
  const activePage = pages.find((p) => p.id === activePageId) || pages[0] || {
    id: 'page_1',
    name: 'Page 1',
    elements: [],
    createdAt: Date.now(),
  };
  const activeElements = activePage.elements || [];

  // Parse path for /join/:code or query param on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      const match = pathname.match(/\/join\/([A-Za-z0-9]{4,8})/i);
      if (match && match[1]) {
        setInitialJoinCode(match[1].toUpperCase());
      } else {
        const params = new URLSearchParams(window.location.search);
        const codeParam = params.get('code') || params.get('join');
        if (codeParam) {
          setInitialJoinCode(codeParam.toUpperCase());
        }
      }
    }
  }, []);

  // Listen to connection status changes
  useEffect(() => {
    const unsubscribe = socketService.onStatusChange((status) => {
      setConnectionStatus(status);
      if (status === 'reconnecting') {
        addToast('Reconnecting to classroom server...', 'warning', 2500);
      } else if (status === 'connected' && inClassroom) {
        addToast('Reconnected successfully.', 'success', 2000);
      }
    });
    return unsubscribe;
  }, [inClassroom, addToast]);

  // Online / Offline Network Listeners
  useEffect(() => {
    const handleOnline = () => {
      addToast('Internet connection restored.', 'success');
      socketService.connect();
    };

    const handleOffline = () => {
      addToast('Internet connection lost. Waiting to reconnect...', 'error', 6000);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [addToast]);

  // Subscribe to WebRTC Voice State
  useEffect(() => {
    const unsubscribe = voiceManager.subscribe((state, peers) => {
      setVoiceState(state);
      setVoicePeers(peers);
      if (state.error) {
        addToast(state.error, 'error', 4500);
      }
    });
    return unsubscribe;
  }, [addToast]);

  // Socket event listeners for active classroom
  useEffect(() => {
    const socket = socketService.connect();

    // Multi-page sync
    const handlePagesSync = (data: { pages: WhiteboardPage[]; activePageId?: string; pageAdded?: { id: string; name: string } }) => {
      if (data.pages && Array.isArray(data.pages)) {
        setPages(data.pages);
      }
      if (data.activePageId) {
        setActivePageId(data.activePageId);
      }
      if (data.pageAdded) {
        addToast(`Page "${data.pageAdded.name}" created`, 'info', 2000);
      }
    };

    // Page switched
    const handlePageSwitched = (data: { pageId: string }) => {
      setActivePageId(data.pageId);
      setLiveStrokes(new Map());
    };

    // Page renamed
    const handlePageRenamed = (data: { pageId: string; name: string }) => {
      setPages((prev) =>
        prev.map((p) => (p.id === data.pageId ? { ...p, name: data.name } : p))
      );
    };

    // Live stroke step from remote peers
    const handleDrawLiveStep = (data: {
      socketId: string;
      userId?: string;
      pageId?: string;
      elementId: string;
      point: Point;
      tool: string;
      color: string;
      size: number;
    }) => {
      try {
        // Only render if stroke belongs to active page or no pageId specified
        if (data.pageId && data.pageId !== activePageId) return;

        setLiveStrokes((prev: Map<string, LiveStroke>) => {
          const next = new Map<string, LiveStroke>(prev);
          const existing = next.get(data.elementId);
          if (existing) {
            next.set(data.elementId, {
              ...existing,
              points: [...existing.points, data.point],
            });
          } else {
            next.set(data.elementId, {
              socketId: data.socketId,
              userId: data.userId,
              pageId: data.pageId,
              elementId: data.elementId,
              points: [data.point],
              tool: data.tool,
              color: data.color,
              size: data.size,
            });
          }
          return next;
        });
      } catch {
        // Safe ignore
      }
    };

    // Finalized element added
    const handleElementAdded = (data: { pageId?: string; element: BoardElement }) => {
      try {
        const targetPageId = data.pageId || data.element.pageId || activePageId;

        setPages((prevPages) =>
          prevPages.map((page) => {
            if (page.id === targetPageId) {
              if (page.elements.some((el) => el.id === data.element.id)) return page;
              return { ...page, elements: [...page.elements, data.element] };
            }
            return page;
          })
        );

        setLiveStrokes((prev: Map<string, LiveStroke>) => {
          if (prev.has(data.element.id)) {
            const next = new Map<string, LiveStroke>(prev);
            next.delete(data.element.id);
            return next;
          }
          return prev;
        });
      } catch {
        // Safe ignore
      }
    };

    // Batch elements added
    const handleElementsBatchAdded = (data: { pageId?: string; elements: BoardElement[] }) => {
      try {
        const targetPageId = data.pageId || activePageId;
        setPages((prevPages) =>
          prevPages.map((page) => {
            if (page.id === targetPageId) {
              const existingIds = new Set(page.elements.map((e) => e.id));
              const newOnes = data.elements.filter((e) => !existingIds.has(e.id));
              return { ...page, elements: [...page.elements, ...newOnes] };
            }
            return page;
          })
        );
      } catch {
        // Safe ignore
      }
    };

    // Element updated
    const handleElementUpdated = (data: { pageId?: string; elementId: string; updates: Partial<BoardElement> }) => {
      try {
        setPages((prevPages) =>
          prevPages.map((page) => {
            if (!data.pageId || page.id === data.pageId) {
              return {
                ...page,
                elements: page.elements.map((el) =>
                  el.id === data.elementId ? { ...el, ...data.updates } : el
                ),
              };
            }
            return page;
          })
        );
      } catch {
        // Safe ignore
      }
    };

    // Element deleted
    const handleElementDeleted = (data: { pageId?: string; elementId: string }) => {
      try {
        setPages((prevPages) =>
          prevPages.map((page) => {
            if (!data.pageId || page.id === data.pageId) {
              return {
                ...page,
                elements: page.elements.filter((el) => el.id !== data.elementId),
              };
            }
            return page;
          })
        );
      } catch {
        // Safe ignore
      }
    };

    // Board state sync (undo/redo)
    const handleBoardStateSync = (data: { pageId?: string; elements: BoardElement[] }) => {
      try {
        const targetPageId = data.pageId || activePageId;
        setPages((prevPages) =>
          prevPages.map((page) => {
            if (page.id === targetPageId) {
              return { ...page, elements: data.elements || [] };
            }
            return page;
          })
        );
        setLiveStrokes(new Map());
      } catch {
        // Safe ignore
      }
    };

    // Board cleared
    const handleBoardCleared = (data: { pageId?: string; clearedBy?: string; pageName?: string }) => {
      const targetPageId = data.pageId || activePageId;
      setPages((prevPages) =>
        prevPages.map((page) => {
          if (page.id === targetPageId) {
            return { ...page, elements: [] };
          }
          return page;
        })
      );
      setLiveStrokes(new Map());
      addToast(`${data.clearedBy || 'Teacher'} cleared the board on ${data.pageName || 'current page'}`, 'info');
    };

    // Board lock status changed
    const handleBoardLockChanged = (data: { isLocked: boolean }) => {
      setIsLocked(data.isLocked);
      addToast(
        data.isLocked ? 'Board locked by teacher (Drawing disabled)' : 'Board unlocked by teacher (Drawing enabled)',
        data.isLocked ? 'warning' : 'success'
      );
    };

    // Class ended by teacher
    const handleClassEnded = (data: { message: string; code: string }) => {
      setIsEnded(true);
      setShowClassEndedModal(true);
      voiceManager.leaveVoice();
      addToast(data.message || 'Class has ended', 'error', 6000);
    };

    // Remote user cursor moved
    const handleCursorMoved = (data: {
      socketId: string;
      userId: string;
      pageId?: string;
      name: string;
      role: 'teacher' | 'student';
      color: string;
      x: number;
      y: number;
    }) => {
      try {
        if (data.pageId && data.pageId !== activePageId) return;

        setRemoteCursors((prev: Map<string, RemoteCursor>) => {
          const next = new Map<string, RemoteCursor>(prev);
          next.set(data.socketId, {
            socketId: data.socketId,
            userId: data.userId,
            pageId: data.pageId,
            name: data.name,
            role: data.role,
            color: data.color,
            x: data.x,
            y: data.y,
            lastUpdate: Date.now(),
          });
          return next;
        });
      } catch {
        // Safe ignore
      }
    };

    // Laser pointer update
    const handleLaserPointer = (data: {
      socketId: string;
      pageId?: string;
      name: string;
      color: string;
      x: number;
      y: number;
      active: boolean;
    }) => {
      try {
        if (data.pageId && data.pageId !== activePageId) return;

        setLaserPoints((prev: Map<string, LaserPoint>) => {
          const next = new Map<string, LaserPoint>(prev);
          next.set(data.socketId, {
            socketId: data.socketId,
            pageId: data.pageId,
            name: data.name,
            color: data.color,
            x: data.x,
            y: data.y,
            timestamp: Date.now(),
            active: data.active,
          });
          return next;
        });
      } catch {
        // Safe ignore
      }
    };

    // User joined room
    const handleUserJoined = (data: { participant: Participant }) => {
      setParticipants((prev) => {
        if (prev.some((p) => p.socketId === data.participant.socketId)) return prev;
        return [...prev, data.participant];
      });
      addToast(`${data.participant.name} joined the class`, 'info');
    };

    // User left room
    const handleUserLeft = (data: { socketId: string; name: string }) => {
      setParticipants((prev) => prev.filter((p) => p.socketId !== data.socketId));
      setRemoteCursors((prev: Map<string, RemoteCursor>) => {
        const next = new Map<string, RemoteCursor>(prev);
        next.delete(data.socketId);
        return next;
      });
      setLaserPoints((prev: Map<string, LaserPoint>) => {
        const next = new Map<string, LaserPoint>(prev);
        next.delete(data.socketId);
        return next;
      });
      addToast(`${data.name} left the class`, 'info');
    };

    socket.on('pages_sync', handlePagesSync);
    socket.on('page_switched', handlePageSwitched);
    socket.on('page_renamed', handlePageRenamed);
    socket.on('draw_live_step', handleDrawLiveStep);
    socket.on('element_added', handleElementAdded);
    socket.on('elements_batch_added', handleElementsBatchAdded);
    socket.on('element_updated', handleElementUpdated);
    socket.on('element_deleted', handleElementDeleted);
    socket.on('board_state_sync', handleBoardStateSync);
    socket.on('board_cleared', handleBoardCleared);
    socket.on('board_lock_changed', handleBoardLockChanged);
    socket.on('class_ended', handleClassEnded);
    socket.on('cursor_moved', handleCursorMoved);
    socket.on('laser_pointer', handleLaserPointer);
    socket.on('user_joined', handleUserJoined);
    socket.on('user_left', handleUserLeft);

    return () => {
      socket.off('pages_sync', handlePagesSync);
      socket.off('page_switched', handlePageSwitched);
      socket.off('page_renamed', handlePageRenamed);
      socket.off('draw_live_step', handleDrawLiveStep);
      socket.off('element_added', handleElementAdded);
      socket.off('elements_batch_added', handleElementsBatchAdded);
      socket.off('element_updated', handleElementUpdated);
      socket.off('element_deleted', handleElementDeleted);
      socket.off('board_state_sync', handleBoardStateSync);
      socket.off('board_cleared', handleBoardCleared);
      socket.off('board_lock_changed', handleBoardLockChanged);
      socket.off('class_ended', handleClassEnded);
      socket.off('cursor_moved', handleCursorMoved);
      socket.off('laser_pointer', handleLaserPointer);
      socket.off('user_joined', handleUserJoined);
      socket.off('user_left', handleUserLeft);
    };
  }, [activePageId, addToast]);

  // Clean stale cursors & laser trails periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setRemoteCursors((prev: Map<string, RemoteCursor>) => {
        let changed = false;
        const next = new Map<string, RemoteCursor>(prev);
        for (const [k, v] of Array.from(next.entries())) {
          if (now - v.lastUpdate > 8000) {
            next.delete(k);
            changed = true;
          }
        }
        return changed ? next : prev;
      });

      setLaserPoints((prev: Map<string, LaserPoint>) => {
        let changed = false;
        const next = new Map<string, LaserPoint>(prev);
        for (const [k, v] of Array.from(next.entries())) {
          if (now - v.timestamp > 3000) {
            next.delete(k);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Create Classroom Handler
  const handleCreateClass = async (preferredName?: string, title?: string) => {
    setIsSubmitting(true);
    setJoinErrorMessage(null);

    const res = await socketService.createRoom(preferredName, title);
    setIsSubmitting(false);

    if (res.success && res.room && res.user && res.code) {
      setClassCode(res.code);
      setRoomTitle(res.room.title || 'Collaborative Whiteboard');
      setCurrentUser(res.user);
      setParticipants(res.room.participants || [res.user]);
      if (res.room.pages && res.room.pages.length > 0) {
        setPages(res.room.pages);
        setActivePageId(res.room.activePageId || res.room.pages[0].id);
      } else {
        const initialPage = { id: 'page_1', name: 'Page 1', elements: res.room.elements || [], createdAt: Date.now() };
        setPages([initialPage]);
        setActivePageId('page_1');
      }
      setIsLocked(res.room.isLocked || false);
      setIsEnded(false);
      setInClassroom(true);

      // Celebration confetti for teacher
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
        });
      } catch {
        // Ignored
      }

      addToast(`Classroom ${res.code} created! You are the Teacher.`, 'success');
      window.history.pushState({}, '', `/join/${res.code}`);
    } else {
      addToast(res.error || 'Failed to create classroom', 'error');
    }
  };

  // Join Classroom Handler
  const handleJoinClass = async (code: string, preferredName?: string) => {
    setIsSubmitting(true);
    setJoinErrorMessage(null);

    const res = await socketService.joinRoom(code, preferredName);
    setIsSubmitting(false);

    if (res.success && res.room && res.user && res.code) {
      setClassCode(res.code);
      setRoomTitle(res.room.title || 'Collaborative Whiteboard');
      setCurrentUser(res.user);
      setParticipants(res.room.participants || []);
      if (res.room.pages && res.room.pages.length > 0) {
        setPages(res.room.pages);
        setActivePageId(res.room.activePageId || res.room.pages[0].id);
      } else {
        const initialPage = { id: 'page_1', name: 'Page 1', elements: res.room.elements || [], createdAt: Date.now() };
        setPages([initialPage]);
        setActivePageId('page_1');
      }
      setIsLocked(res.room.isLocked || false);
      setIsEnded(false);
      setInClassroom(true);

      addToast(`Joined classroom ${res.code} as ${res.user.name}`, 'success');
      window.history.pushState({}, '', `/join/${res.code}`);
    } else {
      setJoinErrorMessage(res.message || 'Class not found. Please check the Class Code.');
      addToast(res.message || 'Could not join classroom', 'error');
    }
  };

  // ==========================================
  // MULTI-PAGE ACTIONS
  // ==========================================

  const handlePageSwitch = (pageId: string) => {
    setActivePageId(pageId);
    setLiveStrokes(new Map());
    socketService.emitPageSwitch(classCode, pageId);
  };

  const handlePageAdd = async () => {
    const nextNum = pages.length + 1;
    const res = await socketService.emitPageCreate(classCode, `Page ${nextNum}`);
    if (res.success && res.pageId) {
      setActivePageId(res.pageId);
    }
  };

  const handlePageRename = (pageId: string, newName: string) => {
    setPages((prev) =>
      prev.map((p) => (p.id === pageId ? { ...p, name: newName } : p))
    );
    socketService.emitPageRename(classCode, pageId, newName);
  };

  const handlePageDelete = async (pageId: string) => {
    const res = await socketService.emitPageDelete(classCode, pageId);
    if (res.success && res.activePageId) {
      setActivePageId(res.activePageId);
      addToast('Page deleted', 'info');
    } else if (res.error) {
      addToast(res.error, 'error');
    }
  };

  const handlePageDuplicate = async (pageId: string) => {
    const res = await socketService.emitPageDuplicate(classCode, pageId);
    if (res.success && res.pageId) {
      setActivePageId(res.pageId);
      addToast('Page duplicated', 'success');
    }
  };

  // Voice Handlers
  const handleJoinVoice = async () => {
    if (!classCode) return;
    const result = await voiceManager.joinVoice(classCode);
    if (result.success) {
      addToast('Connected to Voice Communication', 'success');
    }
  };

  const handleLeaveVoice = () => {
    voiceManager.leaveVoice();
    addToast('Left Voice', 'info');
  };

  const handleToggleMute = () => {
    const isMuted = voiceManager.toggleMute();
    addToast(isMuted ? 'Microphone Muted' : 'Microphone Unmuted', isMuted ? 'warning' : 'success', 1500);
  };

  const handleToggleDeafen = () => {
    const isDeafened = voiceManager.toggleDeafen();
    addToast(isDeafened ? 'Audio Output Muted' : 'Audio Output Unmuted', 'info', 1500);
  };

  // Board Element Addition (optimistic update + socket broadcast)
  const handleAddElement = (element: BoardElement) => {
    if (isLocked && currentUser?.role !== 'teacher') {
      addToast('Board is locked by teacher', 'warning');
      return;
    }

    element.pageId = activePageId;

    setPages((prevPages) =>
      prevPages.map((page) => {
        if (page.id === activePageId) {
          return {
            ...page,
            elements: [...page.elements, element],
            undoneElements: [], // Clear redo history after a new action is performed
          };
        }
        return page;
      })
    );

    socketService.emitElementAdd(classCode, element, activePageId);
  };

  // Live in-flight stroke broadcast
  const handleLiveStrokeStep = (elementId: string, point: Point, tool: string, color: string, size: number) => {
    socketService.emitLiveStroke(classCode, elementId, point, tool, color, size, activePageId);
  };

  // Cursor move broadcast
  const handleCursorMove = (x: number, y: number) => {
    if (inClassroom && classCode) {
      socketService.emitCursorMove(classCode, x, y, activePageId);
    }
  };

  // Laser pointer broadcast
  const handleLaserPointer = (x: number, y: number, active: boolean) => {
    if (inClassroom && classCode) {
      socketService.emitLaserPointer(classCode, x, y, active, activePageId);
    }
  };

  // Board Undo (active page)
  const handleUndo = () => {
    if (isLocked && currentUser?.role !== 'teacher') return;
    if (!activePage || activePage.elements.length === 0) return;

    setPages((prevPages) =>
      prevPages.map((page) => {
        if (page.id === activePageId && page.elements.length > 0) {
          let elIndex = -1;
          if (currentUser?.role === 'teacher') {
            elIndex = page.elements.length - 1;
          } else {
            for (let i = page.elements.length - 1; i >= 0; i--) {
              if (page.elements[i].userId === currentUser?.userId) {
                elIndex = i;
                break;
              }
            }
          }

          if (elIndex !== -1) {
            const nextElements = [...page.elements];
            const [undone] = nextElements.splice(elIndex, 1);
            return {
              ...page,
              elements: nextElements,
              undoneElements: [...(page.undoneElements || []), undone],
            };
          }
        }
        return page;
      })
    );

    socketService.emitBoardUndo(classCode, activePageId);
  };

  // Board Redo (active page)
  const handleRedo = () => {
    if (isLocked && currentUser?.role !== 'teacher') return;
    if (!activePage || !activePage.undoneElements || activePage.undoneElements.length === 0) return;

    setPages((prevPages) =>
      prevPages.map((page) => {
        if (page.id === activePageId && page.undoneElements && page.undoneElements.length > 0) {
          const nextUndone = [...page.undoneElements];
          const redone = nextUndone.pop();
          if (redone) {
            return {
              ...page,
              elements: [...page.elements, redone],
              undoneElements: nextUndone,
            };
          }
        }
        return page;
      })
    );

    socketService.emitBoardRedo(classCode, activePageId);
  };

  // Teacher Lock Board Toggle
  const handleToggleLock = () => {
    if (currentUser?.role !== 'teacher') return;
    const nextLocked = !isLocked;
    setIsLocked(nextLocked);
    socketService.emitBoardLock(classCode, nextLocked);
  };

  // Teacher Clear Board (Current Page)
  const handleConfirmClearBoard = () => {
    if (currentUser?.role !== 'teacher') return;
    setShowClearConfirm(false);
    setPages((prevPages) =>
      prevPages.map((page) => {
        if (page.id === activePageId) {
          return { ...page, elements: [] };
        }
        return page;
      })
    );
    socketService.emitBoardClear(classCode, activePageId);
    addToast(`Cleared whiteboard on ${activePage.name}`, 'info');
  };

  // Teacher End Class
  const handleConfirmEndClass = () => {
    if (currentUser?.role !== 'teacher') return;
    setShowEndClassConfirm(false);
    voiceManager.leaveVoice();
    socketService.emitClassEnd(classCode);
    setIsEnded(true);
    setShowClassEndedModal(true);
  };

  // Student Leave Class
  const handleLeaveClass = () => {
    voiceManager.leaveVoice();
    socketService.leaveRoom(classCode);
    setInClassroom(false);
    setClassCode('');
    setCurrentUser(null);
    setPages([{ id: 'page_1', name: 'Page 1', elements: [], createdAt: Date.now() }]);
    window.history.pushState({}, '', '/');
    addToast('Left classroom', 'info');
  };

  // Return to Home from Class Ended
  const handleReturnHome = () => {
    voiceManager.leaveVoice();
    setShowClassEndedModal(false);
    setInClassroom(false);
    setClassCode('');
    setCurrentUser(null);
    setPages([{ id: 'page_1', name: 'Page 1', elements: [], createdAt: Date.now() }]);
    setIsEnded(false);
    window.history.pushState({}, '', '/');
  };

  // Insert Image Handler
  const handleInsertImage = (file: File) => {
    if (isLocked && currentUser?.role !== 'teacher') {
      addToast('Board is locked by teacher', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) return;

      const img = new Image();
      img.onload = () => {
        const maxDim = 420;
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = (h / w) * maxDim;
            w = maxDim;
          } else {
            w = (w / h) * maxDim;
            h = maxDim;
          }
        }

        const screenCenterX = window.innerWidth / 2;
        const screenCenterY = window.innerHeight / 2;
        const worldX = (screenCenterX - transform.offsetX) / transform.scale - w / 2;
        const worldY = (screenCenterY - transform.offsetY) / transform.scale - h / 2;

        const element: BoardElement = {
          id: `el_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          pageId: activePageId,
          type: 'image',
          imageUrl: dataUrl,
          x: worldX,
          y: worldY,
          width: w,
          height: h,
          color: '#000000',
          size: 1,
          userId: currentUser?.userId || 'local',
          userName: currentUser?.name || 'User',
          userRole: currentUser?.role || 'student',
          timestamp: Date.now(),
        };

        handleAddElement(element);
        addToast('Image added to whiteboard', 'success');
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  // Zoom helpers
  const handleZoomIn = () => {
    setTransform((prev) => ({
      ...prev,
      scale: Math.min(prev.scale * 1.2, 4.0),
    }));
  };

  const handleZoomOut = () => {
    setTransform((prev) => ({
      ...prev,
      scale: Math.max(prev.scale * 0.8, 0.25),
    }));
  };

  const handleResetZoom = () => {
    setTransform({ scale: 1, offsetX: 0, offsetY: 0 });
  };

  // Export handlers
  const handleExportPNG = () => {
    exportToPNG(activeElements, classCode || 'SYNC', activePage.name);
    addToast(`Downloaded ${activePage.name} as PNG`, 'success');
  };

  const handleExportPDF = () => {
    exportToPDF(activeElements, classCode || 'SYNC', activePage.name);
    addToast(`Downloaded ${activePage.name} as PDF`, 'success');
  };

  const handleExportAllPDF = () => {
    exportAllPagesToPDF(pages, classCode || 'SYNC');
    addToast(`Downloaded all ${pages.length} pages as Multi-Page PDF`, 'success');
  };

  const handleCopyImage = async () => {
    const success = await copyBoardToClipboard(activeElements);
    if (success) {
      addToast('Active page copied to clipboard!', 'success');
    } else {
      addToast('Clipboard copy failed. Try downloading PNG.', 'error');
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input or textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      // Undo: Ctrl+Z / Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Redo: Ctrl+Y / Cmd+Shift+Z
      if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') || ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')) {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Tool switching shortcuts
      switch (e.key.toLowerCase()) {
        case 'p':
          setCurrentTool('pen');
          break;
        case 'b':
          setCurrentTool('pencil');
          break;
        case 'm':
          setCurrentTool('highlighter');
          break;
        case 'e':
          setCurrentTool('eraser');
          break;
        case 'l':
          setCurrentTool('line');
          break;
        case 'a':
          setCurrentTool('arrow');
          break;
        case 'r':
          setCurrentTool('rect');
          break;
        case 'o':
          setCurrentTool('circle');
          break;
        case 't':
          setCurrentTool('text');
          break;
        case 'k':
          setCurrentTool('laser');
          break;
        case 'h':
          setCurrentTool('select');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [classCode, activePageId, isLocked, currentUser]);

  const isTeacher = currentUser?.role === 'teacher';
  const canUndo = activeElements.length > 0 && (!isLocked || isTeacher);
  const canRedo = (activePage.undoneElements?.length || 0) > 0 && (!isLocked || isTeacher);

  // If not currently in a room, render Landing Page wrapped in Error Boundary
  if (!inClassroom) {
    return (
      <ErrorBoundary fallbackTitle="Welcome to SyncBoard" fallbackMessage="Could not load landing page. Please try again.">
        <LandingPage
          onCreateClass={handleCreateClass}
          onJoinClass={handleJoinClass}
          initialJoinCode={initialJoinCode}
          joinErrorMessage={joinErrorMessage}
          isSubmitting={isSubmitting}
        />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </ErrorBoundary>
    );
  }

  // Active Classroom Screen
  return (
    <ErrorBoundary fallbackTitle="Whiteboard encountered an issue" fallbackMessage="Your whiteboard elements and session state are preserved. Click Try Again to restore the view.">
      <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100 select-none">
        {/* Top Bar Header */}
        <TopBar
          classCode={classCode}
          roomTitle={roomTitle}
          activePageName={activePage.name}
          totalPagesCount={pages.length}
          isTeacher={isTeacher}
          isLocked={isLocked}
          participants={participants}
          currentUser={currentUser}
          connectionStatus={connectionStatus}
          voiceState={voiceState}
          voicePeers={voicePeers}
          transform={transform}
          gridStyle={gridStyle}
          onGridStyleChange={setGridStyle}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onResetZoom={handleResetZoom}
          onOpenShare={() => setShowShareModal(true)}
          onOpenParticipants={() => setShowParticipantsModal(true)}
          onToggleLock={handleToggleLock}
          onClearBoard={() => setShowClearConfirm(true)}
          onEndClass={() => setShowEndClassConfirm(true)}
          onLeaveClass={handleLeaveClass}
          onExportPNG={handleExportPNG}
          onExportPDF={handleExportPDF}
          onExportAllPDF={handleExportAllPDF}
          onCopyImage={handleCopyImage}
          onCopyCode={() => addToast('Class Code copied to clipboard!', 'success')}
          onJoinVoice={handleJoinVoice}
        />

        {/* Main Interactive Canvas Area */}
        <main className="flex-1 relative overflow-hidden">
          <Canvas
            elements={activeElements}
            liveStrokes={liveStrokes}
            remoteCursors={remoteCursors}
            laserPoints={laserPoints}
            currentTool={currentTool}
            currentColor={currentColor}
            currentSize={currentSize}
            isFilled={isFilled}
            gridStyle={gridStyle}
            isLocked={isLocked}
            isTeacher={isTeacher}
            currentUserId={currentUser?.userId || ''}
            currentUserName={currentUser?.name || 'User'}
            transform={transform}
            onTransformChange={setTransform}
            onAddElement={handleAddElement}
            onLiveStrokeStep={handleLiveStrokeStep}
            onCursorMove={handleCursorMove}
            onLaserPointer={handleLaserPointer}
          />

          {/* Floating Drawing Toolbar */}
          <Toolbar
            currentTool={currentTool}
            currentColor={currentColor}
            currentSize={currentSize}
            isFilled={isFilled}
            canUndo={canUndo}
            canRedo={canRedo}
            isLocked={isLocked}
            isTeacher={isTeacher}
            onToolChange={setCurrentTool}
            onColorChange={setCurrentColor}
            onSizeChange={setCurrentSize}
            onFilledToggle={() => setIsFilled(!isFilled)}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onInsertImage={handleInsertImage}
          />

          {/* Coordinated Floating Bottom Bar Deck (Zero Overlap Guaranteed) */}
          <div
            aria-label="Whiteboard Bottom Navigation & Controls"
            className="fixed bottom-3 inset-x-2 sm:inset-x-4 md:inset-x-6 z-30 pointer-events-none flex items-end justify-between gap-2 sm:gap-3 md:gap-4 select-none"
          >
            {/* Left Zone: Undo & Redo Controls */}
            <div className="pointer-events-auto shrink-0 flex items-center">
              <UndoRedoControls
                canUndo={canUndo}
                canRedo={canRedo}
                isLocked={isLocked}
                isTeacher={isTeacher}
                onUndo={handleUndo}
                onRedo={handleRedo}
              />
            </div>

            {/* Center Zone: Page Navigation (Bounded, Responsive, Auto-centered) */}
            <div className="pointer-events-auto min-w-0 flex-1 max-w-fit mx-auto flex items-center justify-center">
              <PageNavigation
                pages={pages}
                activePageId={activePageId}
                isTeacher={isTeacher}
                isLocked={isLocked}
                onPageSwitch={handlePageSwitch}
                onPageAdd={handlePageAdd}
                onPageRename={handlePageRename}
                onPageDelete={handlePageDelete}
                onPageDuplicate={handlePageDuplicate}
              />
            </div>

            {/* Right Zone: Voice Communication Pill & Drawer */}
            <div className="pointer-events-auto shrink-0 flex items-center justify-end">
              <VoiceControlBar
                voiceState={voiceState}
                voicePeers={voicePeers}
                currentUser={currentUser}
                onJoinVoice={handleJoinVoice}
                onLeaveVoice={handleLeaveVoice}
                onToggleMute={handleToggleMute}
                onToggleDeafen={handleToggleDeafen}
              />
            </div>
          </div>
        </main>

        {/* Modals & Dialogs */}
        <ShareModal
          isOpen={showShareModal}
          classCode={classCode}
          onClose={() => setShowShareModal(false)}
          onShowToast={addToast}
        />

        <ParticipantListModal
          isOpen={showParticipantsModal}
          participants={participants}
          currentUserId={currentUser?.userId || ''}
          voiceState={voiceState}
          voicePeers={voicePeers}
          onClose={() => setShowParticipantsModal(false)}
        />

        <ClassEndedModal
          isOpen={showClassEndedModal}
          classCode={classCode}
          onExportPNG={handleExportPNG}
          onExportPDF={handleExportPDF}
          onReturnHome={handleReturnHome}
        />

        {/* Clear Current Page Confirmation Modal */}
        {showClearConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm p-6 text-center animate-in zoom-in-95">
              <h3 className="font-bold text-slate-900 text-base mb-2">Clear this entire board?</h3>
              <p className="text-xs text-slate-500 mb-6">
                This will erase all content from <span className="font-semibold text-slate-700">{activePage.name}</span> for everyone in the classroom. Other pages will not be affected.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmClearBoard}
                  className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-sm"
                >
                  Clear Board
                </button>
              </div>
            </div>
          </div>
        )}

        {/* End Class Confirmation Modal */}
        {showEndClassConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm p-6 text-center animate-in zoom-in-95">
              <h3 className="font-bold text-slate-900 text-base mb-2">End This Classroom?</h3>
              <p className="text-xs text-slate-500 mb-6">
                This will conclude the session for all participants and invalidate Class Code <span className="font-mono font-bold text-indigo-600">{classCode}</span>.
              </p>
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowEndClassConfirm(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmEndClass}
                  className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-sm"
                >
                  End Class Now
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast Notifications */}
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    </ErrorBoundary>
  );
}
