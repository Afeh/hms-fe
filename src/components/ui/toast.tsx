import * as React from "react";
import { CircleCheck, CircleAlert, Info, X } from "lucide-react";

import { cn } from "@/lib/utils";

type Tone = "success" | "error" | "info";

interface ToastItem {
  id: number;
  title: string;
  description?: string;
  tone: Tone;
  action?: { label: string; onClick: () => void };
}

interface ToastContextValue {
  push: (toast: Omit<ToastItem, "id">) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

const ICONS: Record<Tone, typeof Info> = {
  success: CircleCheck,
  error: CircleAlert,
  info: Info,
};
const TONES: Record<Tone, string> = {
  success: "text-success",
  error: "text-danger",
  info: "text-info",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);
  const counter = React.useRef(0);
  const timers = React.useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = React.useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = React.useCallback(
    (toast: Omit<ToastItem, "id">) => {
      counter.current += 1;
      const id = counter.current;
      setToasts((current) => [...current.slice(-3), { ...toast, id }]);
      // Errors persist until dismissed; successes fade after 4s (guide §9).
      if (toast.tone !== "error") {
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), 4000),
        );
      }
    },
    [dismiss],
  );

  React.useEffect(
    () => () => {
      for (const timer of timers.current.values()) clearTimeout(timer);
    },
    [],
  );

  const value = React.useMemo<ToastContextValue>(
    () => ({
      push,
      success: (title, description) => push({ title, description, tone: "success" }),
      error: (title, description) => push({ title, description, tone: "error" }),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-4 top-4 z-[60] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:top-6 sm:items-end"
      >
        {toasts.map((toast) => {
          const Icon = ICONS[toast.tone];
          return (
            <div
              key={toast.id}
              className="glass pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-md border px-4 py-3 shadow-3 motion-safe:animate-fade-up"
            >
              <Icon aria-hidden className={cn("mt-0.5 h-4 w-4 shrink-0", TONES[toast.tone])} />
              <div className="min-w-0 flex-1">
                <p className="text-small font-semibold text-ink">{toast.title}</p>
                {toast.description ? (
                  <p className="mt-0.5 text-small font-normal text-muted">{toast.description}</p>
                ) : null}
                {toast.action ? (
                  <button
                    type="button"
                    onClick={() => {
                      toast.action?.onClick();
                      dismiss(toast.id);
                    }}
                    className="mt-1.5 text-small font-semibold text-brand-700 hover:underline"
                  >
                    {toast.action.label}
                  </button>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss notification"
                className="rounded-sm p-0.5 text-faint hover:text-ink"
              >
                <X aria-hidden className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = React.useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
