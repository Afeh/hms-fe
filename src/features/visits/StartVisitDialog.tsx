import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/dialog";
import { Field, FormError, Input, Select, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useCreateVisit, useTenantConfig } from "@/lib/api/queries";
import { messageOf } from "@/lib/api/client";
import { useSession } from "@/lib/auth/SessionProvider";
import { usePermission } from "@/lib/permissions/Can";
import { fullName, todayIso } from "@/lib/utils";

const schema = z.object({
  type: z.string().trim().min(1, "Choose or type a visit type"),
  visitDate: z.string().min(1, "Choose the visit date"),
  reason: z.string().trim().max(500, "Keep the reason under 500 characters").optional(),
});
type Values = z.infer<typeof schema>;

export function StartVisitDialog({
  patientId,
  open,
  onOpenChange,
}: {
  patientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { session } = useSession();
  const { has } = usePermission();
  const toast = useToast();
  const navigate = useNavigate();
  const createVisit = useCreateVisit(patientId);
  const [formError, setFormError] = React.useState<string | null>(null);

  const { data: config } = useTenantConfig(has("tenant:configure"));
  const visitTypes = React.useMemo(
    () =>
      (config?.data.config.visit_types ?? [])
        .filter((type) => type.active !== false && type.enabled !== false)
        .map((type) => ({
          value: type.key ?? type.label ?? "",
          label: type.label ?? type.key ?? "",
        }))
        .filter((type) => type.value),
    [config],
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: { type: "", visitDate: todayIso(), reason: "" },
  });

  React.useEffect(() => {
    if (open) {
      reset({ type: "", visitDate: todayIso(), reason: "" });
      setFormError(null);
    }
  }, [open, reset]);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const result = await createVisit.mutateAsync({
        type: values.type,
        visit_date: values.visitDate,
        reason_for_visit: values.reason || null,
        attending_clinician_id: session?.user._id ?? "",
      });
      toast.success("Visit opened", `Attending clinician: ${result.data.visit.attending_clinician.name}`);
      onOpenChange(false);
      navigate(`/visits/${result.data.visit._id}`);
    } catch (error) {
      setFormError(messageOf(error, "The visit could not be opened."));
    }
  });

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Start a visit"
      description="The visit opens immediately and can be closed when care is finished."
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="start-visit-form" loading={isSubmitting}>
            Open visit
          </Button>
        </>
      }
    >
      <form id="start-visit-form" onSubmit={onSubmit} noValidate className="space-y-4">
        <FormError message={formError} />
        <Field label="Visit type" htmlFor="visit-type" error={errors.type?.message} required>
          {visitTypes.length > 0 ? (
            <Select id="visit-type" aria-invalid={Boolean(errors.type)} {...register("type")}>
              <option value="">Choose a type…</option>
              {visitTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </Select>
          ) : (
            <Input
              id="visit-type"
              placeholder="e.g. outpatient"
              autoComplete="off"
              aria-invalid={Boolean(errors.type)}
              {...register("type")}
            />
          )}
        </Field>
        <Field label="Visit date" htmlFor="visit-date" error={errors.visitDate?.message} required>
          <Input
            id="visit-date"
            type="date"
            max={todayIso()}
            aria-invalid={Boolean(errors.visitDate)}
            {...register("visitDate")}
          />
        </Field>
        <Field
          label="Reason for visit"
          htmlFor="visit-reason"
          error={errors.reason?.message}
          hint="Max 500 characters"
        >
          <Textarea
            id="visit-reason"
            placeholder="Presenting complaint or reason for attendance"
            maxLength={500}
            {...register("reason")}
          />
        </Field>
        <div className="rounded-md bg-surface-2 px-3 py-2.5">
          <p className="text-micro text-faint">Attending clinician</p>
          <p className="mt-0.5 text-[0.9375rem] font-semibold text-ink">
            {session ? fullName(session.user.name) : "—"}
          </p>
        </div>
      </form>
    </Modal>
  );
}
