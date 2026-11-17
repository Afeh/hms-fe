import * as React from "react";
import { Eye } from "lucide-react";

import { Button } from "@/components/ui/button";

const HIDE_AFTER_MS = 3 * 60_000;

/**
 * Blurs patient-identifying content after inactivity and requires a deliberate
 * click to reveal it again (guide §12).
 */
export function PrivacyShield({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout>>();

  const arm = React.useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setHidden(true), HIDE_AFTER_MS);
  }, []);

  React.useEffect(() => {
    if (hidden) return;
    arm();
    const events: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "scroll", "touchstart"];
    const handler = () => arm();
    for (const event of events) window.addEventListener(event, handler, { passive: true });
    return () => {
      clearTimeout(timer.current);
      for (const event of events) window.removeEventListener(event, handler);
    };
  }, [arm, hidden]);

  return (
    <div className="relative">
      <div aria-hidden={hidden} className={hidden ? "pointer-events-none select-none blur-md" : undefined}>
        {children}
      </div>
      {hidden ? (
        <div className="absolute inset-0 z-10 flex min-h-[240px] items-center justify-center p-6">
          <div className="glass rounded-lg border px-6 py-5 text-center shadow-3">
            <p className="text-h3 text-ink">Hidden for privacy</p>
            <p className="mt-1 text-small font-normal text-muted">
              Patient details are masked while this screen is idle.
            </p>
            <Button
              className="mt-4"
              variant="secondary"
              onClick={() => {
                setHidden(false);
                arm();
              }}
              leadingIcon={<Eye className="h-4 w-4" />}
            >
              Reveal details
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
