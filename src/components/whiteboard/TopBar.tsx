import React, { useState } from 'react';
import {
  Check,
  ChevronDown,
  Copy,
  Download,
  Grid,
  Lock,
  LogOut,
  Mic,
  Share2,
  Trash2,
  Unlock,
  Users,
  ZoomIn,
  ZoomOut,
  FileImage,
  FileText,
  Files,
  ClipboardCheck,
} from 'lucide-react';
import { CanvasTransform, ConnectionStatus, GridStyle, Participant, VoicePeer, VoiceState } from '../../types';

interface TopBarProps {
  classCode: string;
  roomTitle: string;
  activePageName?: string;
  totalPagesCount?: number;
  isTeacher: boolean;
  isLocked: boolean;
  participants: Participant[];
  currentUser: Participant | null;
  connectionStatus: ConnectionStatus;
  voiceState: VoiceState;
  voicePeers: VoicePeer[];
  transform: CanvasTransform;
  gridStyle: GridStyle;
  onGridStyleChange: (style: GridStyle) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onOpenShare: () => void;
  onOpenParticipants: () => void;
  onToggleLock: () => void;
  onClearBoard: () => void;
  onEndClass: () => void;
  onLeaveClass: () => void;
  onExportPNG: () => void;
  onExportPDF: () => void;
  onExportAllPDF: () => void;
  onCopyImage: () => void;
  onCopyCode: () => void;
  onJoinVoice: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  classCode,
  roomTitle,
  activePageName,
  totalPagesCount,
  isTeacher,
  isLocked,
  participants,
  currentUser,
  connectionStatus,
  voiceState,
  voicePeers,
  transform,
  gridStyle,
  onGridStyleChange,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onOpenShare,
  onOpenParticipants,
  onToggleLock,
  onClearBoard,
  onEndClass,
  onLeaveClass,
  onExportPNG,
  onExportPDF,
  onExportAllPDF,
  onCopyImage,
  onCopyCode,
  onJoinVoice,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showGridMenu, setShowGridMenu] = useState(false);

  const handleCopyCodeClick = () => {
    onCopyCode();
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const zoomPercent = Math.round(transform.scale * 100);

  return (
    <header className="h-14 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3 sm:px-4 flex items-center justify-between gap-2 select-none relative z-30 shrink-0">
      {/* Zone 1: Brand & Class Code Pill */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm font-bold text-base">
            S
          </div>
          <span className="font-bold text-base sm:text-lg tracking-tight text-slate-900 hidden md:inline">
            SyncBoard
          </span>
        </div>

        <div className="h-5 w-[1px] bg-slate-200 hidden sm:block" />

        {/* Class Code Pill */}
        <div className="flex items-center bg-slate-100 hover:bg-slate-200/80 rounded-lg p-0.5 sm:p-1 border border-slate-200/70 transition-colors">
          <button
            type="button"
            onClick={handleCopyCodeClick}
            className="flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold tracking-wider text-slate-800"
            title="Click to copy class code"
          >
            <span className="text-slate-400 font-normal text-[11px] hidden sm:inline">Code:</span>
            <span className="font-mono text-indigo-700">{classCode}</span>
            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
          </button>
        </div>

        {/* Active Page Chip */}
        {activePageName && (
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200">
            <span className="text-slate-400 font-normal">Page:</span>
            <span className="text-indigo-700 truncate max-w-[120px]">{activePageName}</span>
          </div>
        )}

        {/* Share Button */}
        <button
          type="button"
          onClick={onOpenShare}
          className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Share</span>
        </button>
      </div>

      {/* Zone 2: View Controls (Zoom, Grid) & Status */}
      <div className="hidden lg:flex items-center gap-2">
        {/* Zoom Controls */}
        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-0.5 text-xs text-slate-700 font-medium">
          <button
            type="button"
            onClick={onZoomOut}
            className="p-1 hover:bg-slate-200/70 rounded transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onResetZoom}
            className="px-1.5 py-0.5 hover:bg-slate-200/70 rounded text-[11px] font-mono"
            title="Reset Zoom"
          >
            {zoomPercent}%
          </button>
          <button
            type="button"
            onClick={onZoomIn}
            className="p-1 hover:bg-slate-200/70 rounded transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Grid Selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowGridMenu(!showGridMenu)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Grid className="w-3.5 h-3.5 text-slate-500" />
            <span className="capitalize">{gridStyle}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showGridMenu && (
            <div className="absolute top-full mt-1 left-0 w-32 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-40 text-xs font-medium animate-in fade-in">
              {(['dots', 'grid', 'lines', 'none'] as GridStyle[]).map((style) => (
                <button
                  key={style}
                  type="button"
                  onClick={() => {
                    onGridStyleChange(style);
                    setShowGridMenu(false);
                  }}
                  className={`w-full px-3 py-1.5 text-left capitalize flex items-center justify-between hover:bg-slate-50 ${
                    gridStyle === style ? 'text-indigo-600 font-semibold bg-indigo-50/50' : 'text-slate-700'
                  }`}
                >
                  <span>{style}</span>
                  {gridStyle === style && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Zone 3: Presence, Teacher Controls & Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Voice Quick Trigger Button (Shown on wide screens, primary control is in bottom deck) */}
        {!voiceState.isConnected && (
          <button
            type="button"
            onClick={onJoinVoice}
            disabled={voiceState.isConnecting}
            className="hidden xl:flex px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 text-xs font-semibold items-center gap-1.5 transition-colors"
            title="Join voice communication"
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Voice</span>
            {voicePeers.length > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>
        )}

        {/* Online Participants Pill */}
        <button
          type="button"
          onClick={onOpenParticipants}
          className="px-2 sm:px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          title="View active participants"
        >
          <Users className="w-3.5 h-3.5 text-indigo-600" />
          <span>{participants.length}</span>
          <span className="hidden sm:inline">Online</span>
        </button>

        {/* Teacher Specific Controls */}
        {isTeacher ? (
          <>
            {/* Lock / Unlock Board */}
            <button
              type="button"
              onClick={onToggleLock}
              className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                isLocked
                  ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                  : 'border border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
              title={isLocked ? 'Unlock board for students' : 'Lock board (Teacher only drawing)'}
            >
              {isLocked ? <Lock className="w-3.5 h-3.5 text-amber-700" /> : <Unlock className="w-3.5 h-3.5 text-slate-500" />}
              <span className="hidden sm:inline">{isLocked ? 'Locked' : 'Lock'}</span>
            </button>

            {/* Clear Current Board */}
            <button
              type="button"
              onClick={onClearBoard}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 text-slate-600 text-xs font-medium flex items-center gap-1 transition-colors"
              title="Clear entire whiteboard on current page"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Clear Board</span>
            </button>

            {/* End Class */}
            <button
              type="button"
              onClick={onEndClass}
              className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
              title="End class for everyone"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">End Class</span>
            </button>
          </>
        ) : (
          /* Student Leave Class */
          <button
            type="button"
            onClick={onLeaveClass}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
            title="Leave classroom"
          >
            <LogOut className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Leave</span>
          </button>
        )}

        {/* Export Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
            <ChevronDown className="w-3 h-3 opacity-70" />
          </button>

          {showExportMenu && (
            <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-40 text-xs font-medium animate-in fade-in">
              <button
                type="button"
                onClick={() => {
                  onExportPNG();
                  setShowExportMenu(false);
                }}
                className="w-full px-3 py-2 text-left flex items-center gap-2.5 hover:bg-slate-50 text-slate-700"
              >
                <FileImage className="w-4 h-4 text-indigo-600" />
                <span>Download Current Page (PNG)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onExportPDF();
                  setShowExportMenu(false);
                }}
                className="w-full px-3 py-2 text-left flex items-center gap-2.5 hover:bg-slate-50 text-slate-700"
              >
                <FileText className="w-4 h-4 text-rose-600" />
                <span>Download Current Page (PDF)</span>
              </button>
              {(totalPagesCount || 1) > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    onExportAllPDF();
                    setShowExportMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left flex items-center gap-2.5 hover:bg-slate-50 text-indigo-600 font-semibold"
                >
                  <Files className="w-4 h-4 text-indigo-600" />
                  <span>Download All Pages (PDF)</span>
                </button>
              )}
              <div className="my-1 border-t border-slate-100" />
              <button
                type="button"
                onClick={() => {
                  onCopyImage();
                  setShowExportMenu(false);
                }}
                className="w-full px-3 py-2 text-left flex items-center gap-2.5 hover:bg-slate-50 text-slate-700"
              >
                <ClipboardCheck className="w-4 h-4 text-emerald-600" />
                <span>Copy Current Page to Clipboard</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
