import * as React from "react";
import { useParams } from "react-router-dom";
import {
  Camera,
  CheckCircle2,
  CircleAlert,
  ImagePlus,
  Images,
  Loader2,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";

import { BrandMark } from "@/components/domain/BrandMark";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CaptureLinkError, captureApi } from "@/lib/api/capture";
import { formatDate } from "@/lib/utils";
import type { CaptureSessionStatus } from "@/types/api";

const MAX_BYTES = 10 * 1024 * 1024;

interface QueueItem {
  id: number;
  file: File;
  preview: string;
  status: "uploading" | "done" | "error";
  error?: string;
}

/**
 * The page a phone opens from the QR code. It has no session auth: the token in
 * the URL authorises uploads to one visit only, until it expires or is closed.
 */
export default function CaptureLinkPage() {
  const { token = "" } = useParams();
  const [meta, setMeta] = React.useState<CaptureSessionStatus | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<QueueItem[]>([]);
  const [rejected, setRejected] = React.useState<string[]>([]);
  const [uploadedCount, setUploadedCount] = React.useState(0);
  const [finished, setFinished] = React.useState(false);
  const [finishing, setFinishing] = React.useState(false);

  const cameraRef = React.useRef<HTMLInputElement>(null);
  const pickerRef = React.useRef<HTMLInputElement>(null);
  const counter = React.useRef(0);
  const previews = React.useRef<string[]>([]);
  const queue = React.useRef<Promise<void>>(Promise.resolve());

  React.useEffect(() => {
    document.title = "Add visit photos · HMS";
  }, []);

  React.useEffect(() => {
    const urls = previews.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    captureApi
      .status(token)
      .then((status) => {
        if (cancelled) return;
        setMeta(status);
        setUploadedCount(status.uploads);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoadError(
          error instanceof CaptureLinkError ? error.message : "This photo link could not be opened.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const send = async (item: QueueItem) => {
    setItems((current) =>
      current.map((entry) =>
        entry.id === item.id ? { ...entry, status: "uploading", error: undefined } : entry,
      ),
    );
    try {
      await captureApi.upload(token, item.file);
      setItems((current) =>
        current.map((entry) => (entry.id === item.id ? { ...entry, status: "done" } : entry)),
      );
      setUploadedCount((count) => count + 1);
    } catch (error) {
      const message =
        error instanceof CaptureLinkError ? error.message : "That photo could not be uploaded.";
      setItems((current) =>
        current.map((entry) =>
          entry.id === item.id ? { ...entry, status: "error", error: message } : entry,
        ),
      );
      if (error instanceof CaptureLinkError && [404, 409, 410].includes(error.status)) {
        setLoadError(error.message);
      }
    }
  };

  const processBatch = (batch: QueueItem[]) => {
    queue.current = queue.current.then(async () => {
      for (const item of batch) {
        await send(item);
      }
    });
  };

  const addFiles = (files: FileList | null) => {
    if (cameraRef.current) cameraRef.current.value = "";
    if (pickerRef.current) pickerRef.current.value = "";
    if (!files || files.length === 0) return;

    const problems: string[] = [];
    const accepted: QueueItem[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) {
        problems.push(`${file.name}: choose an image file.`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        problems.push(`${file.name}: the image is larger than 10 MB.`);
        continue;
      }
      counter.current += 1;
      const preview = URL.createObjectURL(file);
      previews.current.push(preview);
      accepted.push({ id: counter.current, file, preview, status: "uploading" });
    }

    setRejected(problems);
    if (accepted.length === 0) return;
    setItems((current) => [...accepted, ...current]);
    processBatch(accepted);
  };

  const retry = (item: QueueItem) => {
    queue.current = queue.current.then(() => send(item));
  };

  const finish = async () => {
    setFinishing(true);
    setRejected([]);
    try {
      await captureApi.close(token);
      setFinished(true);
    } catch (error) {
      setRejected([
        error instanceof CaptureLinkError ? error.message : "The link could not be closed.",
      ]);
    } finally {
      setFinishing(false);
    }
  };

  if (loading) {
    return (
      <Shell>
        <div aria-busy="true" className="space-y-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
        </div>
      </Shell>
    );
  }

  if (loadError || !meta) {
    return (
      <Shell>
        <div className="rounded-xl border border-line bg-surface p-6 shadow-1">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-pill bg-warning-soft text-warning">
            <CircleAlert aria-hidden className="h-5 w-5" />
          </span>
          <h1 className="mt-4 text-h2 text-ink">This link cannot be used</h1>
          <p role="alert" className="mt-2 text-[0.9375rem] leading-relaxed text-muted">
            {loadError ?? "Ask staff at the desk to create a new photo link."}
          </p>
          <p className="mt-4 text-small text-faint">
            Links are short-lived for safety. A new one takes a moment to create.
          </p>
        </div>
      </Shell>
    );
  }

  if (finished) {
    return (
      <Shell>
        <div className="rounded-xl border border-line bg-surface p-6 shadow-1">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-pill bg-success-soft text-success">
            <CheckCircle2 aria-hidden className="h-5 w-5" />
          </span>
          <h1 className="mt-4 text-h2 text-ink">Photos sent</h1>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted">
            {uploadedCount === 0
              ? "The link is closed. No photos were added."
              : `${uploadedCount} photo${uploadedCount === 1 ? "" : "s"} added to ${meta.patient_name}'s visit.`}
          </p>
          <p className="mt-4 text-small text-faint">You can close this page.</p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mb-4">
        <p className="text-micro uppercase tracking-wide text-faint">Visit photos</p>
        <h1 className="mt-1 text-h1 text-ink">{meta.patient_name}</h1>
        <p className="mt-1 text-small text-muted">
          <span className="font-mono">{meta.patient_number}</span> · {formatDate(meta.visit_date)} ·{" "}
          <span className="capitalize">{meta.visit_type}</span> visit
        </p>
      </div>

      <div className="rounded-xl border border-line bg-surface p-4 shadow-1">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[0.9375rem] font-semibold text-ink">
              {uploadedCount} photo{uploadedCount === 1 ? "" : "s"} added
            </p>
            <p className="mt-0.5 text-small text-faint">
              Link expires {formatDate(meta.expires_at)}.
            </p>
          </div>
          <Images aria-hidden className="h-5 w-5 shrink-0 text-brand-700" />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button
            size="lg"
            className="h-16 flex-col gap-1 text-small"
            onClick={() => cameraRef.current?.click()}
            leadingIcon={<Camera className="h-5 w-5" />}
          >
            Take photo
          </Button>
          <Button
            size="lg"
            variant="secondary"
            className="h-16 flex-col gap-1 text-small"
            onClick={() => pickerRef.current?.click()}
            leadingIcon={<ImagePlus className="h-5 w-5" />}
          >
            Choose photos
          </Button>
        </div>

        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          aria-label="Take a photo"
          className="sr-only"
          onChange={(event) => addFiles(event.target.files)}
        />
        <input
          ref={pickerRef}
          type="file"
          accept="image/*"
          multiple
          aria-label="Choose photos"
          className="sr-only"
          onChange={(event) => addFiles(event.target.files)}
        />

        <p className="mt-3 text-small text-faint">
          Take as many photos as you need — each uploads straight away. JPEG, PNG, WebP or HEIC,
          up to 10 MB each.
        </p>
      </div>

      {rejected.length > 0 ? (
        <ul
          role="alert"
          className="mt-3 space-y-1 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-small text-danger"
        >
          {rejected.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      ) : null}

      {items.length > 0 ? (
        <ul aria-live="polite" className="mt-4 space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 rounded-lg border border-line bg-surface p-2.5"
            >
              <img
                src={item.preview}
                alt=""
                className="h-12 w-12 shrink-0 rounded-md border border-line object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-small font-medium text-ink">{item.file.name}</p>
                {item.status === "uploading" ? (
                  <p className="mt-0.5 flex items-center gap-1.5 text-small text-muted">
                    <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" /> Uploading…
                  </p>
                ) : item.status === "done" ? (
                  <p className="mt-0.5 flex items-center gap-1.5 text-small text-success">
                    <CheckCircle2 aria-hidden className="h-3.5 w-3.5" /> Added to the visit
                  </p>
                ) : (
                  <p className="mt-0.5 flex items-center gap-1.5 text-small text-danger">
                    <CircleAlert aria-hidden className="h-3.5 w-3.5" /> {item.error}
                  </p>
                )}
              </div>
              {item.status === "error" ? (
                <button
                  type="button"
                  onClick={() => retry(item)}
                  className="flex shrink-0 items-center gap-1 text-small font-semibold text-brand-700 hover:underline"
                >
                  <RefreshCw aria-hidden className="h-3.5 w-3.5" /> Retry
                </button>
              ) : null}
              {item.status === "done" ? (
                <span className="sr-only">Uploaded</span>
              ) : null}
              {item.status === "error" ? (
                <button
                  type="button"
                  aria-label={`Dismiss ${item.file.name}`}
                  onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))}
                  className="shrink-0 rounded-md p-1.5 text-faint hover:bg-surface-2 hover:text-ink"
                >
                  <X aria-hidden className="h-4 w-4" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-6 space-y-3">
        <Button
          variant="secondary"
          className="w-full"
          loading={finishing}
          onClick={() => void finish()}
        >
          Done — close this link
        </Button>
        <p className="flex items-center justify-center gap-1.5 text-small text-faint">
          <ShieldCheck aria-hidden className="h-3.5 w-3.5" />
          Photos go straight into the patient's visit record.
        </p>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-dvh bg-surface-2 px-4 py-6 sm:px-6">
      <div className="mx-auto w-full max-w-[520px]">
        <div className="mb-6 flex items-center gap-2.5">
          <BrandMark size="sm" />
          <span className="text-small font-semibold tracking-tight text-ink">HMS</span>
        </div>
        {children}
      </div>
    </main>
  );
}
