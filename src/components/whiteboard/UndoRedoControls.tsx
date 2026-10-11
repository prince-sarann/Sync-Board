import React from 'react';
import { Undo2, Redo2 } from 'lucide-react';

interface UndoRedoControlsProps {
  canUndo: boolean;
  canRedo: boolean;
  isLocked: boolean;
  isTeacher: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

export const UndoRedoControls: React.FC<UndoRedoControlsProps> = ({
  canUndo,
  canRedo,
  isLocked,
  isTeacher,
  onUndo,
  onRedo,
}) => {
  const disabledDrawing = isLocked && !isTeacher;
  const isUndoDisabled = !canUndo || disabledDrawing;
  const isRedoDisabled = !canRedo || disabledDrawing;

  return (
    <aside
      aria-label="Undo and Redo Controls"
      className="pointer-events-auto select-none shrink-0"
    >
      <div className="flex items-center gap-0.5 sm:gap-1 p-1 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/90 text-slate-700 animate-in fade-in slide-in-from-bottom-2">
        {/* Undo Button */}
        <button
          type="button"
          disabled={isUndoDisabled}
          onClick={onUndo}
          title={isUndoDisabled ? 'Nothing to undo' : 'Undo recent action (Ctrl+Z)'}
          className={`flex items-center gap-1.5 px-2.5 py-2 sm:px-3.5 sm:py-2 rounded-xl text-xs font-semibold transition-all min-h-[38px] ${
            isUndoDisabled
              ? 'text-slate-300 opacity-40 cursor-not-allowed'
              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 active:scale-95 shadow-sm'
          }`}
        >
          <Undo2 className="w-4 h-4 shrink-0 text-slate-600" />
          <span className="leading-none hidden sm:inline">Undo</span>
        </button>

        {/* Subtle Separator */}
        <div className="w-[1px] h-5 bg-slate-200 shrink-0" />

        {/* Redo Button */}
        <button
          type="button"
          disabled={isRedoDisabled}
          onClick={onRedo}
          title={isRedoDisabled ? 'Nothing to redo' : 'Redo recent action (Ctrl+Y)'}
          className={`flex items-center gap-1.5 px-2.5 py-2 sm:px-3.5 sm:py-2 rounded-xl text-xs font-semibold transition-all min-h-[38px] ${
            isRedoDisabled
              ? 'text-slate-300 opacity-40 cursor-not-allowed'
              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 active:scale-95 shadow-sm'
          }`}
        >
          <Redo2 className="w-4 h-4 shrink-0 text-slate-600" />
          <span className="leading-none hidden sm:inline">Redo</span>
        </button>
      </div>
    </aside>
  );
};
