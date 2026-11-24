import * as React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Camera, Plus, Trash2, Webcam } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/dialog";
import { Checkbox, Field, FormError, Input, Select } from "@/components/ui/input";
import { ConflictDialog } from "@/components/domain/ConflictDialog";
import {
  useCreatePatient,
  useDeletePatientPhoto,
  useUpdatePatient,
  useUploadPatientPhoto,
} from "@/lib/api/queries";
import { ApiError, messageOf } from "@/lib/api/client";
import { useToast } from "@/components/ui/toast";
import { cn, isoDate, todayIso } from "@/lib/utils";
import type { Patient, PatientCreate, PatientSex, PatientUpdate } from "@/types/api";
import { PatientAvatar } from "./PatientAvatar";
import { PatientPhotoCapture } from "./PatientPhotoCapture";

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

const optionalText = z.string().trim().max(200).optional();

const schema = z
  .object({
    givenNames: z
      .string()
      .trim()
      .min(1, "Enter at least one given name")
      .refine((value) => value.split(/\s+/).filter(Boolean).length <= 5, "Use at most 5 given names"),
    family: z.string().trim().min(1, "Enter a family name").max(100, "Use at most 100 characters"),
    otherName: z.string().trim().max(100).optional(),
    dateOfBirth: z.string().min(1, "Choose a date of birth"),
    dobApproximate: z.boolean(),
    sex: z.enum(["male", "female", "other", "unknown"]),
    phones: z.array(z.object({ value: z.string().trim() })).max(5),
    line1: optionalText,
    line2: optionalText,
    city: z.string().trim().max(100).optional(),
    state: z.string().trim().max(100).optional(),
    postalCode: z.string().trim().max(30).optional(),
    country: z.string().trim().max(2, "Use the 2-letter country code").optional(),
    nextOfKin: z
      .array(
        z.object({
          name: z.string().trim().max(150).optional(),
          relationship: z.string().trim().max(80).optional(),
          phone: z.string().trim().max(30).optional(),
        }),
      )
      .max(5),
    payerName: z.string().trim().max(150).optional(),
    payerScheme: z.string().trim().max(100).optional(),
    memberNumber: z.string().trim().max(100).optional(),
    legacyNumber: z.string().trim().max(100).optional(),
    paperFile: z.boolean(),
  })
  .superRefine((values, context) => {
    if (values.dateOfBirth > todayIso()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dateOfBirth"],
        message: "Date of birth cannot be in the future",
      });
    }
    values.phones.forEach((phone, index) => {
      const value = phone.value.trim();
      if (value && value.length < 7) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["phones", index, "value"],
          message: "Use at least 7 characters",
        });
      }
    });
  });

type FormValues = z.infer<typeof schema>;

export function PatientFormDrawer({
  open,
  onOpenChange,
  patient,
  etag,
  onCreated,
  onReloadRequested,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient?: Patient;
  etag?: string | null;
  onCreated?: (patient: Patient) => void;
  onReloadRequested?: () => void;
}) {
  const isEdit = Boolean(patient);
  const toast = useToast();
  const createPatient = useCreatePatient();
  const updatePatient = useUpdatePatient(patient?._id ?? "");
  const uploadPhoto = useUploadPatientPhoto();
  const deletePhoto = useDeletePatientPhoto();
  const [formError, setFormError] = React.useState<string | null>(null);
  const [conflict, setConflict] = React.useState(false);
  const [photoFile, setPhotoFile] = React.useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(null);
  const [photoRemoved, setPhotoRemoved] = React.useState(false);
  const [photoError, setPhotoError] = React.useState<string | null>(null);
  const [captureOpen, setCaptureOpen] = React.useState(false);
  const photoInputRef = React.useRef<HTMLInputElement>(null);

  const defaults = React.useMemo<FormValues>(() => buildDefaults(patient), [patient]);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: defaults,
  });

  const phones = useFieldArray({ control, name: "phones" });
  const nextOfKin = useFieldArray({ control, name: "nextOfKin" });

  React.useEffect(() => {
    if (open) {
      reset(buildDefaults(patient));
      setFormError(null);
      setConflict(false);
      setPhotoFile(null);
      setPhotoRemoved(false);
      setPhotoError(null);
      setCaptureOpen(false);
    }
  }, [open, patient, reset]);

  React.useEffect(() => {
    if (!photoFile) {
      setPhotoPreview(null);
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  const choosePhoto = (files: FileList | null) => {
    const file = files?.[0];
    if (photoInputRef.current) photoInputRef.current.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setPhotoError("Choose an image file.");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError("The photo must be 10 MB or smaller.");
      return;
    }
    setPhotoError(null);
    setPhotoFile(file);
    setPhotoRemoved(false);
  };

  const clearPhoto = () => {
    setPhotoFile(null);
    setPhotoError(null);
    setPhotoRemoved(Boolean(isEdit && patient?.has_photo));
  };

  const applyPhoto = (file: File) => {
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError("The captured photo is larger than 10 MB. Try again.");
      return;
    }
    setPhotoError(null);
    setPhotoFile(file);
    setPhotoRemoved(false);
  };

  const hasVisiblePhoto = Boolean(photoPreview || (!photoRemoved && isEdit && patient?.has_photo));

  const onSubmit = handleSubmit(
    async (values) => {
      setFormError(null);
      try {
        let saved: Patient;
        if (isEdit && patient) {
          const result = await updatePatient.mutateAsync({
            body: toUpdatePayload(values),
            etag: etag ?? null,
            version: patient.version,
          });
          saved = result.data.patient;
        } else {
          const result = await createPatient.mutateAsync(toCreatePayload(values));
          saved = result.data.patient;
        }

        let photoProblem: string | null = null;
        if (photoFile) {
          try {
            const result = await uploadPhoto.mutateAsync({
              patientId: saved._id,
              file: photoFile,
            });
            saved = result.data.patient;
          } catch (error) {
            photoProblem = messageOf(error, "The photo could not be uploaded.");
          }
        } else if (isEdit && photoRemoved && saved.has_photo) {
          try {
            const result = await deletePhoto.mutateAsync({ patientId: saved._id });
            saved = result.data.patient;
          } catch (error) {
            photoProblem = messageOf(error, "The photo could not be removed.");
          }
        }

        if (isEdit) {
          toast.success("Patient updated", "The latest version is now on screen.");
        } else {
          toast.success("Patient registered", `${saved.patient_number} is ready.`);
        }
        if (photoProblem) toast.error("Photo not saved", photoProblem);
        onOpenChange(false);
        if (!isEdit) onCreated?.(saved);
      } catch (error) {
        if (error instanceof ApiError && error.isConflict) {
          setConflict(true);
          return;
        }
        setFormError(messageOf(error, "The patient could not be saved."));
      }
    },
    (invalid) => {
      const first = Object.keys(invalid)[0];
      if (first) setFocus(first as keyof FormValues);
    },
  );

  const mutation = isEdit ? updatePatient : createPatient;

  return (
    <>
      <Modal
        open={open}
        onOpenChange={onOpenChange}
        variant={isEdit ? "drawer" : "dialog"}
        className={isEdit ? undefined : "lg:max-w-[760px]"}
        title={isEdit ? "Edit patient" : "Register a patient"}
        description={
          isEdit
            ? "Demographics that the API allows staff to change."
            : "Only name and date of birth are required."
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" form="patient-form" loading={isSubmitting}>
              {isEdit ? "Save changes" : "Register patient"}
            </Button>
          </>
        }
      >
        <form id="patient-form" onSubmit={onSubmit} noValidate className="space-y-6">
          <FormError message={formError} />

          <section className="flex items-start gap-4">
            <div className="shrink-0">
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Selected patient photo preview"
                  className="h-20 w-20 rounded-pill border border-line object-cover"
                />
              ) : !photoRemoved && isEdit && patient?.has_photo ? (
                <PatientAvatar patient={patient} size="lg" className="h-20 w-20" />
              ) : (
                <span
                  aria-hidden="true"
                  className="flex h-20 w-20 items-center justify-center rounded-pill border border-dashed border-line bg-surface-2 text-faint"
                >
                  <Camera className="h-6 w-6" />
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-micro text-faint">Photo</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => photoInputRef.current?.click()}
                  leadingIcon={<Camera className="h-3.5 w-3.5" />}
                >
                  {hasVisiblePhoto ? "Change photo" : "Add photo"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setCaptureOpen(true)}
                  leadingIcon={<Webcam className="h-3.5 w-3.5" />}
                >
                  Take photo
                </Button>
                {hasVisiblePhoto ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearPhoto}
                    className="text-danger hover:bg-danger-soft"
                    leadingIcon={<Trash2 className="h-3.5 w-3.5" />}
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
              <p className="mt-1.5 text-small text-faint">
                Take a photo with the camera or choose a file · JPEG, PNG, WebP or HEIC · up to 10 MB.
              </p>
              {photoError ? <p className="mt-1 text-small text-danger">{photoError}</p> : null}
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                aria-label="Patient photo"
                className="sr-only"
                onChange={(event) => choosePhoto(event.target.files)}
              />
            </div>
          </section>

          <PatientPhotoCapture
            open={captureOpen}
            onOpenChange={setCaptureOpen}
            onCapture={applyPhoto}
          />

          <section className="space-y-4">
            <h3 className="text-micro text-faint">Name</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Given names" htmlFor="givenNames" error={errors.givenNames?.message} required help="Separate multiple names with spaces.">
                <Input id="givenNames" autoComplete="off" aria-invalid={Boolean(errors.givenNames)} {...register("givenNames")} />
              </Field>
              <Field label="Family name" htmlFor="family" error={errors.family?.message} required>
                <Input id="family" autoComplete="off" aria-invalid={Boolean(errors.family)} {...register("family")} />
              </Field>
            </div>
            <Field label="Other name" htmlFor="otherName" error={errors.otherName?.message}>
              <Input id="otherName" autoComplete="off" {...register("otherName")} />
            </Field>
          </section>

          <section className="space-y-4">
            <h3 className="text-micro text-faint">Demographics</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Date of birth"
                htmlFor="dateOfBirth"
                error={errors.dateOfBirth?.message}
                required
                help={isEdit ? "Not editable after registration." : undefined}
              >
                <Input
                  id="dateOfBirth"
                  type="date"
                  max={isoDate(new Date())}
                  disabled={isEdit}
                  aria-invalid={Boolean(errors.dateOfBirth)}
                  {...register("dateOfBirth")}
                />
              </Field>
              <Field label="Sex" htmlFor="sex" error={errors.sex?.message} help={isEdit ? "Not editable after registration." : undefined}>
                <Select id="sex" disabled={isEdit} {...register("sex")}>
                  <option value="unknown">Unknown</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                </Select>
              </Field>
            </div>
            <div className="space-y-2">
              <Checkbox label="Date of birth is approximate" {...register("dobApproximate")} />
              <Checkbox
                label={isEdit ? "Patient has a paper file" : "A paper file already exists"}
                {...register("paperFile")}
              />
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-micro text-faint">Phone numbers</h3>
              {phones.fields.length < 5 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => phones.append({ value: "" })}
                  leadingIcon={<Plus className="h-3.5 w-3.5" />}
                >
                  Add
                </Button>
              ) : null}
            </div>
            {phones.fields.length === 0 ? (
              <p className="text-small text-muted">No phone numbers recorded.</p>
            ) : null}
            {phones.fields.map((field, index) => (
              <div key={field.id} className="flex items-start gap-2">
                <Field className="flex-1" error={errors.phones?.[index]?.value?.message} label={index === 0 ? "Primary phone" : `Phone ${index + 1}`} htmlFor={`phone-${index}`}>
                  <Input id={`phone-${index}`} inputMode="tel" autoComplete="off" {...register(`phones.${index}.value` as const)} />
                </Field>
                <button
                  type="button"
                  onClick={() => phones.remove(index)}
                  className="mt-[26px] inline-flex h-11 w-11 items-center justify-center rounded-md text-faint hover:bg-danger-soft hover:text-danger"
                  aria-label={`Remove phone ${index + 1}`}
                >
                  <Trash2 aria-hidden className="h-4 w-4" />
                </button>
              </div>
            ))}
            {phones.fields.length === 0 ? (
              <Button type="button" variant="secondary" size="sm" onClick={() => phones.append({ value: "" })} leadingIcon={<Plus className="h-3.5 w-3.5" />}>
                Add phone number
              </Button>
            ) : null}
          </section>

          <section className="space-y-3">
            <h3 className="text-micro text-faint">Address</h3>
            <Field label="Line 1" htmlFor="line1" error={errors.line1?.message}>
              <Input id="line1" autoComplete="address-line1" {...register("line1")} />
            </Field>
            <Field label="Line 2" htmlFor="line2" error={errors.line2?.message}>
              <Input id="line2" autoComplete="address-line2" {...register("line2")} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="City" htmlFor="city" error={errors.city?.message}>
                <Input id="city" autoComplete="address-level2" {...register("city")} />
              </Field>
              <Field label="State" htmlFor="state" error={errors.state?.message}>
                <Input id="state" autoComplete="address-level1" {...register("state")} />
              </Field>
              <Field label="Postal code" htmlFor="postalCode" error={errors.postalCode?.message}>
                <Input id="postalCode" autoComplete="postal-code" {...register("postalCode")} />
              </Field>
              <Field label="Country code" htmlFor="country" error={errors.country?.message} hint="2 letters">
                <Input id="country" autoComplete="country" maxLength={2} className="uppercase" {...register("country")} />
              </Field>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-micro text-faint">Next of kin</h3>
              {nextOfKin.fields.length < 5 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => nextOfKin.append({ name: "", relationship: "", phone: "" })}
                  leadingIcon={<Plus className="h-3.5 w-3.5" />}
                >
                  Add
                </Button>
              ) : null}
            </div>
            {nextOfKin.fields.length === 0 ? (
              <p className="text-small text-muted">No emergency contact recorded.</p>
            ) : null}
            {nextOfKin.fields.map((field, index) => (
              <div key={field.id} className="rounded-md border border-line bg-surface-2 p-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Name" htmlFor={`nok-name-${index}`}>
                    <Input id={`nok-name-${index}`} {...register(`nextOfKin.${index}.name` as const)} />
                  </Field>
                  <Field label="Relationship" htmlFor={`nok-rel-${index}`}>
                    <Input id={`nok-rel-${index}`} placeholder="Sister" {...register(`nextOfKin.${index}.relationship` as const)} />
                  </Field>
                  <Field label="Phone" htmlFor={`nok-phone-${index}`} className="sm:col-span-2">
                    <Input id={`nok-phone-${index}`} inputMode="tel" {...register(`nextOfKin.${index}.phone` as const)} />
                  </Field>
                </div>
                <div className="mt-2 flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => nextOfKin.remove(index)}
                    leadingIcon={<Trash2 className="h-3.5 w-3.5" />}
                    className="text-danger hover:bg-danger-soft"
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </section>

          <section className="space-y-3">
            <h3 className="text-micro text-faint">Payer (optional)</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Payer name" htmlFor="payerName" error={errors.payerName?.message}>
                <Input id="payerName" {...register("payerName")} />
              </Field>
              <Field label="Scheme" htmlFor="payerScheme" error={errors.payerScheme?.message}>
                <Input id="payerScheme" {...register("payerScheme")} />
              </Field>
              <Field label="Member number" htmlFor="memberNumber" error={errors.memberNumber?.message} className="sm:col-span-2">
                <Input id="memberNumber" className="font-mono" {...register("memberNumber")} />
              </Field>
            </div>
            {isEdit ? null : (
              <Field label="Legacy record number" htmlFor="legacyNumber" error={errors.legacyNumber?.message} help="Use if this patient already has a paper or older-system number.">
                <Input id="legacyNumber" className="font-mono" {...register("legacyNumber")} />
              </Field>
            )}
          </section>

          <p className={cn("text-small text-faint", !isEdit && "pb-2")}>
            {mutation.isError && !formError && !conflict ? "Check the highlighted fields." : "Fields can be updated later, except date of birth, sex and patient number."}
          </p>
        </form>
      </Modal>

      <ConflictDialog
        open={conflict}
        onOpenChange={setConflict}
        recordLabel="patient"
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

function buildDefaults(patient?: Patient): FormValues {
  return {
    givenNames: patient?.name.given.join(" ") ?? "",
    family: patient?.name.family ?? "",
    otherName: patient?.name.other ?? "",
    dateOfBirth: patient?.date_of_birth ?? "",
    dobApproximate: patient?.dob_approximate ?? false,
    sex: (patient?.sex ?? "unknown") as FormValues["sex"],
    phones: patient?.phones?.length ? patient.phones.map((value) => ({ value })) : [],
    line1: patient?.address?.line1 ?? "",
    line2: patient?.address?.line2 ?? "",
    city: patient?.address?.city ?? "",
    state: patient?.address?.state ?? "",
    postalCode: patient?.address?.postal_code ?? "",
    country: patient?.address?.country ?? "",
    nextOfKin:
      patient?.next_of_kin?.length
        ? patient.next_of_kin.map((contact) => ({
            name: contact.name,
            relationship: contact.relationship ?? "",
            phone: contact.phone ?? "",
          }))
        : [],
    payerName: patient?.payer?.name ?? "",
    payerScheme: patient?.payer?.scheme ?? "",
    memberNumber: patient?.payer?.member_number ?? "",
    legacyNumber: patient?.legacy_number ?? "",
    paperFile: patient?.paper_file ?? false,
  };
}

function splitGiven(value: string): string[] {
  return value.split(/\s+/).map((part) => part.trim()).filter(Boolean);
}

function addressPayload(values: FormValues) {
  const address = {
    line1: values.line1 || null,
    line2: values.line2 || null,
    city: values.city || null,
    state: values.state || null,
    postal_code: values.postalCode || null,
    country: values.country ? values.country.toUpperCase() : null,
  };
  return Object.values(address).some(Boolean) ? address : null;
}

function payerPayload(values: FormValues) {
  const payer = {
    name: values.payerName || null,
    scheme: values.payerScheme || null,
    member_number: values.memberNumber || null,
  };
  return Object.values(payer).some(Boolean) ? payer : null;
}

function nextOfKinPayload(values: FormValues) {
  return values.nextOfKin
    .filter((contact) => contact.name?.trim())
    .map((contact) => ({
      name: contact.name!.trim(),
      relationship: contact.relationship || null,
      phone: contact.phone || null,
    }));
}

function phonePayload(values: FormValues): string[] {
  return values.phones.map((phone) => phone.value.trim()).filter(Boolean);
}

function toCreatePayload(values: FormValues): PatientCreate {
  return {
    name: {
      given: splitGiven(values.givenNames),
      family: values.family.trim(),
      other: values.otherName || null,
    },
    date_of_birth: values.dateOfBirth,
    dob_approximate: values.dobApproximate,
    sex: values.sex as PatientSex,
    phones: phonePayload(values),
    address: addressPayload(values),
    next_of_kin: nextOfKinPayload(values),
    payer: payerPayload(values),
    legacy_number: values.legacyNumber || null,
    paper_file: values.paperFile,
  };
}

function toUpdatePayload(values: FormValues): PatientUpdate {
  return {
    name: {
      given: splitGiven(values.givenNames),
      family: values.family.trim(),
      other: values.otherName || null,
    },
    phones: phonePayload(values),
    address: addressPayload(values),
    next_of_kin: nextOfKinPayload(values),
    payer: payerPayload(values),
    paper_file: values.paperFile,
  };
}
