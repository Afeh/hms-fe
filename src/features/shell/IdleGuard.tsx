import * as React from "react";

import { Modal } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const IDLE_LIMIT_MS = 30 * 60_000; // matches the backend's default idle timeout
const WARNING_MS = 60_000;

/**
 * Signs the user out after a period of inactivity, with a 60-second warning
 * dialog (guide §12). Any interaction resets the clock.
 */
export function IdleGuard({ onTimeout }: { onTimeout: () => void }) {
  const [warning, setWarning] = React.useState(false);
  const [secondsLeft, setSecondsLeft] = React.useState(60);
  const warningTimer = React.useRef<ReturnType<typeof setTimeout>>();
  const idleTimer = React.useRef<ReturnType<typeof setTimeout>>();

  const arm = React.useCallback(() => {
    clearTimeout(warningTimer.current);
    clearTimeout(idleTimer.current);
    setWarning(false);
    warningTimer.current = setTimeout(() => {
      setSecondsLeft(60);
      setWarning(true);
    }, IDLE_LIMIT_MS - WARNING_MS);
    idleTimer.current = setTimeout(onTimeout, IDLE_LIMIT_MS);
  }, [onTimeout]);

  React.useEffect(() => {
    arm();
    const events: Array<keyof WindowEventMap> = ["pointerdown", "keydown"];
    const handler = () => {
      if (!warning) arm();
    };
    for (const event of events) window.addEventListener(event, handler, { passive: true });
    return () => {
      clearTimeout(warningTimer.current);
      clearTimeout(idleTimer.current);
      for (const event of events) window.removeEventListener(event, handler);
    };
  }, [arm, warning]);

  React.useEffect(() => {
    if (!warning) return;
    const interval = setInterval(() => {
      setSecondsLeft((value) => Math.max(value - 1, 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [warning]);

  return (
    <Modal
      open={warning}
      onOpenChange={() => {
        /* Dismissal is only possible by staying signed in or signing out. */
      }}
      title="Still there?"
      description="For patient privacy we sign you out after a period of inactivity."
      footer={
        <>
          <Button variant="secondary" onClick={onTimeout}>
            Sign out now
          </Button>
          <Button
            onClick={() => {
              setWarning(false);
              arm();
            }}
          >
            Stay signed in
          </Button>
        </>
      }
    >
      <p className="text-[0.9375rem] text-muted" aria-live="polite">
        You will be signed out in{" "}
        <span className="font-mono font-semibold text-ink tabular">{secondsLeft}s</span>.
      </p>
    </Modal>
  );
}
