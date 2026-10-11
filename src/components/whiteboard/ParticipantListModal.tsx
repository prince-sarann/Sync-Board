import React from 'react';
import { Crown, Users, X, User, Mic, MicOff, Radio } from 'lucide-react';
import { Participant, VoicePeer, VoiceState } from '../../types';

interface ParticipantListModalProps {
  isOpen: boolean;
  participants: Participant[];
  currentUserId: string;
  voiceState: VoiceState;
  voicePeers: VoicePeer[];
  onClose: () => void;
}

export const ParticipantListModal: React.FC<ParticipantListModalProps> = ({
  isOpen,
  participants,
  currentUserId,
  voiceState,
  voicePeers,
  onClose,
}) => {
  if (!isOpen) return null;

  const teacher = participants.find((p) => p.role === 'teacher');
  const students = participants.filter((p) => p.role !== 'teacher');

  const getVoiceInfo = (p: Participant) => {
    const isSelf = p.userId === currentUserId;
    if (isSelf) {
      if (!voiceState.isConnected) return null;
      return {
        isActive: true,
        isMuted: voiceState.isMuted,
        isSpeaking: voiceState.isSpeaking,
      };
    }

    const peer = voicePeers.find((vp) => vp.socketId === p.socketId || vp.userId === p.userId);
    if (!peer) return null;
    return {
      isActive: true,
      isMuted: peer.isMuted,
      isSpeaking: peer.isSpeaking && !peer.isMuted,
    };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">Classroom Participants</h3>
              <p className="text-xs text-slate-500">
                {participants.length} online • {voicePeers.length + (voiceState.isConnected ? 1 : 0)} in voice
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List */}
        <div className="p-4 max-h-80 overflow-y-auto flex flex-col gap-2">
          {/* Teacher item */}
          {teacher && (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-100">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm ring-2 ring-white"
                  style={{ backgroundColor: teacher.color }}
                >
                  <Crown className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-900">{teacher.name}</span>
                    {teacher.userId === currentUserId && (
                      <span className="text-[10px] text-indigo-600 font-bold bg-indigo-100/70 px-1.5 py-0.2 rounded-full">
                        You
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-indigo-600 font-medium">Teacher (Host)</span>
                </div>
              </div>

              {/* Voice status */}
              <div className="flex items-center gap-2">
                {(() => {
                  const voice = getVoiceInfo(teacher);
                  if (!voice) return null;
                  return (
                    <div
                      className={`p-1 rounded-md flex items-center gap-1 text-[10px] font-semibold ${
                        voice.isSpeaking
                          ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-400'
                          : voice.isMuted
                          ? 'bg-rose-100 text-rose-600'
                          : 'bg-slate-200/70 text-slate-700'
                      }`}
                      title={voice.isMuted ? 'Muted' : voice.isSpeaking ? 'Speaking' : 'Voice Connected'}
                    >
                      {voice.isMuted ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                    </div>
                  );
                })()}
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Connected" />
              </div>
            </div>
          )}

          {/* Students list */}
          {students.map((student) => {
            const voice = getVoiceInfo(student);
            return (
              <div
                key={student.socketId}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm"
                    style={{ backgroundColor: student.color }}
                  >
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-slate-800">{student.name}</span>
                      {student.userId === currentUserId && (
                        <span className="text-[10px] text-slate-600 font-semibold bg-slate-100 px-1.5 py-0.2 rounded-full">
                          You
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400">Student</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {voice && (
                    <div
                      className={`p-1 rounded-md flex items-center gap-1 text-[10px] font-semibold ${
                        voice.isSpeaking
                          ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-400'
                          : voice.isMuted
                          ? 'bg-rose-100 text-rose-600'
                          : 'bg-slate-200/70 text-slate-700'
                      }`}
                      title={voice.isMuted ? 'Muted' : voice.isSpeaking ? 'Speaking' : 'Voice Connected'}
                    >
                      {voice.isMuted ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                    </div>
                  )}
                  <div className="w-2 h-2 rounded-full bg-emerald-500" title="Connected" />
                </div>
              </div>
            );
          })}

          {participants.length === 0 && (
            <div className="text-center py-6 text-xs text-slate-400">No participants online</div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
