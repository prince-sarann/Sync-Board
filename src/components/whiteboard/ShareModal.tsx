import React, { useState } from 'react';
import { Check, Copy, QrCode, Share2, X, Link, Smartphone } from 'lucide-react';
import { generateQRCodeSVG } from '../../utils/qr';

interface ShareModalProps {
  isOpen: boolean;
  classCode: string;
  onClose: () => void;
  onShowToast: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, classCode, onClose, onShowToast }) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  const inviteUrl = typeof window !== 'undefined' ? `${window.location.origin}/join/${classCode}` : `https://syncboard.app/join/${classCode}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(classCode);
    setCopiedCode(true);
    onShowToast('Class Code copied to clipboard!', 'success');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    onShowToast('Invite Link copied to clipboard!', 'success');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my SyncBoard Classroom',
          text: `Join my live collaborative whiteboard on SyncBoard using Class Code: ${classCode}`,
          url: inviteUrl,
        });
      } catch {
        // Ignored if cancelled
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-base">Share Classroom</h3>
              <p className="text-xs text-slate-500">Invite students and collaborators to draw live</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-5">
          {/* Class Code Box */}
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-1.5">
              Class Code
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-50 border-2 border-indigo-100 rounded-xl px-4 py-3 text-center">
                <span className="font-mono text-2xl font-bold tracking-widest text-indigo-600 select-all">
                  {classCode}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-4 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95 shrink-0"
              >
                {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
              </button>
            </div>
          </div>

          {/* Invite Link Box */}
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-1.5">
              Direct Invite Link
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-700 truncate select-all">
                {inviteUrl}
              </div>
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-colors shrink-0"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Link className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
              </button>
            </div>
          </div>

          {/* QR Code Section */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 flex items-center gap-4">
            <div
              className="shrink-0"
              dangerouslySetInnerHTML={{ __html: generateQRCodeSVG(inviteUrl, 100) }}
            />
            <div className="flex flex-col gap-1 text-left">
              <div className="flex items-center gap-1 text-xs font-semibold text-slate-800">
                <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
                <span>Scan with Mobile Camera</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Scan this QR code with any smartphone to open and draw on this whiteboard immediately.
              </p>
            </div>
          </div>

          {/* Native Share button */}
          <button
            type="button"
            onClick={handleNativeShare}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <Share2 className="w-4 h-4" />
            <span>Share via Apps / Messages</span>
          </button>
        </div>
      </div>
    </div>
  );
};
