import { AlertTriangle } from "lucide-react";

import { Modal } from "@/components/ui/dialog";

/**
 * The single, deliberate 412 experience (guide §8.7). A version conflict is
 * never a silent failure and never auto-retried: the user chooses what happens.
 */
export function ConflictDialog({
  open,
  onOpenChange,
  onReload,
  onReview,
  loading,
  recordLabel = "record",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReload: () => void;
  onReview: () => void;
  loading?: boolean;
  recordLabel?: string;
}) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="This record was updated by someone else"
      description={`Another person saved changes to this ${recordLabel} after you opened it.`}
      footer={
        <>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex h-11 items-center justify-center rounded-md px-3 font-semibold text-muted hover:bg-surface-2 hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onReview}
            className="inline-flex h-11 items-center justify-center rounded-md border border-line bg-surface px-4 font-semibold text-ink hover:bg-surface-2"
          >
            Review my changes
          </button>
          <button
            type="button"
            onClick={onReload}
            disabled={loading}
            className="inline-flex h-11 items-center justify-center rounded-md bg-brand-700 px-4 font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
          >
            {loading ? "Reloading…" : "Reload latest"}
          </button>
        </>
      }
    >
      <div className="flex items-start gap-3 rounded-md border border-warning/30 bg-warning-soft px-3.5 py-3">
        <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <div className="text-small text-warning">
          <p className="font-semibold">Your edits were not saved.</p>
          <p className="mt-0.5 font-normal">
            Reloading shows the latest saved version. Reviewing keeps your unsaved values on screen
            so nothing is lost — you can copy them before reloading.
          </p>
        </div>
      </div>
    </Modal>
  );
}
