import React from 'react';
import { Download, Home, LogOut, FileImage, FileText } from 'lucide-react';

interface ClassEndedModalProps {
  isOpen: boolean;
  classCode: string;
  onExportPNG: () => void;
  onExportPDF: () => void;
  onReturnHome: () => void;
}

export const ClassEndedModal: React.FC<ClassEndedModalProps> = ({
  isOpen,
  classCode,
  onExportPNG,
  onExportPDF,
  onReturnHome,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-md animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden text-center p-6 sm:p-8 animate-in zoom-in-95">
        <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
          <LogOut className="w-7 h-7" />
        </div>

        <h2 className="text-xl font-bold text-slate-900 mb-2">This Class Has Ended</h2>
        <p className="text-xs sm:text-sm text-slate-500 mb-6 leading-relaxed">
          The teacher has concluded this whiteboard session. You can save a high-definition copy of the final notes or return home.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5 mb-6">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onExportPNG}
              className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors border border-slate-200/80"
            >
              <FileImage className="w-4 h-4 text-indigo-600" />
              <span>Save as PNG</span>
            </button>
            <button
              type="button"
              onClick={onExportPDF}
              className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors border border-slate-200/80"
            >
              <FileText className="w-4 h-4 text-rose-600" />
              <span>Save as PDF</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onReturnHome}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-98"
          >
            <Home className="w-4 h-4" />
            <span>Return to Home</span>
          </button>
        </div>

        <div className="text-[11px] text-slate-400 font-mono">
          Session Code: {classCode}
        </div>
      </div>
    </div>
  );
};
