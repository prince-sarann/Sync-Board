import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Edit2,
  Copy,
  Trash2,
  FileText,
  Check,
  X,
  Layers,
} from 'lucide-react';
import { WhiteboardPage } from '../../types';

interface PageNavigationProps {
  pages: WhiteboardPage[];
  activePageId: string;
  isTeacher: boolean;
  isLocked: boolean;
  onPageSwitch: (pageId: string) => void;
  onPageAdd: () => void;
  onPageRename: (pageId: string, newName: string) => void;
  onPageDelete: (pageId: string) => void;
  onPageDuplicate: (pageId: string) => void;
}

export const PageNavigation: React.FC<PageNavigationProps> = ({
  pages,
  activePageId,
  isTeacher,
  isLocked,
  onPageSwitch,
  onPageAdd,
  onPageRename,
  onPageDelete,
  onPageDuplicate,
}) => {
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const [menuPageId, setMenuPageId] = useState<string | null>(null);
  const [showDeleteConfirmId, setShowDeleteConfirmId] = useState<string | null>(null);
  const [showPagesDrawer, setShowPagesDrawer] = useState(false);

  const editInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const currentIndex = pages.findIndex((p) => p.id === activePageId);
  const activePage = pages[currentIndex] || pages[0];

  useEffect(() => {
    if (editingPageId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingPageId]);

  const handleStartRename = (page: WhiteboardPage) => {
    setEditingPageId(page.id);
    setEditingName(page.name);
    setMenuPageId(null);
  };

  const handleSaveRename = (pageId: string) => {
    if (editingName.trim()) {
      onPageRename(pageId, editingName.trim());
    }
    setEditingPageId(null);
  };

  const handlePrevPage = () => {
    if (currentIndex > 0) {
      onPageSwitch(pages[currentIndex - 1].id);
    }
  };

  const handleNextPage = () => {
    if (currentIndex < pages.length - 1) {
      onPageSwitch(pages[currentIndex + 1].id);
    }
  };

  const canManagePages = isTeacher || !isLocked;

  return (
    <>
      {/* Bottom Center Page Navigation Bar */}
      <nav aria-label="Page navigation" className="pointer-events-auto flex items-center gap-1 sm:gap-1.5 p-1 sm:p-1.5 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/90 text-slate-700 max-w-full select-none animate-in fade-in slide-in-from-bottom-2 min-h-[38px]">
        {/* Previous Page Arrow */}
        <button
          type="button"
          onClick={handlePrevPage}
          disabled={currentIndex <= 0}
          className="p-1 sm:p-1.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors shrink-0"
          title="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Scrollable Page Tabs */}
        <div
          ref={scrollContainerRef}
          className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 px-0.5 sm:px-1 max-w-[28vw] sm:max-w-[260px] md:max-w-md shrink"
        >
          {pages.map((page, index) => {
            const isActive = page.id === activePageId;
            const isEditing = editingPageId === page.id;

            if (isEditing) {
              return (
                <div
                  key={page.id}
                  className="flex items-center gap-1 px-2 py-1 bg-indigo-50 border border-indigo-300 rounded-xl"
                >
                  <input
                    ref={editInputRef}
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveRename(page.id);
                      if (e.key === 'Escape') setEditingPageId(null);
                    }}
                    className="w-24 text-xs font-semibold text-indigo-950 bg-white px-1.5 py-0.5 rounded border border-indigo-200 outline-none"
                    maxLength={30}
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveRename(page.id)}
                    className="p-0.5 text-emerald-600 hover:bg-emerald-100 rounded"
                    title="Save name"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingPageId(null)}
                    className="p-0.5 text-rose-600 hover:bg-rose-100 rounded"
                    title="Cancel"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            }

            return (
              <div
                key={page.id}
                className={`group relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all shrink-0 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                    : 'bg-slate-100/80 hover:bg-slate-200/90 text-slate-700'
                }`}
                onClick={() => onPageSwitch(page.id)}
              >
                <span className="truncate max-w-[70px] sm:max-w-[110px] md:max-w-[140px]">
                  {page.name || `Page ${index + 1}`}
                </span>

                {/* Page element count tag */}
                {page.elements.length > 0 && (
                  <span
                    className={`text-[10px] px-1 rounded-full ${
                      isActive ? 'bg-indigo-700/80 text-indigo-100' : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {page.elements.length}
                  </span>
                )}

                {/* Teacher / Manager Page Action Trigger */}
                {canManagePages && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuPageId(menuPageId === page.id ? null : page.id);
                    }}
                    className={`p-0.5 rounded opacity-70 hover:opacity-100 transition-opacity ${
                      isActive ? 'hover:bg-indigo-700' : 'hover:bg-slate-300'
                    }`}
                    title="Page options"
                  >
                    <MoreVertical className="w-3 h-3" />
                  </button>
                )}

                {/* Page Action Popover Menu */}
                {menuPageId === page.id && (
                  <div
                    className="absolute bottom-full mb-2 left-0 w-36 bg-white rounded-xl shadow-2xl border border-slate-200 py-1 z-40 text-xs font-medium text-slate-700 animate-in fade-in"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => handleStartRename(page)}
                      className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-slate-50"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Rename</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuPageId(null);
                        onPageDuplicate(page.id);
                      }}
                      className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-slate-50"
                    >
                      <Copy className="w-3.5 h-3.5 text-slate-600" />
                      <span>Duplicate</span>
                    </button>
                    {pages.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setMenuPageId(null);
                          setShowDeleteConfirmId(page.id);
                        }}
                        className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-rose-50 text-rose-600 border-t border-slate-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add Page Button */}
        {canManagePages && (
          <button
            type="button"
            onClick={onPageAdd}
            className="p-1 sm:p-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-all active:scale-95 shadow-sm shrink-0"
            title="Create new page (+)"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}

        {/* Next Page Arrow */}
        <button
          type="button"
          onClick={handleNextPage}
          disabled={currentIndex >= pages.length - 1}
          className="p-1 sm:p-1.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors shrink-0"
          title="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-slate-200 mx-0.5 shrink-0" />

        {/* Page Overview / Drawer Trigger */}
        <button
          type="button"
          onClick={() => setShowPagesDrawer(!showPagesDrawer)}
          className="flex items-center gap-1 px-1.5 sm:px-2 py-1 sm:py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors shrink-0"
          title="View all pages overview"
        >
          <Layers className="w-3.5 h-3.5 text-indigo-600" />
          <span className="font-mono text-[11px] sm:text-xs">
            {currentIndex + 1}/{pages.length}
          </span>
        </button>
      </nav>

      {/* Pages Overview Drawer / Modal */}
      {showPagesDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Classroom Whiteboard Pages</h3>
                  <p className="text-xs text-slate-500">
                    {pages.length} total page{pages.length > 1 ? 's' : ''} • Synchronized in real time
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPagesDrawer(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Grid of Pages */}
            <div className="p-5 max-h-96 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-3">
              {pages.map((page, index) => {
                const isActive = page.id === activePageId;
                return (
                  <div
                    key={page.id}
                    onClick={() => {
                      onPageSwitch(page.id);
                      setShowPagesDrawer(false);
                    }}
                    className={`flex flex-col rounded-xl border p-3 cursor-pointer transition-all hover:shadow-md ${
                      isActive
                        ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                    }`}
                  >
                    {/* Simulated Page Thumbnail Canvas */}
                    <div className="aspect-[4/3] bg-white rounded-lg border border-slate-200/80 mb-2 flex items-center justify-center relative overflow-hidden shadow-inner">
                      {page.elements.length > 0 ? (
                        <div className="text-center p-2">
                          <FileText className="w-6 h-6 text-indigo-400 mx-auto mb-1" />
                          <span className="text-[10px] font-semibold text-slate-500">
                            {page.elements.length} element{page.elements.length > 1 ? 's' : ''}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Blank page</span>
                      )}

                      {isActive && (
                        <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-indigo-600 text-white text-[9px] font-bold rounded-md shadow">
                          ACTIVE
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 truncate">
                        {index + 1}. {page.name}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              {canManagePages ? (
                <button
                  type="button"
                  onClick={() => {
                    onPageAdd();
                    setShowPagesDrawer(false);
                  }}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add New Page</span>
                </button>
              ) : <div />}

              <button
                type="button"
                onClick={() => setShowPagesDrawer(false)}
                className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Page Confirmation Modal */}
      {showDeleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm p-6 text-center animate-in zoom-in-95">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-1.5">Delete This Page?</h3>
            <p className="text-xs text-slate-500 mb-6">
              All drawings and elements on this page will be removed. Other pages will remain untouched.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirmId(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onPageDelete(showDeleteConfirmId);
                  setShowDeleteConfirmId(null);
                }}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-sm"
              >
                Delete Page
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
