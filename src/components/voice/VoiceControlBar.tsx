import React, { useState } from 'react';
import {
  Mic,
  MicOff,
  PhoneOff,
  Volume2,
  VolumeX,
  Radio,
  Users,
  ChevronUp,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { Participant, VoicePeer, VoiceState } from '../../types';

interface VoiceControlBarProps {
  voiceState: VoiceState;
  voicePeers: VoicePeer[];
  currentUser: Participant | null;
  onJoinVoice: () => void;
  onLeaveVoice: () => void;
  onToggleMute: () => void;
  onToggleDeafen: () => void;
}

export const VoiceControlBar: React.FC<VoiceControlBarProps> = ({
  voiceState,
  voicePeers,
  currentUser,
  onJoinVoice,
  onLeaveVoice,
  onToggleMute,
  onToggleDeafen,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // If not connected to voice, display the Join Voice trigger pill
  if (!voiceState.isConnected) {
    return (
      <aside aria-label="Voice controls" className="pointer-events-auto shrink-0 select-none">
        <button
          type="button"
          disabled={voiceState.isConnecting}
          onClick={onJoinVoice}
          className="flex items-center gap-2 px-2.5 sm:px-3.5 py-2 bg-white/95 hover:bg-white text-slate-800 rounded-2xl shadow-xl border border-slate-200/90 backdrop-blur-md transition-all hover:shadow-2xl active:scale-95 text-xs font-semibold group min-h-[38px]"
          title="Join live voice communication with classmates"
        >
          <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors shrink-0">
            {voiceState.isConnecting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Mic className="w-3.5 h-3.5" />
            )}
          </div>

          <div className="hidden sm:flex flex-col text-left">
            <span className="leading-none text-[11px] font-bold text-slate-900">
              {voiceState.isConnecting ? 'Connecting Voice...' : 'Join Voice'}
            </span>
            {voicePeers.length > 0 && (
              <span className="text-[10px] text-emerald-600 font-medium">
                {voicePeers.length} in voice
              </span>
            )}
          </div>
        </button>
      </aside>
    );
  }

  // Local user is connected to voice
  const totalVoiceCount = voicePeers.length + 1; // peers + self

  return (
    <aside aria-label="Voice controls" className="pointer-events-auto shrink-0 select-none flex flex-col items-end gap-2">
      {/* Expanded Voice Participants Drawer */}
      {isExpanded && (
        <div className="bg-white/95 backdrop-blur-md rounded-2xl p-3 border border-slate-200 shadow-xl w-64 max-h-56 overflow-y-auto flex flex-col gap-1.5 animate-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 px-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
              <span>Voice Channel</span>
            </div>
            <span className="text-[10px] font-semibold text-slate-400">
              {totalVoiceCount} connected
            </span>
          </div>

          {/* Self */}
          <div
            className={`flex items-center justify-between px-2 py-1.5 rounded-xl text-xs transition-colors ${
              voiceState.isSpeaking
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-900 font-semibold'
                : 'bg-slate-50 text-slate-700 font-medium'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div
                style={{ backgroundColor: currentUser?.color || '#4F46E5' }}
                className={`w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0 ${
                  voiceState.isSpeaking ? 'ring-2 ring-emerald-500 ring-offset-1' : ''
                }`}
              >
                {currentUser?.name?.charAt(0) || 'Y'}
              </div>
              <span className="truncate text-xs">
                {currentUser?.name || 'You'} (You)
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {voiceState.isSpeaking && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              )}
              {voiceState.isMuted ? (
                <MicOff className="w-3.5 h-3.5 text-rose-500" />
              ) : (
                <Mic className="w-3.5 h-3.5 text-emerald-600" />
              )}
            </div>
          </div>

          {/* Remote Peers */}
          {voicePeers.map((peer) => {
            const isSpeaking = peer.isSpeaking && !peer.isMuted;
            return (
              <div
                key={peer.socketId}
                className={`flex items-center justify-between px-2 py-1.5 rounded-xl text-xs transition-colors ${
                  isSpeaking
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-900 font-semibold'
                    : 'bg-slate-50 text-slate-700 font-medium'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    style={{ backgroundColor: peer.color || '#059669' }}
                    className={`w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0 ${
                      isSpeaking ? 'ring-2 ring-emerald-500 ring-offset-1' : ''
                    }`}
                  >
                    {peer.name.charAt(0)}
                  </div>
                  <span className="truncate text-xs">{peer.name}</span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {isSpeaking && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  )}
                  {peer.isMuted ? (
                    <MicOff className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <Mic className="w-3.5 h-3.5 text-emerald-600" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Main Voice Floating Action Pill */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-900/90 text-white rounded-2xl shadow-2xl border border-slate-700/80 backdrop-blur-md">
        {/* Toggle List View */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-slate-800 rounded-xl text-xs font-semibold transition-colors"
          title="Toggle voice participants list"
        >
          <div className="relative">
            <Radio className="w-4 h-4 text-emerald-400" />
            {voiceState.isSpeaking && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            )}
          </div>
          <span className="hidden sm:inline text-xs font-medium text-slate-200">
            {totalVoiceCount}
          </span>
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
          )}
        </button>

        <div className="w-px h-5 bg-slate-700" />

        {/* Mute / Unmute Button */}
        <button
          type="button"
          onClick={onToggleMute}
          className={`p-2 rounded-xl transition-all ${
            voiceState.isMuted
              ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30'
              : voiceState.isSpeaking
              ? 'bg-emerald-500 text-white ring-2 ring-emerald-400 ring-offset-1 ring-offset-slate-900'
              : 'bg-slate-800 text-emerald-400 hover:bg-slate-700'
          }`}
          title={voiceState.isMuted ? 'Unmute microphone' : 'Mute microphone'}
        >
          {voiceState.isMuted ? (
            <MicOff className="w-4 h-4" />
          ) : (
            <Mic className="w-4 h-4" />
          )}
        </button>

        {/* Speaker / Deafen Toggle Button */}
        <button
          type="button"
          onClick={onToggleDeafen}
          className={`p-2 rounded-xl transition-colors ${
            voiceState.isDeafened
              ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30'
              : 'hover:bg-slate-800 text-slate-300 hover:text-white'
          }`}
          title={voiceState.isDeafened ? 'Turn on speaker' : 'Mute incoming audio (Deafen)'}
        >
          {voiceState.isDeafened ? (
            <VolumeX className="w-4 h-4" />
          ) : (
            <Volume2 className="w-4 h-4" />
          )}
        </button>

        {/* Leave Voice Button */}
        <button
          type="button"
          onClick={onLeaveVoice}
          className="p-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-colors active:scale-95"
          title="Leave voice communication"
        >
          <PhoneOff className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
