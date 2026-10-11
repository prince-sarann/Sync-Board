import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowRight,
  Circle,
  Highlighter,
  Minus,
  Move,
  Paintbrush,
  Pencil,
  Plus,
  Redo2,
  Sparkles,
  Square,
  Type,
  Undo2,
  Eraser,
  Image as ImageIcon,
  Check,
} from 'lucide-react';
import { ToolType } from '../../types';
import { COLOR_PALETTE, STROKE_SIZES } from '../../utils/helpers';

interface ToolbarProps {
  currentTool: ToolType;
  currentColor: string;
  currentSize: number;
  isFilled: boolean;
  canUndo: boolean;
  canRedo: boolean;
  isLocked: boolean;
  isTeacher: boolean;
  onToolChange: (tool: ToolType) => void;
  onColorChange: (color: string) => void;
  onSizeChange: (size: number) => void;
  onFilledToggle: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onInsertImage?: (file: File) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  currentTool,
  currentColor,
  currentSize,
  isFilled,
  canUndo,
  canRedo,
  isLocked,
  isTeacher,
  onToolChange,
  onColorChange,
  onSizeChange,
  onFilledToggle,
  onUndo,
  onRedo,
  onInsertImage,
}) => {
  const [showInsertMenu, setShowInsertMenu] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showSizePicker, setShowSizePicker] = useState(false);

  const toolbarContainerRef = useRef<HTMLDivElement>(null);
  const insertMenuRef = useRef<HTMLDivElement>(null);
  const insertButtonRef = useRef<HTMLButtonElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const sizePickerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const disabledDrawing = isLocked && !isTeacher;

  // Primary drawing tools on the main toolbar (Text is removed and placed inside the "+" menu)
  const primaryTools: { id: ToolType; label: string; icon: React.ReactNode; shortcut: string }[] = [
    { id: 'select', label: 'Pan / Hand', icon: <Move className="w-4 h-4" />, shortcut: 'H' },
    { id: 'pen', label: 'Pen', icon: <Paintbrush className="w-4 h-4" />, shortcut: 'P' },
    { id: 'pencil', label: 'Pencil', icon: <Pencil className="w-4 h-4" />, shortcut: 'B' },
    { id: 'highlighter', label: 'Highlighter', icon: <Highlighter className="w-4 h-4" />, shortcut: 'M' },
    { id: 'eraser', label: 'Eraser', icon: <Eraser className="w-4 h-4" />, shortcut: 'E' },
    { id: 'line', label: 'Line', icon: <Minus className="w-4 h-4" />, shortcut: 'L' },
    { id: 'arrow', label: 'Arrow', icon: <ArrowRight className="w-4 h-4" />, shortcut: 'A' },
    { id: 'rect', label: 'Rectangle', icon: <Square className="w-4 h-4" />, shortcut: 'R' },
    { id: 'circle', label: 'Circle', icon: <Circle className="w-4 h-4" />, shortcut: 'O' },
  ];

  // Close menus when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;

      if (
        insertMenuRef.current &&
        !insertMenuRef.current.contains(target) &&
        insertButtonRef.current &&
        !insertButtonRef.current.contains(target)
      ) {
        setShowInsertMenu(false);
      }

      if (
        colorPickerRef.current &&
        !colorPickerRef.current.contains(target) &&
        !toolbarContainerRef.current?.querySelector('[data-color-button]')?.contains(target)
      ) {
        setShowColorPicker(false);
      }

      if (
        sizePickerRef.current &&
        !sizePickerRef.current.contains(target) &&
        !toolbarContainerRef.current?.querySelector('[data-size-button]')?.contains(target)
      ) {
        setShowSizePicker(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, []);

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0] && onInsertImage) {
      onInsertImage(files[0]);
    }
    // Reset file input value to allow selecting same file again
    e.target.value = '';
    setShowInsertMenu(false);
  };

  const isInsertToolActive = currentTool === 'text' || currentTool === 'laser';

  return (
    <aside
      aria-label="Whiteboard Drawing Tools"
      ref={toolbarContainerRef}
      className="absolute top-3 left-1/2 -translate-x-1/2 z-20 max-w-[96vw] pointer-events-auto"
    >
      {/* Popover for Color Palette (opens directly below toolbar) */}
      {showColorPicker && !disabledDrawing && (
        <div
          ref={colorPickerRef}
          className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white rounded-2xl shadow-2xl border border-slate-200 p-3 flex flex-col gap-2.5 z-40 animate-in fade-in zoom-in-95 min-w-[210px]"
        >
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Palette</div>
          <div className="grid grid-cols-6 gap-1.5">
            {COLOR_PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  onColorChange(c);
                  setShowColorPicker(false);
                }}
                className={`w-7 h-7 rounded-lg transition-transform hover:scale-110 flex items-center justify-center ${
                  currentColor === c ? 'ring-2 ring-indigo-600 ring-offset-2 scale-105 shadow-sm' : 'border border-slate-200'
                }`}
                style={{ backgroundColor: c }}
                title={c}
              >
                {c === '#FFFFFF' && <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />}
              </button>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
            <span className="text-xs text-slate-600 font-medium">Custom Color</span>
            <input
              type="color"
              value={currentColor}
              onChange={(e) => onColorChange(e.target.value)}
              className="w-7 h-7 rounded-lg cursor-pointer border-0 p-0 bg-transparent"
            />
          </div>
        </div>
      )}

      {/* Popover for Stroke Size (opens directly below toolbar) */}
      {showSizePicker && !disabledDrawing && (
        <div
          ref={sizePickerRef}
          className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white rounded-2xl shadow-2xl border border-slate-200 p-3 flex flex-col gap-2.5 z-40 animate-in fade-in zoom-in-95 min-w-[200px]"
        >
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Stroke Thickness</div>
          <div className="flex items-center justify-between gap-1.5">
            {STROKE_SIZES.map((sz) => (
              <button
                key={sz.value}
                type="button"
                onClick={() => {
                  onSizeChange(sz.value);
                  setShowSizePicker(false);
                }}
                className={`flex-1 py-2 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-colors ${
                  currentSize === sz.value
                    ? 'bg-indigo-50 text-indigo-700 font-semibold ring-1 ring-indigo-400'
                    : 'hover:bg-slate-100 text-slate-600'
                }`}
              >
                <div
                  className="rounded-full bg-current"
                  style={{ width: `${Math.min(16, sz.value * 2)}px`, height: `${Math.min(16, sz.value * 2)}px` }}
                />
                <span className="text-[10px]">{sz.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Popover for Main Toolbar "+" (Insert Tools: Text, Image, Shape, Laser) */}
      {showInsertMenu && !disabledDrawing && (
        <div
          ref={insertMenuRef}
          className="absolute top-full mt-2 right-2 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 z-40 w-64 animate-in fade-in zoom-in-95 flex flex-col gap-1 text-slate-700 select-none"
        >
          <div className="px-2.5 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Insert Content
          </div>

          {/* Insert: Text Tool */}
          <button
            type="button"
            onClick={() => {
              onToolChange('text');
              setShowInsertMenu(false);
            }}
            className={`w-full px-3 py-2 rounded-xl flex items-center justify-between text-xs font-semibold transition-colors ${
              currentTool === 'text'
                ? 'bg-indigo-50 text-indigo-700'
                : 'hover:bg-slate-100 text-slate-700'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-100/70 text-indigo-700 flex items-center justify-center">
                <Type className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-slate-800">Text Box</div>
                <div className="text-[10px] text-slate-400 font-normal">Click on canvas to type text (T)</div>
              </div>
            </div>
            {currentTool === 'text' && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
          </button>

          {/* Insert: Image Upload */}
          <button
            type="button"
            onClick={() => {
              fileInputRef.current?.click();
            }}
            className="w-full px-3 py-2 rounded-xl flex items-center justify-between text-xs font-semibold hover:bg-slate-100 text-slate-700 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-100/70 text-emerald-700 flex items-center justify-center">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-slate-800">Insert Image</div>
                <div className="text-[10px] text-slate-400 font-normal">Upload PNG, JPG, or SVG</div>
              </div>
            </div>
          </button>

          <div className="my-1 border-t border-slate-100" />

          <div className="px-2.5 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Quick Shapes
          </div>

          <div className="grid grid-cols-4 gap-1 px-1">
            <button
              type="button"
              onClick={() => {
                onToolChange('rect');
                setShowInsertMenu(false);
              }}
              title="Rectangle (R)"
              className={`p-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-colors ${
                currentTool === 'rect' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              <Square className="w-4 h-4" />
              <span className="text-[9px]">Rect</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onToolChange('circle');
                setShowInsertMenu(false);
              }}
              title="Circle (O)"
              className={`p-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-colors ${
                currentTool === 'circle' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              <Circle className="w-4 h-4" />
              <span className="text-[9px]">Circle</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onToolChange('arrow');
                setShowInsertMenu(false);
              }}
              title="Arrow (A)"
              className={`p-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-colors ${
                currentTool === 'arrow' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              <ArrowRight className="w-4 h-4" />
              <span className="text-[9px]">Arrow</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onToolChange('line');
                setShowInsertMenu(false);
              }}
              title="Line (L)"
              className={`p-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-colors ${
                currentTool === 'line' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              <Minus className="w-4 h-4" />
              <span className="text-[9px]">Line</span>
            </button>
          </div>

          <div className="my-1 border-t border-slate-100" />

          {/* Insert: Laser Pointer */}
          <button
            type="button"
            onClick={() => {
              onToolChange('laser');
              setShowInsertMenu(false);
            }}
            className={`w-full px-3 py-2 rounded-xl flex items-center justify-between text-xs font-semibold transition-colors ${
              currentTool === 'laser'
                ? 'bg-indigo-50 text-indigo-700'
                : 'hover:bg-slate-100 text-slate-700'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-rose-100/70 text-rose-700 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-slate-800">Laser Pointer</div>
                <div className="text-[10px] text-slate-400 font-normal">Temporary glowing pointer (K)</div>
              </div>
            </div>
            {currentTool === 'laser' && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
          </button>
        </div>
      )}

      {/* Hidden File Input for Image Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml,image/webp"
        className="hidden"
        onChange={handleImageFileChange}
      />

      {/* Main Floating Tool Container */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/90 p-1.5 flex items-center gap-1 sm:gap-1.5 max-w-[94vw] select-none animate-in fade-in slide-in-from-top-2 overflow-x-auto no-scrollbar">
        {/* Primary Tools List */}
        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
          {primaryTools.map((t) => {
            const isActive = currentTool === t.id;
            const isDisabled = disabledDrawing && t.id !== 'select';

            return (
              <button
                key={t.id}
                type="button"
                disabled={isDisabled}
                onClick={() => {
                  onToolChange(t.id);
                  setShowInsertMenu(false);
                }}
                title={`${t.label} (${t.shortcut})`}
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                    : isDisabled
                    ? 'text-slate-300 cursor-not-allowed'
                    : 'text-slate-700 hover:bg-slate-100 active:scale-95'
                }`}
              >
                {t.icon}
              </button>
            );
          })}

          {/* New Compact "+" Button (Replaces Text button in main toolbar row) */}
          <button
            ref={insertButtonRef}
            type="button"
            disabled={disabledDrawing}
            onClick={() => {
              setShowInsertMenu(!showInsertMenu);
              setShowColorPicker(false);
              setShowSizePicker(false);
            }}
            title="Insert Tools (Text, Image, Shape, Laser)"
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all ${
              showInsertMenu || isInsertToolActive
                ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                : disabledDrawing
                ? 'text-slate-300 cursor-not-allowed'
                : 'text-slate-700 hover:bg-slate-100 active:scale-95'
            }`}
          >
            {currentTool === 'text' ? (
              <Type className="w-4 h-4" />
            ) : currentTool === 'laser' ? (
              <Sparkles className="w-4 h-4" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Separator */}
        <div className="w-[1px] h-6 bg-slate-200 mx-0.5 sm:mx-1 shrink-0" />

        {/* Active Color Button */}
        <button
          type="button"
          data-color-button
          disabled={disabledDrawing}
          onClick={() => {
            setShowColorPicker(!showColorPicker);
            setShowSizePicker(false);
            setShowInsertMenu(false);
          }}
          title="Change Color"
          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-transform hover:scale-105 border border-slate-200 shadow-inner shrink-0 ${
            disabledDrawing ? 'opacity-40 cursor-not-allowed' : ''
          }`}
          style={{ backgroundColor: currentColor }}
        >
          {currentColor === '#FFFFFF' && <div className="w-2 h-2 rounded-full bg-slate-400" />}
        </button>

        {/* Active Size Button */}
        <button
          type="button"
          data-size-button
          disabled={disabledDrawing}
          onClick={() => {
            setShowSizePicker(!showSizePicker);
            setShowColorPicker(false);
            setShowInsertMenu(false);
          }}
          title="Stroke Size"
          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors shrink-0 ${
            disabledDrawing ? 'opacity-40 cursor-not-allowed' : ''
          }`}
        >
          <div
            className="rounded-full bg-slate-800"
            style={{ width: `${Math.min(14, currentSize * 2.2)}px`, height: `${Math.min(14, currentSize * 2.2)}px` }}
          />
        </button>

        {/* Shape Fill Toggle (when rect or circle is selected) */}
        {['rect', 'circle'].includes(currentTool) && (
          <button
            type="button"
            disabled={disabledDrawing}
            onClick={onFilledToggle}
            title="Toggle Shape Fill"
            className={`px-2 py-1 h-8 sm:h-9 rounded-xl text-xs font-medium border flex items-center gap-1 transition-colors shrink-0 ${
              isFilled
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                : 'border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span className="hidden sm:inline">Fill</span>
            <div className={`w-3 h-3 rounded-sm ${isFilled ? 'bg-indigo-600' : 'border border-slate-400'}`} />
          </button>
        )}

        {/* Separator (visible on md+) */}
        <div className="w-[1px] h-6 bg-slate-200 mx-0.5 sm:mx-1 shrink-0 hidden md:block" />

        {/* Undo / Redo (on small screens handled by bottom-left deck) */}
        <div className="hidden md:flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            disabled={!canUndo || disabledDrawing}
            onClick={onUndo}
            title="Undo (Ctrl+Z)"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-slate-700 hover:bg-slate-100 disabled:text-slate-300 disabled:hover:bg-transparent transition-colors"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={!canRedo || disabledDrawing}
            onClick={onRedo}
            title="Redo (Ctrl+Y)"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-slate-700 hover:bg-slate-100 disabled:text-slate-300 disabled:hover:bg-transparent transition-colors"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
