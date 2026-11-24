import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Link2, Loader2, QrCode, RefreshCw, Smartphone } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/dialog";
import { messageOf } from "@/lib/api/client";
import { CaptureLinkError, captureApi } from "@/lib/api/capture";
import { attachmentsApi } from "@/lib/api/endpoints";
import { formatDateTime } from "@/lib/utils";
import type { CaptureSession } from "@/types/api";

/**
 * Desktop handoff: mints a visit-scoped link, shows it as a QR code and polls
 * until the phone has uploaded. Closing the dialog leaves the link usable until
 * it expires; "Stop link" retires it immediately.
 */
export function PhoneCaptureDialog({
  visitId,
  open,
  onOpenChange,
}: {
  visitId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [session, setSession] = React.useState<CaptureSession | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [uploads, setUploads] = React.useState(0);
  const [closed, setClosed] = React.useState(false);
  const [stopping, setStopping] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const lastUploads = React.useRef(0);
  // StrictMode runs mount effects twice in development; mint only one link.
  const createdForOpen = React.useRef(false);

  const createLink = React.useCallback(async () => {
    setCreating(true);
    setError(null);
    setClosed(false);
    setSession(null);
    setUploads(0);
    setCopied(false);
    lastUploads.current = 0;
    try {
      const result = await attachmentsApi.createCaptureSession(visitId);
      setSession(result.data.session);
      setUploads(result.data.session.uploads);
      lastUploads.current = result.data.session.uploads;
    } catch (cause) {
      setError(messageOf(cause, "The photo link could not be created."));
    } finally {
      setCreating(false);
    }
  }, [visitId]);

  React.useEffect(() => {
    if (!open) {
      createdForOpen.current = false;
      return;
    }
    if (createdForOpen.current) return;
    createdForOpen.current = true;
    void createLink();
  }, [open, createLink]);

  React.useEffect(() => {
    if (!open || !session || closed) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const status = await captureApi.status(session.token);
        if (cancelled) return;
        setUploads(status.uploads);
        if (status.uploads > lastUploads.current) {
          lastUploads.current = status.uploads;
          void queryClient.invalidateQueries({ queryKey: ["attachments", visitId] });
        }
      } catch (cause) {
        if (cancelled) return;
        if (
          cause instanceof CaptureLinkError &&
          (cause.status === 404 || cause.status === 410)
        ) {
          setClosed(true);
        }
      }
    };
    void tick();
    const interval = window.setInterval(() => void tick(), 3000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [open, session, closed, queryClient, visitId]);

  // A phone cannot resolve `localhost`; deployments can set a public origin.
  const publicBase = (
    (import.meta.env.VITE_PUBLIC_APP_URL as string | undefined) ?? window.location.origin
  ).replace(/\/$/, "");
  const url = session ? `${publicBase}/capture/${session.token}` : "";

  const copyLink = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setError("The link could not be copied. Select and copy it instead.");
    }
  };

  const stopLink = async () => {
    if (!session) return;
    setStopping(true);
    setError(null);
    try {
      await attachmentsApi.revokeCaptureSession(visitId, session.id);
      setClosed(true);
      void queryClient.invalidateQueries({ queryKey: ["attachments", visitId] });
    } catch (cause) {
      setError(messageOf(cause, "The link could not be closed."));
    } finally {
      setStopping(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) void queryClient.invalidateQueries({ queryKey: ["attachments", visitId] });
        onOpenChange(next);
      }}
      title="Add photos from a phone"
      description="Scan the code with the phone camera. Photos upload straight to this visit."
      footer={
        <Button variant="secondary" onClick={() => onOpenChange(false)}>
          Close
        </Button>
      }
    >
      {creating ? (
        <div className="flex flex-col items-center gap-3 py-10 text-muted">
          <Loader2 aria-hidden className="h-6 w-6 animate-spin text-brand-700" />
          <p className="text-small">Creating a secure link…</p>
        </div>
      ) : closed ? (
        <div className="space-y-4 py-2 text-center">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-pill bg-surface-2 text-faint">
            <Link2 aria-hidden className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[0.9375rem] font-semibold text-ink">This link is closed</p>
            <p className="mt-1 text-small text-muted">
              It can no longer accept photos. Any images already sent are safe in the visit.
            </p>
          </div>
          <Button variant="secondary" onClick={() => void createLink()} leadingIcon={<RefreshCw className="h-4 w-4" />}>
            Create a new link
          </Button>
        </div>
      ) : session ? (
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-3 rounded-lg border border-line bg-white p-4">
            <QRCodeSVG
              value={url}
              size={196}
              level="M"
              marginSize={2}
              bgColor="#ffffff"
              fgColor="#0b1f1c"
              title="QR code for the visit photo link"
            />
            <p className="text-center text-small text-muted">
              Open the camera app and point it at this code.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-micro text-faint">Or open this link on the phone</p>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-md border border-line bg-surface-2 px-3 py-2 text-small text-ink">
                {url}
              </code>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void copyLink()}
                leadingIcon={copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              >
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>

          <div className="rounded-md bg-surface-2 px-3.5 py-3">
            <p className="flex items-center gap-2 text-small font-medium text-ink">
              <Smartphone aria-hidden className="h-4 w-4 text-brand-700" />
              {uploads === 0
                ? "Waiting for the first photo…"
                : `${uploads} photo${uploads === 1 ? "" : "s"} received`}
            </p>
            <p className="mt-1 text-small text-faint">
              Link expires {formatDateTime(session.expires_at)}. New photos refresh this visit
              automatically.
            </p>
          </div>

          {error ? (
            <p role="alert" className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-small text-danger">
              {error}
            </p>
          ) : null}

          <button
            type="button"
            onClick={() => void stopLink()}
            disabled={stopping}
            className="text-small font-semibold text-danger hover:underline disabled:opacity-60"
          >
            {stopping ? "Closing…" : "Stop accepting photos"}
          </button>
        </div>
      ) : (
        <div className="space-y-3 py-2">
          <p role="alert" className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-small text-danger">
            {error ?? "The photo link could not be created."}
          </p>
          <Button variant="secondary" onClick={() => void createLink()} leadingIcon={<QrCode className="h-4 w-4" />}>
            Try again
          </Button>
        </div>
      )}
    </Modal>
  );
}
