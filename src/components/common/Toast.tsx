import React from 'react';
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import { ToastMessage } from '../../types';

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <aside aria-label="Notifications" className="fixed top-16 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full">
      {toasts.map((toast) => {
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-xl shadow-lg border text-xs font-medium backdrop-blur-md transition-all animate-in slide-in-from-top-2 duration-200 ${
              toast.type === 'success'
                ? 'bg-emerald-50/95 border-emerald-200 text-emerald-900'
                : toast.type === 'error'
                ? 'bg-rose-50/95 border-rose-200 text-rose-900'
                : toast.type === 'warning'
                ? 'bg-amber-50/95 border-amber-200 text-amber-900'
                : 'bg-white/95 border-slate-200 text-slate-800'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
              {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
              {toast.type === 'warning' && <TriangleAlert className="w-4 h-4 text-amber-600 shrink-0" />}
              {toast.type === 'info' && <Info className="w-4 h-4 text-indigo-600 shrink-0" />}
              <span>{toast.message}</span>
            </div>

            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="p-1 hover:bg-black/5 rounded-md transition-colors"
            >
              <X className="w-3.5 h-3.5 opacity-60 hover:opacity-100" />
            </button>
          </div>
        );
      })}
    </aside>
  );
};
