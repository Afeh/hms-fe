import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/dialog";
import { Field, FormError, Input, Textarea } from "@/components/ui/input";
import { ConflictDialog } from "@/components/domain/ConflictDialog";
import { useToast } from "@/components/ui/toast";
import { useUpdateVisit } from "@/lib/api/queries";
import { ApiError, messageOf } from "@/lib/api/client";
import { todayIso } from "@/lib/utils";
import type { Visit } from "@/types/api";

const schema = z.object({
  type: z.string().trim().min(1, "Enter a visit type"),
  visitDate: z.string().min(1, "Choose the visit date"),
  reason: z.string().trim().max(500, "Keep the reason under 500 characters").optional(),
});
type Values = z.infer<typeof schema>;

function draftKey(visitId: string): string {
  return `hms:visit-draft:${visitId}`;
}

export function EditVisitDialog({
  visit,
  etag,
  open,
  onOpenChange,
  onReloadRequested,
}: {
  visit: Visit;
  etag: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReloadRequested?: () => void;
}) {
  const toast = useToast();
  const updateVisit = useUpdateVisit(visit._id);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [conflict, setConflict] = React.useState(false);
  const [draft, setDraft] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: {
      type: visit.type,
      visitDate: visit.visit_date.slice(0, 10),
      reason: visit.reason_for_visit ?? "",
    },
  });

  React.useEffect(() => {
    if (!open) return;
    const saved = sessionStorage.getItem(draftKey(visit._id));
    reset({
      type: visit.type,
      visitDate: visit.visit_date.slice(0, 10),
      reason: visit.reason_for_visit ?? "",
    });
    setFormError(null);
    setConflict(false);
    setDraft(saved && saved !== (visit.reason_for_visit ?? "") ? saved : null);
  }, [open, visit, reset]);

  // Autosave the in-progress note locally so a refresh does not lose it (§8.6).
  const reason = watch("reason");
  React.useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      const value = reason ?? "";
      if (value === (visit.reason_for_visit ?? "")) {
        sessionStorage.removeItem(draftKey(visit._id));
      } else {
        sessionStorage.setItem(draftKey(visit._id), value);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [open, reason, visit._id, visit.reason_for_visit]);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await updateVisit.mutateAsync({
        body: {
          type: values.type,
          visit_date: values.visitDate,
          reason_for_visit: values.reason ?? "",
        },
        etag,
        version: visit.version,
      });
      sessionStorage.removeItem(draftKey(visit._id));
      toast.success("Visit updated");
      onOpenChange(false);
    } catch (error) {
      if (error instanceof ApiError && error.isConflict) {
        setConflict(true);
        return;
      }
      setFormError(messageOf(error, "The visit could not be saved."));
    }
  });

  return (
    <>
      <Modal
        open={open}
        onOpenChange={onOpenChange}
        title="Edit visit"
        description="Changes are version-checked. Closing the visit is a separate action."
        footer={
          <>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" form="edit-visit-form" loading={isSubmitting}>
              Save changes
            </Button>
          </>
        }
      >
        <form id="edit-visit-form" onSubmit={onSubmit} noValidate className="space-y-4">
          <FormError message={formError} />

          {draft !== null ? (
            <div className="flex flex-wrap items-center gap-2 rounded-md border border-info/30 bg-info-soft px-3 py-2 text-small text-info">
              <span className="flex-1">Unsaved notes were restored from this browser.</span>
              <button
                type="button"
                className="font-semibold underline"
                onClick={() => {
                  setValue("reason", draft, { shouldDirty: true });
                  setDraft(null);
                }}
              >
                Use them
              </button>
              <button
                type="button"
                className="font-semibold underline"
                onClick={() => {
                  sessionStorage.removeItem(draftKey(visit._id));
                  setDraft(null);
                }}
              >
                Discard
              </button>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Visit type" htmlFor="edit-type" error={errors.type?.message} required>
              <Input id="edit-type" autoComplete="off" {...register("type")} />
            </Field>
            <Field label="Visit date" htmlFor="edit-date" error={errors.visitDate?.message} required>
              <Input id="edit-date" type="date" max={todayIso()} {...register("visitDate")} />
            </Field>
          </div>

          <Field
            label={
              <span className="inline-flex items-center gap-2">
                Reason for visit
                {isDirty ? (
                  <span className="rounded-pill bg-warning-soft px-2 py-0.5 text-[0.6875rem] font-semibold text-warning">
                    Unsaved changes
                  </span>
                ) : null}
              </span>
            }
            htmlFor="edit-reason"
            error={errors.reason?.message}
            hint="Max 500 characters"
          >
            <Textarea id="edit-reason" maxLength={500} rows={5} {...register("reason")} />
          </Field>

          <p className="text-small text-faint">
            Notes are autosaved in this browser while you type and cleared when you save.
          </p>
        </form>
      </Modal>

      <ConflictDialog
        open={conflict}
        onOpenChange={setConflict}
        recordLabel="visit"
        onReview={() => setConflict(false)}
        onReload={() => {
          setConflict(false);
          onOpenChange(false);
          onReloadRequested?.();
        }}
      />
    </>
  );
}
