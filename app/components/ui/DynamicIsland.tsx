import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: number;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ConfirmDialog {
  id: number;
  message: string;
  resolve: (value: boolean) => void;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  showConfirm: (message: string) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
  showConfirm: () => Promise.resolve(false),
});

let toastId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirms, setConfirms] = useState<ConfirmDialog[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration = 3000) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, type, message, duration }]);
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const showConfirm = useCallback((message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const id = ++toastId;
      setConfirms((prev) => [...prev, { id, message, resolve }]);
    });
  }, []);

  const handleConfirmResponse = useCallback((id: number, result: boolean) => {
    setConfirms((prev) => {
      const dialog = prev.find((c) => c.id === id);
      if (dialog) dialog.resolve(result);
      return prev.filter((c) => c.id !== id);
    });
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, showConfirm }}>
      {children}
      <ToastContainer toasts={toasts} confirms={confirms} onConfirmResponse={handleConfirmResponse} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

/* ─── Container ─── */
function ToastContainer({
  toasts,
  confirms,
  onConfirmResponse,
}: {
  toasts: Toast[];
  confirms: ConfirmDialog[];
  onConfirmResponse: (id: number, result: boolean) => void;
}) {
  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none flex flex-col items-center">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
      {confirms.map((dialog) => (
        <ConfirmItem key={dialog.id} dialog={dialog} onResponse={onConfirmResponse} />
      ))}
    </div>
  );
}

/* ─── Toast Item ─── */
function ToastItem({ toast }: { toast: Toast }) {
  const [phase, setPhase] = useState<'enter' | 'visible' | 'exit'>('enter');
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    // Enter -> Visible
    const t1 = setTimeout(() => setPhase('visible'), 10);
    // Start exit before duration ends
    if (toast.duration && toast.duration > 0) {
      timerRef.current = setTimeout(() => setPhase('exit'), toast.duration - 400);
    }
    return () => {
      clearTimeout(t1);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast.duration]);

  const icon = {
    success: (
      <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    ),
    error: (
      <svg className="w-4 h-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    warning: (
      <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    info: (
      <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  }[toast.type];

  const bgClass = {
    success: 'bg-slate-900/95 dark:bg-slate-800/95',
    error: 'bg-slate-900/95 dark:bg-slate-800/95',
    warning: 'bg-slate-900/95 dark:bg-slate-800/95',
    info: 'bg-slate-900/95 dark:bg-slate-800/95',
  }[toast.type];

  return (
    <div
      className={`
        mt-2 pointer-events-auto
        transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
        ${phase === 'enter' ? 'opacity-0 -translate-y-4 scale-75 max-w-[120px]' : ''}
        ${phase === 'visible' ? 'opacity-100 translate-y-0 scale-100 max-w-[320px]' : ''}
        ${phase === 'exit' ? 'opacity-0 -translate-y-4 scale-75 max-w-[120px]' : ''}
      `}
    >
      <div className={`${bgClass} backdrop-blur-xl rounded-full px-4 py-2.5 shadow-2xl shadow-black/30 border border-white/10 flex items-center gap-2.5`}>
        <div className="shrink-0">{icon}</div>
        <p className="text-[13px] font-medium text-white/95 leading-tight whitespace-nowrap overflow-hidden text-ellipsis">
          {toast.message}
        </p>
      </div>
    </div>
  );
}

/* ─── Confirm Item ─── */
function ConfirmItem({
  dialog,
  onResponse,
}: {
  dialog: ConfirmDialog;
  onResponse: (id: number, result: boolean) => void;
}) {
  const [phase, setPhase] = useState<'enter' | 'visible' | 'exit'>('enter');
  const [answer, setAnswer] = useState<boolean | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setPhase('visible'), 10);
    return () => clearTimeout(t);
  }, []);

  const handleResponse = (result: boolean) => {
    setAnswer(result);
    setPhase('exit');
    setTimeout(() => onResponse(dialog.id, result), 400);
  };

  return (
    <div className="mt-2 pointer-events-auto w-full flex justify-center px-4">
      <div
        className={`
          transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
          ${phase === 'enter' ? 'opacity-0 -translate-y-4 scale-90' : ''}
          ${phase === 'visible' ? 'opacity-100 translate-y-0 scale-100' : ''}
          ${phase === 'exit' ? 'opacity-0 -translate-y-4 scale-90' : ''}
        `}
      >
        <div className="bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-3xl px-5 py-4 shadow-2xl shadow-black/30 border border-white/10 max-w-[340px] w-full">
          <div className="flex items-start gap-3 mb-4">
            <div className="shrink-0 w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center mt-0.5">
              <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="text-[14px] font-medium text-white/95 leading-snug">{dialog.message}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleResponse(false)}
              className="py-2.5 rounded-xl bg-white/10 hover:bg-white/15 active:scale-[0.97] text-[13px] font-bold text-white/80 transition-all"
            >
              Batal
            </button>
            <button
              onClick={() => handleResponse(true)}
              className="py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 active:scale-[0.97] text-[13px] font-bold text-white transition-all"
            >
              Ya, Lanjutkan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
