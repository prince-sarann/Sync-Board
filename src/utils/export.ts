import { jsPDF } from 'jspdf';
import { BoardElement, WhiteboardPage } from '../types';
import { renderSmoothStroke, renderArrow, renderLine, renderRect, renderCircle, renderText } from './helpers';

// Calculate bounding box of all elements on the board
export function calculateBoardBounds(elements: BoardElement[], minPadding = 80): { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number } {
  if (elements.length === 0) {
    return { minX: 0, minY: 0, maxX: 1920, maxY: 1080, width: 1920, height: 1080 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  elements.forEach((el) => {
    if (el.points && el.points.length > 0) {
      el.points.forEach((p) => {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
      });
    } else if (el.x !== undefined && el.y !== undefined) {
      const w = el.width || 200;
      const h = el.height || 100;
      const x1 = Math.min(el.x, el.x + w);
      const x2 = Math.max(el.x, el.x + w);
      const y1 = Math.min(el.y, el.y + h);
      const y2 = Math.max(el.y, el.y + h);

      if (x1 < minX) minX = x1;
      if (y1 < minY) minY = y1;
      if (x2 > maxX) maxX = x2;
      if (y2 > maxY) maxY = y2;
    }
  });

  if (!isFinite(minX)) minX = 0;
  if (!isFinite(minY)) minY = 0;
  if (!isFinite(maxX)) maxX = 1920;
  if (!isFinite(maxY)) maxY = 1080;

  minX -= minPadding;
  minY -= minPadding;
  maxX += minPadding;
  maxY += minPadding;

  const width = Math.max(800, maxX - minX);
  const height = Math.max(600, maxY - minY);

  return { minX, minY, maxX, maxY, width, height };
}

// Generate an offscreen canvas containing only the drawn board content
export function renderOffscreenCanvas(elements: BoardElement[], pageTitle?: string): HTMLCanvasElement {
  const bounds = calculateBoardBounds(elements);
  const canvas = document.createElement('canvas');
  const dpr = 2; // 2x high-DPI export
  canvas.width = bounds.width * dpr;
  canvas.height = bounds.height * dpr;

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.scale(dpr, dpr);
  ctx.translate(-bounds.minX, -bounds.minY);

  // Clean white background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(bounds.minX, bounds.minY, bounds.width, bounds.height);

  // Subtle dot grid on exported board
  ctx.fillStyle = '#E2E8F0';
  const spacing = 32;
  const startX = Math.floor(bounds.minX / spacing) * spacing;
  const startY = Math.floor(bounds.minY / spacing) * spacing;
  for (let x = startX; x <= bounds.maxX; x += spacing) {
    for (let y = startY; y <= bounds.maxY; y += spacing) {
      ctx.beginPath();
      ctx.arc(x, y, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Draw all elements
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
          renderSmoothStroke(ctx, el.points, el.color, el.size * 2.5, 0.4);
          ctx.restore();
        }
        break;
      case 'eraser':
        if (el.points) renderSmoothStroke(ctx, el.points, '#FFFFFF', el.size * 3);
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
          const img = new Image();
          img.src = el.imageUrl;
          if (img.complete && img.naturalWidth > 0) {
            const w = el.width || Math.min(400, img.naturalWidth);
            const h = el.height || (w * img.naturalHeight) / img.naturalWidth;
            ctx.drawImage(img, el.x, el.y, w, h);
          }
        }
        break;
    }
  });

  // Add small watermark and page header
  ctx.save();
  if (pageTitle) {
    ctx.fillStyle = '#64748B';
    ctx.font = '600 14px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(pageTitle, bounds.minX + 24, bounds.minY + 32);
  }

  ctx.fillStyle = '#94A3B8';
  ctx.font = '500 13px ui-sans-serif, system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('Created with SyncBoard', bounds.maxX - 20, bounds.maxY - 20);
  ctx.restore();

  return canvas;
}

// Download active page as high-definition PNG
export function exportToPNG(elements: BoardElement[], classCode: string, pageName?: string) {
  const canvas = renderOffscreenCanvas(elements, pageName);
  const dateStr = new Date().toISOString().slice(0, 10);
  const cleanName = pageName ? `-${pageName.replace(/\s+/g, '_')}` : '';
  const filename = `SyncBoard-${classCode}${cleanName}-${dateStr}.png`;

  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Download active page as PDF
export function exportToPDF(elements: BoardElement[], classCode: string, pageName?: string) {
  const canvas = renderOffscreenCanvas(elements, pageName);
  const dateStr = new Date().toISOString().slice(0, 10);
  const cleanName = pageName ? `-${pageName.replace(/\s+/g, '_')}` : '';
  const filename = `SyncBoard-${classCode}${cleanName}-${dateStr}.pdf`;

  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  const orientation = canvas.width > canvas.height ? 'landscape' : 'portrait';
  const pdf = new jsPDF({
    orientation,
    unit: 'px',
    format: [canvas.width / 2, canvas.height / 2],
  });

  pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width / 2, canvas.height / 2);
  pdf.save(filename);
}

// Download ALL pages as a multi-page PDF document
export function exportAllPagesToPDF(pages: WhiteboardPage[], classCode: string) {
  if (!pages || pages.length === 0) return;

  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `SyncBoard-${classCode}-AllPages-${dateStr}.pdf`;

  let pdf: jsPDF | null = null;

  pages.forEach((page, index) => {
    const canvas = renderOffscreenCanvas(page.elements, page.name);
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const orientation = canvas.width > canvas.height ? 'landscape' : 'portrait';
    const pageWidth = canvas.width / 2;
    const pageHeight = canvas.height / 2;

    if (index === 0) {
      pdf = new jsPDF({
        orientation,
        unit: 'px',
        format: [pageWidth, pageHeight],
      });
      pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight);
    } else if (pdf) {
      pdf.addPage([pageWidth, pageHeight], orientation);
      pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight);
    }
  });

  if (pdf) {
    pdf.save(filename);
  }
}

// Copy image to clipboard
export async function copyBoardToClipboard(elements: BoardElement[]): Promise<boolean> {
  try {
    const canvas = renderOffscreenCanvas(elements);
    return new Promise((resolve) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          resolve(false);
          return;
        }
        try {
          const item = new ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([item]);
          resolve(true);
        } catch {
          resolve(false);
        }
      }, 'image/png');
    });
  } catch {
    return false;
  }
}
