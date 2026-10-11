import { BoardElement, Point } from '../types';

export const COLOR_PALETTE = [
  '#1E293B', // Charcoal / Black
  '#4F46E5', // Indigo
  '#2563EB', // Blue
  '#0284C7', // Sky
  '#059669', // Emerald
  '#16A34A', // Green
  '#D97706', // Amber
  '#EA580C', // Orange
  '#DC2626', // Red
  '#DB2777', // Pink
  '#7C3AED', // Violet
  '#FFFFFF', // White
];

export const STROKE_SIZES = [
  { label: 'Fine', value: 2 },
  { label: 'Medium', value: 4 },
  { label: 'Thick', value: 8 },
  { label: 'Broad', value: 16 },
];

export const FONT_SIZES = [
  { label: 'Small', value: 18 },
  { label: 'Medium', value: 24 },
  { label: 'Large', value: 36 },
  { label: 'Heading', value: 48 },
];

// Quadratic curve midpoints for smooth rendering
export function getMidPoint(p1: Point, p2: Point): Point {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  };
}

// Distance between two points
export function getDistance(p1: Point, p2: Point): number {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

// Draw smooth path with quadratic beziers on canvas 2D context
export function renderSmoothStroke(ctx: CanvasRenderingContext2D, points: Point[], color: string, size: number, opacity = 1) {
  if (!points || points.length === 0) return;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = size;
  ctx.strokeStyle = color;
  ctx.globalAlpha = opacity;

  if (points.length === 1) {
    ctx.beginPath();
    ctx.arc(points[0].x, points[0].y, size / 2, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
    return;
  }

  if (points.length === 2) {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    ctx.lineTo(points[1].x, points[1].y);
    ctx.stroke();
    ctx.restore();
    return;
  }

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  for (let i = 1; i < points.length - 1; i++) {
    const mid = getMidPoint(points[i], points[i + 1]);
    ctx.quadraticCurveTo(points[i].x, points[i].y, mid.x, mid.y);
  }

  const last = points[points.length - 1];
  const secondLast = points[points.length - 2];
  ctx.quadraticCurveTo(secondLast.x, secondLast.y, last.x, last.y);
  ctx.stroke();
  ctx.restore();
}

// Draw Arrow with sharp arrowhead
export function renderArrow(ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number, color: string, size: number) {
  const headLen = Math.max(12, size * 2.5);
  const angle = Math.atan2(toY - fromY, toX - fromX);

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Draw main shaft
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();

  // Draw arrowhead
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - headLen * Math.cos(angle - Math.PI / 6), toY - headLen * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(toX - headLen * Math.cos(angle + Math.PI / 6), toY - headLen * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

// Draw Line (with shift key angle snap support)
export function renderLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string, size: number) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

// Draw Rectangle (optionally filled)
export function renderRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  size: number,
  filled = false
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = size;
  ctx.lineJoin = 'round';

  const radius = Math.min(8, Math.abs(width) / 4, Math.abs(height) / 4);
  const rx = width < 0 ? x + width : x;
  const ry = height < 0 ? y + height : y;
  const rw = Math.abs(width);
  const rh = Math.abs(height);

  ctx.beginPath();
  if (ctx.roundRect && rw > radius * 2 && rh > radius * 2) {
    ctx.roundRect(rx, ry, rw, rh, radius);
  } else {
    ctx.rect(rx, ry, rw, rh);
  }

  if (filled) {
    ctx.globalAlpha = 0.2;
    ctx.fill();
    ctx.globalAlpha = 1.0;
  }
  ctx.stroke();
  ctx.restore();
}

// Draw Circle / Ellipse (optionally filled)
export function renderCircle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  size: number,
  filled = false
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = size;

  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const radiusX = Math.abs(width / 2);
  const radiusY = Math.abs(height / 2);

  ctx.beginPath();
  ctx.ellipse(centerX, centerY, radiusX || 1, radiusY || 1, 0, 0, Math.PI * 2);

  if (filled) {
    ctx.globalAlpha = 0.2;
    ctx.fill();
    ctx.globalAlpha = 1.0;
  }
  ctx.stroke();
  ctx.restore();
}

// Draw Text element
export function renderText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  fontSize: number = 24
) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = `600 ${fontSize}px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.textBaseline = 'top';

  const lines = text.split('\n');
  const lineHeight = fontSize * 1.3;

  lines.forEach((line, index) => {
    ctx.fillText(line, x, y + index * lineHeight);
  });

  ctx.restore();
}

// Draw Background Grid
export function renderBackgroundGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  style: 'dots' | 'grid' | 'lines' | 'none',
  transform: { scale: number; offsetX: number; offsetY: number }
) {
  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  if (style === 'none') {
    ctx.restore();
    return;
  }

  const baseSpacing = 32;
  const spacing = baseSpacing * transform.scale;
  
  if (spacing < 10) {
    ctx.restore();
    return; // Grid is too dense at this zoom level
  }

  const startX = transform.offsetX % spacing;
  const startY = transform.offsetY % spacing;

  if (style === 'dots') {
    ctx.fillStyle = '#CBD5E1';
    const dotRadius = Math.max(1, 1.2 * Math.min(1.5, transform.scale));
    for (let x = startX; x < width; x += spacing) {
      for (let y = startY; y < height; y += spacing) {
        ctx.beginPath();
        ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (style === 'grid') {
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = startX; x < width; x += spacing) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = startY; y < height; y += spacing) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();
  } else if (style === 'lines') {
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let y = startY; y < height; y += spacing) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();
  }

  ctx.restore();
}
