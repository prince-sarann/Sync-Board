import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BoardElement, CanvasTransform, GridStyle, LaserPoint, LiveStroke, Point, RemoteCursor, ToolType } from '../../types';
import { renderArrow, renderBackgroundGrid, renderCircle, renderLine, renderRect, renderSmoothStroke, renderText } from '../../utils/helpers';

interface CanvasProps {
  elements: BoardElement[];
  liveStrokes: Map<string, LiveStroke>;
  remoteCursors: Map<string, RemoteCursor>;
  laserPoints: Map<string, LaserPoint>;
  currentTool: ToolType;
  currentColor: string;
  currentSize: number;
  isFilled: boolean;
  gridStyle: GridStyle;
  isLocked: boolean;
  isTeacher: boolean;
  currentUserId: string;
  currentUserName: string;
  transform: CanvasTransform;
  onTransformChange: (transform: CanvasTransform) => void;
  onAddElement: (element: BoardElement) => void;
  onDeleteElement?: (elementId: string) => void;
  onLiveStrokeStep: (elementId: string, point: Point, tool: string, color: string, size: number) => void;
  onCursorMove: (x: number, y: number) => void;
  onLaserPointer: (x: number, y: number, active: boolean) => void;
}

export const Canvas: React.FC<CanvasProps> = ({
  elements,
  liveStrokes,
  remoteCursors,
  laserPoints,
  currentTool,
  currentColor,
  currentSize,
  isFilled,
  gridStyle,
  isLocked,
  isTeacher,
  currentUserId,
  currentUserName,
  transform,
  onTransformChange,
  onAddElement,
  onDeleteElement,
  onLiveStrokeStep,
  onCursorMove,
  onLaserPointer,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const [, setTick] = useState(0);

  // Drawing state refs to avoid state re-render latency during high-frequency pointer events
  const isDrawingRef = useRef(false);
  const currentElementIdRef = useRef<string>('');
  const currentPointsRef = useRef<Point[]>([]);
  const startPointRef = useRef<Point | null>(null);
  const isPanningRef = useRef(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchDistanceRef = useRef<number | null>(null);
  const lastCursorEmitRef = useRef<number>(0);

  // Text input overlay state
  const [textInputState, setTextInputState] = useState<{
    visible: boolean;
    x: number;
    y: number;
    screenX: number;
    screenY: number;
    text: string;
  } | null>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);

  // Focus text input when opened
  useEffect(() => {
    if (textInputState?.visible && textInputRef.current) {
      textInputRef.current.focus();
    }
  }, [textInputState?.visible]);

  // Convert client viewport coordinates to canvas world coordinates
  const screenToWorld = useCallback(
    (screenX: number, screenY: number): Point => {
      return {
        x: (screenX - transform.offsetX) / transform.scale,
        y: (screenY - transform.offsetY) / transform.scale,
      };
    },
    [transform]
  );

  // Convert canvas world coordinates to screen coordinates
  const worldToScreen = useCallback(
    (worldX: number, worldY: number): { x: number; y: number } => {
      return {
        x: worldX * transform.scale + transform.offsetX,
        y: worldY * transform.scale + transform.offsetY,
      };
    },
    [transform]
  );

  // Full re-render loop on canvas
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width / (window.devicePixelRatio || 1);
    const height = canvas.height / (window.devicePixelRatio || 1);

    // Reset transform & render crisp background grid
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const dpr = window.devicePixelRatio || 1;
    ctx.scale(dpr, dpr);

    renderBackgroundGrid(ctx, width, height, gridStyle, transform);

    // Apply viewport scale & pan offset
    ctx.save();
    ctx.translate(transform.offsetX, transform.offsetY);
    ctx.scale(transform.scale, transform.scale);

    // 1. Draw finalized room elements
    elements.forEach((el) => {
      switch (el.type) {
        case 'pen':
        case 'pencil':
          if (el.points) renderSmoothStroke(ctx, el.points, el.color, el.size);
          break;
        case 'highlighter':
          if (el.points) {
            ctx.save();
            ctx.globalCompositeOperation = 'multiply';
            renderSmoothStroke(ctx, el.points, el.color, el.size * 2.8, 0.35);
            ctx.restore();
          }
          break;
        case 'eraser':
          if (el.points) {
            ctx.save();
            renderSmoothStroke(ctx, el.points, '#FFFFFF', el.size * 3.5);
            ctx.restore();
          }
          break;
        case 'line':
          if (el.x !== undefined && el.y !== undefined && el.width !== undefined && el.height !== undefined) {
            renderLine(ctx, el.x, el.y, el.x + el.width, el.y + el.height, el.color, el.size);
          }
          break;
        case 'arrow':
          if (el.x !== undefined && el.y !== undefined && el.width !== undefined && el.height !== undefined) {
            renderArrow(ctx, el.x, el.y, el.x + el.width, el.y + el.height, el.color, el.size);
          }
          break;
        case 'rect':
          if (el.x !== undefined && el.y !== undefined && el.width !== undefined && el.height !== undefined) {
            renderRect(ctx, el.x, el.y, el.width, el.height, el.color, el.size, el.filled);
          }
          break;
        case 'circle':
          if (el.x !== undefined && el.y !== undefined && el.width !== undefined && el.height !== undefined) {
            renderCircle(ctx, el.x, el.y, el.width, el.height, el.color, el.size, el.filled);
          }
          break;
        case 'text':
          if (el.text && el.x !== undefined && el.y !== undefined) {
            renderText(ctx, el.text, el.x, el.y, el.color, el.fontSize || 24);
          }
          break;
        case 'image':
          if (el.imageUrl && el.x !== undefined && el.y !== undefined) {
            let img = imageCacheRef.current.get(el.imageUrl);
            if (!img) {
              img = new Image();
              img.src = el.imageUrl;
              img.onload = () => {
                setTick((t) => t + 1);
              };
              imageCacheRef.current.set(el.imageUrl, img);
            }
            if (img.complete && img.naturalWidth > 0) {
              const w = el.width || Math.min(400, img.naturalWidth);
              const h = el.height || (w * img.naturalHeight) / img.naturalWidth;
              ctx.drawImage(img, el.x, el.y, w, h);
            }
          }
          break;
      }
    });

    // 2. Draw live in-flight strokes from other active participants
    liveStrokes.forEach((stroke) => {
      if (!stroke.points || stroke.points.length === 0) return;
      if (stroke.tool === 'highlighter') {
        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        renderSmoothStroke(ctx, stroke.points, stroke.color, stroke.size * 2.8, 0.35);
        ctx.restore();
      } else if (stroke.tool === 'eraser') {
        renderSmoothStroke(ctx, stroke.points, '#FFFFFF', stroke.size * 3.5);
      } else {
        renderSmoothStroke(ctx, stroke.points, stroke.color, stroke.size);
      }
    });

    // 3. Draw active local drawing shape / stroke preview
    if (isDrawingRef.current && currentPointsRef.current.length > 0) {
      const pts = currentPointsRef.current;
      const start = startPointRef.current;
      const current = pts[pts.length - 1];

      if (['pen', 'pencil'].includes(currentTool)) {
        renderSmoothStroke(ctx, pts, currentColor, currentSize);
      } else if (currentTool === 'highlighter') {
        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        renderSmoothStroke(ctx, pts, currentColor, currentSize * 2.8, 0.35);
        ctx.restore();
      } else if (currentTool === 'eraser') {
        renderSmoothStroke(ctx, pts, '#FFFFFF', currentSize * 3.5);
      } else if (start && currentTool === 'line') {
        renderLine(ctx, start.x, start.y, current.x, current.y, currentColor, currentSize);
      } else if (start && currentTool === 'arrow') {
        renderArrow(ctx, start.x, start.y, current.x, current.y, currentColor, currentSize);
      } else if (start && currentTool === 'rect') {
        renderRect(ctx, start.x, start.y, current.x - start.x, current.y - start.y, currentColor, currentSize, isFilled);
      } else if (start && currentTool === 'circle') {
        renderCircle(ctx, start.x, start.y, current.x - start.x, current.y - start.y, currentColor, currentSize, isFilled);
      }
    }

    // 4. Draw Laser Pointers (glowing fading points)
    const now = Date.now();
    laserPoints.forEach((laser) => {
      const age = now - laser.timestamp;
      if (age < 2000) {
        const opacity = Math.max(0, 1 - age / 2000);
        ctx.save();
        ctx.beginPath();
        ctx.arc(laser.x, laser.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = laser.color || '#EF4444';
        ctx.shadowColor = laser.color || '#EF4444';
        ctx.shadowBlur = 12;
        ctx.globalAlpha = opacity;
        ctx.fill();

        // Laser aura ring
        ctx.beginPath();
        ctx.arc(laser.x, laser.y, 16 * (1 - opacity * 0.5), 0, Math.PI * 2);
        ctx.strokeStyle = laser.color || '#EF4444';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }
    });

    ctx.restore();
  }, [elements, liveStrokes, laserPoints, currentTool, currentColor, currentSize, isFilled, gridStyle, transform]);

  // Handle high DPI resize
  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    redraw();
  }, [redraw]);

  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  // Request redraw on props change
  useEffect(() => {
    redraw();
  }, [redraw]);

  // Wheel zoom / trackpad pan handler
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      // Zoom
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      const newScale = Math.min(Math.max(0.2, transform.scale * zoomFactor), 4.0);

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const newOffsetX = mouseX - ((mouseX - transform.offsetX) * newScale) / transform.scale;
      const newOffsetY = mouseY - ((mouseY - transform.offsetY) * newScale) / transform.scale;

      onTransformChange({
        scale: newScale,
        offsetX: newOffsetX,
        offsetY: newOffsetY,
      });
    } else {
      // Pan
      onTransformChange({
        ...transform,
        offsetX: transform.offsetX - e.deltaX,
        offsetY: transform.offsetY - e.deltaY,
      });
    }
  };

  // Check if board interaction is permitted
  const canDraw = !isLocked || isTeacher;

  // Pointer Down (Mouse, Touch, Stylus)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const worldPoint = screenToWorld(screenX, screenY);

    // Emit live cursor location
    onCursorMove(worldPoint.x, worldPoint.y);

    // Pan mode (middle click, spacebar, or Select/Pan tool)
    if (currentTool === 'select' || e.button === 1 || e.buttons === 4 || e.altKey) {
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX - transform.offsetX, y: e.clientY - transform.offsetY };
      return;
    }

    if (!canDraw) return;

    // Text tool: Open inline text editor
    if (currentTool === 'text') {
      setTextInputState({
        visible: true,
        x: worldPoint.x,
        y: worldPoint.y,
        screenX: e.clientX,
        screenY: e.clientY,
        text: '',
      });
      return;
    }

    // Laser pointer mode
    if (currentTool === 'laser') {
      onLaserPointer(worldPoint.x, worldPoint.y, true);
      isDrawingRef.current = true;
      return;
    }

    // Drawing start
    isDrawingRef.current = true;
    currentElementIdRef.current = `el_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    currentPointsRef.current = [worldPoint];
    startPointRef.current = worldPoint;

    // Emit initial live step for smooth remote rendering
    if (['pen', 'pencil', 'highlighter', 'eraser'].includes(currentTool)) {
      onLiveStrokeStep(currentElementIdRef.current, worldPoint, currentTool, currentColor, currentSize);
    }

    redraw();
  };

  // Pointer Move (Mouse, Touch, Stylus)
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const worldPoint = screenToWorld(screenX, screenY);

    // Throttle cursor broadcast to 35ms for silky-smooth multi-user cursor sync
    const now = Date.now();
    if (now - lastCursorEmitRef.current > 35) {
      onCursorMove(worldPoint.x, worldPoint.y);
      lastCursorEmitRef.current = now;
    }

    // Pan drag
    if (isPanningRef.current) {
      onTransformChange({
        ...transform,
        offsetX: e.clientX - panStartRef.current.x,
        offsetY: e.clientY - panStartRef.current.y,
      });
      return;
    }

    if (!isDrawingRef.current || !canDraw) return;

    // Laser pointer active move
    if (currentTool === 'laser') {
      onLaserPointer(worldPoint.x, worldPoint.y, true);
      return;
    }

    // Add point to stroke
    currentPointsRef.current.push(worldPoint);

    if (['pen', 'pencil', 'highlighter', 'eraser'].includes(currentTool)) {
      onLiveStrokeStep(currentElementIdRef.current, worldPoint, currentTool, currentColor, currentSize);
    }

    redraw();
  };

  // Pointer Up (Finalize element)
  const handlePointerUp = () => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      return;
    }

    if (currentTool === 'laser') {
      isDrawingRef.current = false;
      return;
    }

    if (!isDrawingRef.current || !canDraw) {
      isDrawingRef.current = false;
      return;
    }

    isDrawingRef.current = false;
    const points = currentPointsRef.current;
    const start = startPointRef.current;

    if (points.length === 0) return;

    const newElement: BoardElement = {
      id: currentElementIdRef.current || `el_${Date.now()}`,
      type: currentTool,
      color: currentColor,
      size: currentSize,
      userId: currentUserId,
      userName: currentUserName,
      timestamp: Date.now(),
    };

    if (['pen', 'pencil', 'highlighter', 'eraser'].includes(currentTool)) {
      if (points.length >= 1) {
        newElement.points = [...points];
        onAddElement(newElement);
      }
    } else if (start && ['line', 'arrow', 'rect', 'circle'].includes(currentTool)) {
      const end = points[points.length - 1];
      const width = end.x - start.x;
      const height = end.y - start.y;

      if (Math.hypot(width, height) > 3) {
        newElement.x = start.x;
        newElement.y = start.y;
        newElement.width = width;
        newElement.height = height;
        newElement.filled = isFilled;
        onAddElement(newElement);
      }
    }

    currentPointsRef.current = [];
    startPointRef.current = null;
    redraw();
  };

  // Touch handlers for mobile pinch zoom & pan
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2) {
      isDrawingRef.current = false;
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      touchDistanceRef.current = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      panStartRef.current = {
        x: (t1.clientX + t2.clientX) / 2 - transform.offsetX,
        y: (t1.clientY + t2.clientY) / 2 - transform.offsetY,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2 && touchDistanceRef.current !== null) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const newDistance = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const scaleChange = newDistance / touchDistanceRef.current;
      const newScale = Math.min(Math.max(0.2, transform.scale * scaleChange), 4.0);

      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;

      onTransformChange({
        scale: newScale,
        offsetX: midX - panStartRef.current.x * scaleChange,
        offsetY: midY - panStartRef.current.y * scaleChange,
      });

      touchDistanceRef.current = newDistance;
    }
  };

  const handleTouchEnd = () => {
    touchDistanceRef.current = null;
  };

  // Submit Text input
  const handleTextSubmit = () => {
    if (!textInputState || !textInputState.text.trim()) {
      setTextInputState(null);
      return;
    }

    const textElement: BoardElement = {
      id: `el_txt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: 'text',
      text: textInputState.text.trim(),
      x: textInputState.x,
      y: textInputState.y,
      color: currentColor,
      size: currentSize,
      fontSize: currentSize * 6 + 12,
      userId: currentUserId,
      userName: currentUserName,
      timestamp: Date.now(),
    };

    onAddElement(textElement);
    setTextInputState(null);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden select-none bg-slate-50 touch-none"
      onWheel={handleWheel}
    >
      <canvas
        ref={canvasRef}
        className={`w-full h-full block ${
          currentTool === 'select'
            ? 'cursor-grab active:cursor-grabbing'
            : currentTool === 'laser'
            ? 'cursor-crosshair'
            : currentTool === 'eraser'
            ? 'cursor-crosshair'
            : 'cursor-crosshair'
        }`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />

      {/* Floating Remote Live Cursors */}
      {Array.from(remoteCursors.values()).map((cursor: RemoteCursor) => {
        if (cursor.userId === currentUserId) return null;
        const screenPos = worldToScreen(cursor.x, cursor.y);
        const isRecent = Date.now() - cursor.lastUpdate < 5000;
        if (!isRecent) return null;

        return (
          <div
            key={cursor.socketId}
            style={{
              transform: `translate(${screenPos.x}px, ${screenPos.y}px)`,
              transition: 'transform 0.06s linear',
            }}
            className="absolute top-0 left-0 pointer-events-none z-20 flex items-start -translate-x-1 -translate-y-1"
          >
            {/* Cursor SVG Arrow */}
            <svg
              className="w-5 h-5 drop-shadow-sm filter"
              viewBox="0 0 24 24"
              fill={cursor.color || '#4F46E5'}
              stroke="#FFFFFF"
              strokeWidth="1.5"
            >
              <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.86a.5.5 0 0 0-.85.35Z" />
            </svg>

            {/* Name Badge */}
            <div
              style={{ backgroundColor: cursor.color || '#4F46E5' }}
              className="ml-1 px-2 py-0.5 rounded-full text-white text-[11px] font-medium shadow-sm whitespace-nowrap flex items-center gap-1"
            >
              {cursor.role === 'teacher' && <span className="text-[10px]">👑</span>}
              <span>{cursor.name}</span>
            </div>
          </div>
        );
      })}

      {/* Inline Text Tool Popover */}
      {textInputState?.visible && (
        <div
          style={{
            transform: `translate(${worldToScreen(textInputState.x, textInputState.y).x}px, ${
              worldToScreen(textInputState.x, textInputState.y).y
            }px)`,
          }}
          className="absolute top-0 left-0 z-30 min-w-[200px]"
        >
          <div className="bg-white p-2 rounded-xl shadow-xl border border-slate-200 animate-in fade-in zoom-in-95">
            <textarea
              ref={textInputRef}
              rows={2}
              value={textInputState.text}
              onChange={(e) => setTextInputState({ ...textInputState, text: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleTextSubmit();
                } else if (e.key === 'Escape') {
                  setTextInputState(null);
                }
              }}
              placeholder="Type text... (Enter to place)"
              style={{ color: currentColor, fontSize: `${Math.max(14, currentSize * 4 + 10)}px` }}
              className="w-full resize-none outline-none font-sans font-semibold placeholder:font-normal placeholder:text-slate-400 bg-transparent"
            />
            <div className="flex justify-end gap-2 mt-2 pt-1 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setTextInputState(null)}
                className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleTextSubmit}
                className="px-3 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-medium shadow-sm"
              >
                Place Text
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Teacher Board Locked Notification Pill */}
      {isLocked && !isTeacher && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-amber-500/90 backdrop-blur text-white px-4 py-1.5 rounded-full text-xs font-semibold shadow-md flex items-center gap-2 pointer-events-none">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <span>Board is locked by teacher (View Only)</span>
        </div>
      )}
    </div>
  );
};
