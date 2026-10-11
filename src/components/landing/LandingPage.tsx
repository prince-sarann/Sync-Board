import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Lock,
  PenTool,
  QrCode,
  Share2,
  Smartphone,
  Sparkles,
  Users,
  Zap,
  Layers,
  HelpCircle,
  Plus,
  LogIn,
} from 'lucide-react';
import { BoardElement } from '../../types';

interface LandingPageProps {
  onCreateClass: (preferredName?: string, title?: string) => void;
  onJoinClass: (code: string, preferredName?: string) => void;
  initialJoinCode?: string;
  joinErrorMessage?: string | null;
  isSubmitting?: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onCreateClass,
  onJoinClass,
  initialJoinCode = '',
  joinErrorMessage = null,
  isSubmitting = false,
}) => {
  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(Boolean(initialJoinCode));

  // Form states
  const [teacherName, setTeacherName] = useState('');
  const [classTitle, setClassTitle] = useState('');
  const [joinCode, setJoinCode] = useState(initialJoinCode);
  const [studentName, setStudentName] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  // Sync initial join code if opened via URL /join/CODE
  useEffect(() => {
    if (initialJoinCode) {
      setJoinCode(initialJoinCode.toUpperCase());
      setShowJoinModal(true);
    }
  }, [initialJoinCode]);

  useEffect(() => {
    if (joinErrorMessage) {
      setLocalError(joinErrorMessage);
    }
  }, [joinErrorMessage]);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateClass(teacherName.trim() || undefined, classTitle.trim() || undefined);
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = joinCode.toUpperCase().trim();
    if (!cleanCode || cleanCode.length < 4) {
      setLocalError('Please enter a valid 6-character Class Code.');
      return;
    }
    setLocalError(null);
    onJoinClass(cleanCode, studentName.trim() || undefined);
  };

  // Demo Canvas mini interactive preview
  const [demoElements, setDemoElements] = useState<
    { type: string; text?: string; points?: { x: number; y: number }[]; color: string }[]
  >([
    {
      type: 'math',
      text: '∫ x² · eˣ dx = x²eˣ - 2xeˣ + 2eˣ + C',
      color: '#4F46E5',
    },
  ]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Bar Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Brand zone: single text element */}
          <a href="#" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-sm group-hover:bg-indigo-700 transition-colors">
              S
            </div>
            <span className="font-bold text-lg tracking-tight text-slate-900">SyncBoard</span>
          </a>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-600">
            <a href="#features" className="hover:text-slate-900 transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-slate-900 transition-colors">
              How It Works
            </a>
            <a href="#faq" className="hover:text-slate-900 transition-colors">
              FAQ
            </a>
          </nav>

          {/* Primary actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => {
                setLocalError(null);
                setShowJoinModal(true);
              }}
              className="px-3 sm:px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors shrink-0"
            >
              Join Class
            </button>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="px-3.5 sm:px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm hover:shadow transition-all active:scale-95 shrink-0"
            >
              Create Class
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="pt-16 pb-12 sm:pt-24 sm:pb-16 px-4 sm:px-6 max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold mb-6 animate-in fade-in">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Zero Login Required • Instant 6-Digit Class Codes</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 mb-6 max-w-3xl mx-auto leading-[1.15]">
            Solve Together. <br />
            <span className="text-indigo-600">In Real Time.</span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
            Create a class, share the code, and write together on one live whiteboard. Built for tutors, study groups, classrooms, and teams.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 max-w-md mx-auto mb-14">
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="w-full sm:w-auto px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Create Class</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setLocalError(null);
                setShowJoinModal(true);
              }}
              className="w-full sm:w-auto px-6 py-3.5 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-sm rounded-xl border border-slate-300 shadow-sm transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <LogIn className="w-4 h-4 text-slate-500" />
              <span>Join with Code</span>
            </button>
          </div>

          {/* Interactive Live Classroom Demo Preview */}
          <div className="relative rounded-2xl border border-slate-200 bg-white shadow-2xl p-2 sm:p-4 overflow-hidden max-w-4xl mx-auto text-left">
            {/* Window header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3 px-2">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                </div>
                <div className="ml-3 px-2.5 py-0.5 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-700 text-[11px] font-mono font-semibold">
                  Class Code: K7P2XA
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex -space-x-1.5">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
                    T
                  </div>
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
                    S1
                  </div>
                  <div className="w-6 h-6 rounded-full bg-amber-600 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
                    S2
                  </div>
                </div>
                <span className="text-xs text-slate-500 font-medium">3 Online</span>
              </div>
            </div>

            {/* Simulated whiteboard canvas */}
            <div className="h-64 sm:h-80 bg-slate-50 rounded-xl relative overflow-hidden flex flex-col justify-center items-center border border-slate-100">
              {/* Dot Grid Background */}
              <div
                className="absolute inset-0 opacity-40 pointer-events-none"
                style={{
                  backgroundImage: 'radial-gradient(#94A3B8 1px, transparent 1px)',
                  backgroundSize: '20px 20px',
                }}
              />

              {/* Sample Math Equation on Board */}
              <div className="relative z-10 text-center px-4">
                <span className="inline-block px-3 py-1 bg-amber-100 text-amber-900 rounded-lg text-xs font-semibold mb-3">
                  Physics & Calculus • Room K7P2XA
                </span>
                <h3 className="font-mono text-xl sm:text-3xl font-bold text-slate-800 tracking-wide mb-2">
                  E = mc² &nbsp;|&nbsp; ∇ × B = μ₀J
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">
                  f(x) = sin(θ) + cos(θ) → Simultaneous multi-user live drawing
                </p>
              </div>

              {/* Simulated Teacher Cursor */}
              <div className="absolute top-12 left-1/4 flex items-start gap-1 pointer-events-none animate-bounce duration-1000">
                <svg className="w-4 h-4 text-indigo-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.86a.5.5 0 0 0-.85.35Z" />
                </svg>
                <span className="bg-indigo-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-sm">
                  Teacher
                </span>
              </div>

              {/* Simulated Student 1 Cursor */}
              <div className="absolute bottom-16 right-1/4 flex items-start gap-1 pointer-events-none">
                <svg className="w-4 h-4 text-emerald-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.86a.5.5 0 0 0-.85.35Z" />
                </svg>
                <span className="bg-emerald-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-sm">
                  Student 1
                </span>
              </div>

              {/* Simulated Floating Tool Dock */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur px-3 py-1.5 rounded-full shadow-md border border-slate-200 flex items-center gap-2 text-slate-600 text-xs pointer-events-none">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                <span className="font-semibold text-slate-700">Smooth Pen</span>
                <span className="text-slate-300">•</span>
                <span>4px</span>
                <span className="text-slate-300">•</span>
                <span>HD Sync</span>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-16 sm:py-20 bg-white border-y border-slate-200">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mb-3">
                How It Works
              </h2>
              <p className="text-sm text-slate-600">
                Get your collaborative classroom up and running in under three seconds.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Step 1 */}
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200/80 flex flex-col items-start text-left">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-bold text-base flex items-center justify-center mb-4 shadow-sm">
                  1
                </div>
                <h3 className="font-bold text-slate-900 text-base mb-2">Create a Class</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Click Create Class. SyncBoard automatically generates a unique 6-character Class Code (e.g. <span className="font-mono font-semibold text-indigo-600">K7P2XA</span>) with zero registration.
                </p>
              </div>

              {/* Step 2 */}
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200/80 flex flex-col items-start text-left">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-bold text-base flex items-center justify-center mb-4 shadow-sm">
                  2
                </div>
                <h3 className="font-bold text-slate-900 text-base mb-2">Share the Code</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Share your Class Code, instant invite URL, or display the on-screen QR Code for students to scan with their mobile devices.
                </p>
              </div>

              {/* Step 3 */}
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200/80 flex flex-col items-start text-left">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-bold text-base flex items-center justify-center mb-4 shadow-sm">
                  3
                </div>
                <h3 className="font-bold text-slate-900 text-base mb-2">Solve Together</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Write formulas, sketch diagrams, erase mistakes, and follow live teacher cursors simultaneously with low-latency WebSockets.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Grid Section */}
        <section id="features" className="py-16 sm:py-20 max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mb-3">
              Engineered for Modern Collaborative Learning
            </h2>
            <p className="text-sm text-slate-600">
              Everything teachers and students need for frictionless interactive sessions.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm mb-2">Real-Time Synchronization</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Powered by Socket.IO WebSockets. Every stroke, shape, text, and eraser operation renders immediately across all participants.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm mb-2">No Login Required</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Zero emails, zero passwords. Instant anonymous identities ("Teacher", "Student 1", etc.) with unique vibrant cursor colors.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm mb-2">Multiple Isolated Classes</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Dozens of independent rooms can operate simultaneously. Room A data never leaks or intersects with Room B.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm mb-2">Teacher Controls</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Teachers can lock student drawing when explaining critical concepts, clear the board, manage participants, or conclude the session.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
                <Smartphone className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm mb-2">Mobile & Stylus Ready</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Smooth finger drawing with touch-scroll prevention, Apple Pencil / S-Pen support, and two-finger pinch-to-zoom on tablets and phones.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
                <PenTool className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm mb-2">Export to PNG & PDF</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Export high-resolution PNG images or multi-page vector-aligned PDF documents to save whiteboard notes at any point in the lesson.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="py-16 bg-slate-100/70 border-t border-slate-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <h2 className="text-2xl font-bold text-center text-slate-900 mb-10">Frequently Asked Questions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-5 rounded-xl border border-slate-200">
                <h3 className="font-semibold text-slate-900 text-sm mb-1.5">Do students need to create an account?</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  No. Students simply enter the 6-character Class Code or click the direct invite link and begin drawing immediately.
                </p>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200">
                <h3 className="font-semibold text-slate-900 text-sm mb-1.5">Can multiple classes run at the same time?</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Yes. Each Class Code forms a completely independent, sandboxed WebSocket room with dedicated drawing state and cursor tracking.
                </p>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200">
                <h3 className="font-semibold text-slate-900 text-sm mb-1.5">What happens if my connection drops?</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  SyncBoard automatically attempts reconnection and re-fetches the latest authoritative board state from the server.
                </p>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200">
                <h3 className="font-semibold text-slate-900 text-sm mb-1.5">Can the teacher prevent students from drawing over notes?</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Yes. The teacher has a one-click "Lock Board" toggle to temporarily restrict drawing to host-only while lecturing.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-8 px-4 text-center">
        <div className="max-w-5xl mx-auto flex flex-col items-center justify-center gap-2">
          {/* Subtle creator signature */}
          <p className="text-xs text-slate-500 font-medium">
            Crafted by Prince Kumar Saran
          </p>
          <p className="text-[11px] text-slate-400">
            © 2026 SyncBoard. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Create Class Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 p-6">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Create New Classroom</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-medium"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Your Display Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Professor Smith / Teacher"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Session Title (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Calculus Chapter 4 Review"
                  value={classTitle}
                  onChange={(e) => setClassTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>

              <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs text-indigo-900 leading-relaxed">
                A unique 6-character code will be generated. You will enter as the room teacher with host controls.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating Room...' : 'Start Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join Class Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 p-6">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Join a Classroom</h3>
              <button
                type="button"
                onClick={() => {
                  setShowJoinModal(false);
                  setLocalError(null);
                }}
                className="text-slate-400 hover:text-slate-700 text-sm font-medium"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleJoinSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  6-Character Class Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  autoFocus
                  placeholder="e.g. K7P2XA"
                  value={joinCode}
                  onChange={(e) => {
                    setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
                    setLocalError(null);
                  }}
                  className="w-full px-3.5 py-3 rounded-xl border-2 border-indigo-200 text-center font-mono text-xl tracking-widest font-bold uppercase text-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Your Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Alex (defaults to Student 1)"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>

              {localError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-medium text-rose-800 animate-in fade-in">
                  {localError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowJoinModal(false);
                    setLocalError(null);
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || joinCode.length < 4}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? 'Connecting...' : 'Enter Classroom'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
