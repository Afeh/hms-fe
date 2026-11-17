import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, ImageOff, X } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/button";
import { cn, formatDateTime, isHttpUrl } from "@/lib/utils";
import type { Attachment } from "@/types/api";

export function AttachmentGallery({
  attachments,
  onRefreshUrl,
}: {
  attachments: Attachment[];
  onRefreshUrl: (attachment: Attachment) => Promise<string | null>;
}) {
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);

  if (attachments.length === 0) {
    return (
      <EmptyState
        icon={ImageOff}
        title="No images attached"
        help="Images added to this visit appear here as thumbnails."
      />
    );
  }

  return (
    <>
      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {attachments.map((attachment, index) => (
          <li key={attachment._id}>
            <button
              type="button"
              onClick={() => setOpenIndex(index)}
              className="group relative block aspect-square w-full overflow-hidden rounded-md border border-line bg-surface-2 focus-visible:outline-none"
              aria-label={`Open image ${index + 1} of ${attachments.length}`}
            >
              <Thumbnail attachment={attachment} onRefreshUrl={onRefreshUrl} alt={`Visit image ${index + 1}`} />
              <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/45 to-transparent px-2 pb-1.5 pt-6 text-left text-[0.6875rem] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                {formatDateTime(attachment.uploaded_at ?? attachment.created_at)}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <Lightbox
        attachments={attachments}
        index={openIndex}
        onIndexChange={setOpenIndex}
        onRefreshUrl={onRefreshUrl}
      />
    </>
  );
}

function Thumbnail({
  attachment,
  onRefreshUrl,
  alt,
  className,
}: {
  attachment: Attachment;
  onRefreshUrl: (attachment: Attachment) => Promise<string | null>;
  alt: string;
  className?: string;
}) {
  const [src, setSrc] = React.useState<string | null>(
    isHttpUrl(attachment.download_url) ? attachment.download_url : null,
  );
  const [loaded, setLoaded] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const refreshed = React.useRef(false);

  React.useEffect(() => {
    setSrc(isHttpUrl(attachment.download_url) ? attachment.download_url : null);
    setLoaded(false);
    setFailed(false);
    refreshed.current = false;
  }, [attachment._id, attachment.download_url]);

  if (!src || failed) {
    return (
      <span className={cn("flex h-full w-full flex-col items-center justify-center gap-1 p-2 text-center", className)}>
        <ImageOff aria-hidden className="h-5 w-5 text-faint" />
        <span className="text-[0.6875rem] font-medium text-faint">
          {failed ? "Image unavailable" : "No preview"}
        </span>
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onLoad={() => setLoaded(true)}
      onError={async () => {
        // Presigned URLs expire: silently fetch a fresh one once (guide §8.8).
        if (refreshed.current) {
          setFailed(true);
          return;
        }
        refreshed.current = true;
        const fresh = await onRefreshUrl(attachment);
        if (fresh) setSrc(fresh);
        else setFailed(true);
      }}
      className={cn(
        "h-full w-full object-cover transition-[filter,opacity] duration-300",
        loaded ? "opacity-100 blur-0" : "opacity-70 blur-sm",
        className,
      )}
    />
  );
}

function Lightbox({
  attachments,
  index,
  onIndexChange,
  onRefreshUrl,
}: {
  attachments: Attachment[];
  index: number | null;
  onIndexChange: (index: number | null) => void;
  onRefreshUrl: (attachment: Attachment) => Promise<string | null>;
}) {
  const current = index !== null ? attachments[index] : undefined;
  const [src, setSrc] = React.useState<string | null>(null);
  const refreshed = React.useRef(false);

  React.useEffect(() => {
    refreshed.current = false;
    setSrc(current && isHttpUrl(current.download_url) ? current.download_url : null);
  }, [current]);

  if (index === null || !current) return null;

  const go = (delta: number) => {
    const next = index + delta;
    if (next >= 0 && next < attachments.length) onIndexChange(next);
  };

  return (
    <DialogPrimitive.Root open onOpenChange={(open) => !open && onIndexChange(null)}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[rgba(7,16,19,.88)] backdrop-blur-sm" />
        <DialogPrimitive.Content
          className="fixed inset-0 z-50 flex flex-col p-3 focus:outline-none sm:p-6"
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") {
              event.preventDefault();
              go(1);
            } else if (event.key === "ArrowLeft") {
              event.preventDefault();
              go(-1);
            }
          }}
        >
          <DialogPrimitive.Title className="sr-only">Visit image viewer</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Image {index + 1} of {attachments.length}. Use the left and right arrow keys to move, Escape to close.
          </DialogPrimitive.Description>

          <div className="flex items-center justify-between gap-3 text-white">
            <p className="font-mono text-small tabular">
              {index + 1} / {attachments.length}
            </p>
            <DialogPrimitive.Close asChild>
              <IconButton label="Close viewer" className="h-11 w-11 text-white hover:bg-white/10 hover:text-white">
                <X aria-hidden className="h-5 w-5" />
              </IconButton>
            </DialogPrimitive.Close>
          </div>

          <div className="flex min-h-0 flex-1 items-center justify-center gap-2 sm:gap-4">
            <IconButton
              label="Previous image"
              onClick={() => go(-1)}
              disabled={index === 0}
              className="h-11 w-11 shrink-0 text-white hover:bg-white/10 hover:text-white disabled:opacity-30"
            >
              <ChevronLeft aria-hidden className="h-6 w-6" />
            </IconButton>

            {src ? (
              <img
                src={src}
                alt={`Visit image ${index + 1}`}
                onError={async () => {
                  if (refreshed.current) {
                    setSrc(null);
                    return;
                  }
                  refreshed.current = true;
                  const fresh = await onRefreshUrl(current);
                  setSrc(fresh);
                }}
                className="max-h-full min-h-0 max-w-full rounded-md object-contain shadow-3"
                style={{ touchAction: "pinch-zoom" }}
              />
            ) : (
              <div className="flex flex-col items-center gap-2 rounded-md bg-white/5 px-6 py-10 text-white/80">
                <ImageOff aria-hidden className="h-6 w-6" />
                <p className="text-small">This image could not be loaded.</p>
              </div>
            )}

            <IconButton
              label="Next image"
              onClick={() => go(1)}
              disabled={index === attachments.length - 1}
              className="h-11 w-11 shrink-0 text-white hover:bg-white/10 hover:text-white disabled:opacity-30"
            >
              <ChevronRight aria-hidden className="h-6 w-6" />
            </IconButton>
          </div>

          <p className="pb-1 text-center text-small text-white/60">
            {formatDateTime(current.uploaded_at ?? current.created_at)}
          </p>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
