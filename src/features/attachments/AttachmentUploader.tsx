import * as React from "react";
import {
  Camera,
  CircleCheck,
  CircleX,
  ImagePlus,
  RefreshCw,
  Smartphone,
  UploadCloud,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn, formatBytes } from "@/lib/utils";
import { useUploadAttachment } from "@/lib/api/queries";
import { messageOf } from "@/lib/api/client";
import { PhoneCaptureDialog } from "./PhoneCaptureDialog";

const MAX_BYTES = 10 * 1024 * 1024;

interface UploadItem {
  id: number;
  file: File;
  status: "uploading" | "done" | "error";
  error?: string;
}

export function AttachmentUploader({
  visitId,
  canUpload,
  disabledReason,
}: {
  visitId: string;
  canUpload: boolean;
  disabledReason?: string;
}) {
  const upload = useUploadAttachment(visitId);
  const [dragging, setDragging] = React.useState(false);
  const [items, setItems] = React.useState<UploadItem[]>([]);
  const [rejected, setRejected] = React.useState<string[]>([]);
  const [phoneOpen, setPhoneOpen] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const cameraRef = React.useRef<HTMLInputElement>(null);
  const counter = React.useRef(0);

  const send = React.useCallback(
    async (item: UploadItem) => {
      setItems((current) =>
        current.map((entry) => (entry.id === item.id ? { ...entry, status: "uploading", error: undefined } : entry)),
      );
      try {
        await upload.mutateAsync({ file: item.file });
        setItems((current) =>
          current.map((entry) => (entry.id === item.id ? { ...entry, status: "done" } : entry)),
        );
      } catch (error) {
        setItems((current) =>
          current.map((entry) =>
            entry.id === item.id
              ? { ...entry, status: "error", error: messageOf(error, "Upload failed.") }
              : entry,
          ),
        );
      }
    },
    [upload],
  );

  const addFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const problems: string[] = [];
    const accepted: UploadItem[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) {
        problems.push(`${file.name}: only images can be attached.`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        problems.push(`${file.name}: ${formatBytes(file.size)} exceeds the 10 MB limit.`);
        continue;
      }
      counter.current += 1;
      accepted.push({ id: counter.current, file, status: "uploading" });
    }
    setRejected(problems);
    setItems((current) => [...accepted, ...current].slice(0, 12));
    for (const item of accepted) void send(item);
    if (inputRef.current) inputRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(event) => {
          if (!canUpload) return;
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          if (!canUpload) return;
          event.preventDefault();
          setDragging(false);
          addFiles(event.dataTransfer.files);
        }}
        className={cn(
          "rounded-md border-2 border-dashed px-4 py-6 text-center transition-colors",
          dragging ? "border-brand-500 bg-brand-50/60 dark:bg-surface-2" : "border-brand-300/70 bg-surface-2/60",
        )}
      >
        <UploadCloud aria-hidden className="mx-auto h-6 w-6 text-brand-700" strokeWidth={1.75} />
        <p className="mt-2 text-[0.9375rem] font-semibold text-ink">Drop images here</p>
        <p className="mt-0.5 text-small font-normal text-muted">
          PNG, JPEG or WebP · up to 10 MB each
        </p>
        {canUpload ? (
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()} leadingIcon={<ImagePlus className="h-3.5 w-3.5" />}>
              Browse files
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => cameraRef.current?.click()}
              leadingIcon={<Camera className="h-3.5 w-3.5" />}
              className="hidden [@media(pointer:coarse)]:inline-flex"
            >
              Take photo
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPhoneOpen(true)}
              leadingIcon={<Smartphone className="h-3.5 w-3.5" />}
              className="hidden [@media(pointer:fine)]:inline-flex"
            >
              Use phone camera
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(event) => addFiles(event.target.files)}
            />
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(event) => addFiles(event.target.files)}
            />
          </div>
        ) : (
          <p className="mt-2 text-small text-faint">
            {disabledReason ?? "You do not have permission to upload images."}
          </p>
        )}
      </div>

      {rejected.length > 0 ? (
        <ul role="alert" className="space-y-1 rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-small text-danger">
          {rejected.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      ) : null}

      <PhoneCaptureDialog visitId={visitId} open={phoneOpen} onOpenChange={setPhoneOpen} />

      {items.length > 0 ? (
        <ul className="space-y-1.5" aria-live="polite">
          {items.map((item) => (
            <li key={item.id} className="rounded-md border border-line px-3 py-2">
              <div className="flex items-center gap-2">
                {item.status === "done" ? (
                  <CircleCheck aria-hidden className="h-4 w-4 shrink-0 text-success" />
                ) : item.status === "error" ? (
                  <CircleX aria-hidden className="h-4 w-4 shrink-0 text-danger" />
                ) : (
                  <RefreshCw aria-hidden className="h-4 w-4 shrink-0 animate-spin text-brand-700" />
                )}
                <span className="min-w-0 flex-1 truncate text-small text-ink">{item.file.name}</span>
                <span className="text-small text-faint">{formatBytes(item.file.size)}</span>
                {item.status === "error" ? (
                  <button
                    type="button"
                    onClick={() => void send(item)}
                    className="text-small font-semibold text-brand-700 hover:underline"
                  >
                    Retry
                  </button>
                ) : null}
              </div>
              {item.status === "uploading" ? (
                <div className="mt-1.5 h-1 overflow-hidden rounded-pill bg-surface-2" role="progressbar" aria-label={`Uploading ${item.file.name}`}>
                  <div className="h-full w-1/3 animate-[upload-slide_1.1s_ease-in-out_infinite] rounded-pill bg-brand-500" />
                </div>
              ) : null}
              {item.status === "error" && item.error ? (
                <p className="mt-1 text-small text-danger">{item.error}</p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
