import { useRef, useState } from 'react';
import { GripHorizontal, Minus, Maximize2, X, ShieldCheck, Play, Square, Zap, Layers } from 'lucide-react';
import type { ModuleConfigState, ModuleId } from '../types/panel';
import { MODULE_DEFINITIONS, MODULE_ORDER } from '../data/moduleDefinitions';

interface FloatingPanelOverlayProps {
  open: boolean;
  consentGranted: boolean;
  showConsentModal: boolean;
  moduleStates: Record<ModuleId, ModuleConfigState>;
  sessionConnected: boolean;
  onGrantConsent: () => void;
  onDeclineConsent: () => void;
  onClose: () => void;
  onToggleStartStop: (id: ModuleId) => void;
  onPulseModule: (id: ModuleId) => void;
  onRunAllSuite: () => void;
}

export function FloatingPanelOverlay({
  open,
  consentGranted,
  showConsentModal,
  moduleStates,
  sessionConnected,
  onGrantConsent,
  onDeclineConsent,
  onClose,
  onToggleStartStop,
  onPulseModule,
  onRunAllSuite,
}: FloatingPanelOverlayProps) {
  const [position, setPosition] = useState({ x: 36, y: 84 });
  const [size, setSize] = useState({ width: 344, height: 420 });
  const [minimized, setMinimized] = useState(false);

  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; origW: number; origH: number } | null>(null);

  const handleDragPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: position.x,
      origY: position.y,
    };
  };

  const handleDragPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const maxX = Math.max(16, window.innerWidth - 180);
    const maxY = Math.max(16, window.innerHeight - 80);
    setPosition({
      x: Math.min(maxX, Math.max(8, dragRef.current.origX + dx)),
      y: Math.min(maxY, Math.max(8, dragRef.current.origY + dy)),
    });
  };

  const handleDragPointerUp = () => {
    dragRef.current = null;
  };

  const handleResizePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origW: size.width,
      origH: size.height,
    };
  };

  const handleResizePointerMove = (e: React.PointerEvent) => {
    if (!resizeRef.current) return;
    const dx = e.clientX - resizeRef.current.startX;
    const dy = e.clientY - resizeRef.current.startY;
    setSize({
      width: Math.min(520, Math.max(280, resizeRef.current.origW + dx)),
      height: Math.min(620, Math.max(280, resizeRef.current.origH + dy)),
    });
  };

  const handleResizePointerUp = () => {
    resizeRef.current = null;
  };

  // Explicit Android Overlay Permission Consent Modal before activating Floating Panel
  if (showConsentModal && !consentGranted) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="overlay-consent-title"
      >
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0B0E17] p-6 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-purple-500/30 bg-purple-500/10 text-purple-300">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h2 id="overlay-consent-title" className="text-base font-semibold text-white">
                Android Overlay Permission Consent
              </h2>
              <p className="text-xs text-slate-400">SYSTEM_ALERT_WINDOW · TYPE_APPLICATION_OVERLAY</p>
            </div>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-slate-300">
            GOLD FIRE — ADVANCED TEST PANEL requests optional floating overlay permission solely to display a movable, resizable QA control panel while testing your own Gold Fire build.
          </p>
          <p className="mt-2.5 text-xs leading-relaxed text-slate-400">
            This overlay operates exclusively through authorized Gold Fire QA test APIs and does not access private memory or inject code into other applications.
          </p>

          <div className="mt-6 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onDeclineConsent}
              className="min-h-[42px] rounded-xl border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 cursor-pointer"
            >
              Decline
            </button>
            <button
              type="button"
              onClick={onGrantConsent}
              className="min-h-[42px] rounded-xl bg-gradient-to-r from-sky-500 to-purple-600 px-4 py-2 text-xs font-semibold text-white hover:opacity-95 cursor-pointer"
            >
              Grant &amp; Launch Floating Panel
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!open || !consentGranted) return null;

  return (
    <div
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        width: minimized ? 248 : size.width,
        height: minimized ? 'auto' : size.height,
      }}
      className="fixed left-0 top-0 z-50 flex flex-col overflow-hidden rounded-2xl border border-sky-500/35 bg-[#070910]/90 shadow-2xl shadow-black/80 backdrop-blur-2xl"
    >
      {/* Draggable Header Bar */}
      <div
        onPointerDown={handleDragPointerDown}
        onPointerMove={handleDragPointerMove}
        onPointerUp={handleDragPointerUp}
        className="flex cursor-grab select-none items-center justify-between gap-2 border-b border-slate-800/90 bg-[#0B0F1A]/95 px-3.5 py-2.5 active:cursor-grabbing"
      >
        <div className="flex min-w-0 items-center gap-2">
          <GripHorizontal className="h-4 w-4 shrink-0 text-sky-400" />
          <span className="truncate font-display text-xs font-semibold tracking-wide text-white">
            Gold Fire Floating QA
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={minimized ? 'Expand floating panel' : 'Minimize floating panel'}
            onClick={(e) => {
              e.stopPropagation();
              setMinimized((v) => !v);
            }}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
          >
            {minimized ? <Maximize2 className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            aria-label="Close floating panel"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-500/20 hover:text-rose-300 cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Expandable Floating Controls Body */}
      {!minimized && (
        <div className="flex flex-1 flex-col overflow-hidden p-3.5">
          <div className="mb-3 flex items-center justify-between text-[11px] text-slate-400">
            <span>Mode: {sessionConnected ? 'Authenticated API' : 'Local QA Sandbox'}</span>
            <button
              type="button"
              onClick={onRunAllSuite}
              className="font-semibold text-sky-400 hover:text-sky-300 cursor-pointer"
            >
              Run All 6 Tests
            </button>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto pr-1">
            {MODULE_ORDER.map((id) => {
              const def = MODULE_DEFINITIONS[id];
              const st = moduleStates[id];
              const last = st.results[0];

              return (
                <div
                  key={id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-slate-800/80 bg-[#0D111C]/80 px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="truncate text-xs font-semibold text-slate-100">
                      {def.title}
                    </div>
                    <div className="mt-0.5 truncate font-mono text-[10px] tabular-nums text-slate-400">
                      {last ? (
                        <span className={last.verdict === 'DETECTED' ? 'text-emerald-400' : 'text-amber-400'}>
                          {last.verdict} · {last.rule_id}
                        </span>
                      ) : (
                        'Ready'
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      disabled={!st.enabled}
                      onClick={() => onPulseModule(id)}
                      title={`Send single ${def.shortTitle} pulse`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-sky-400 hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                    >
                      <Zap className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={!st.enabled}
                      onClick={() => onToggleStartStop(id)}
                      className={`inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[11px] font-semibold transition-colors disabled:opacity-40 cursor-pointer ${
                        st.running
                          ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30'
                          : 'bg-sky-500/20 text-sky-300 hover:bg-sky-500/30'
                      }`}
                    >
                      {st.running ? (
                        <>
                          <Square className="h-3 w-3" />
                          Stop
                        </>
                      ) : (
                        <>
                          <Play className="h-3 w-3" />
                          Start
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Bar + Drag-to-Resize Handle */}
          <div className="mt-3 flex items-center justify-between border-t border-slate-800/80 pt-2 text-[10px] text-slate-500">
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-purple-400" />
              Drag bar to move · Corner to resize
            </span>
            <div
              onPointerDown={handleResizePointerDown}
              onPointerMove={handleResizePointerMove}
              onPointerUp={handleResizePointerUp}
              title="Drag to resize floating panel"
              className="flex h-5 w-5 cursor-nwse-resize items-end justify-end p-0.5 text-slate-500 hover:text-sky-400"
            >
              <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 10L10 2M6 10L10 6" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
