import * as React from "react";
import { Link, useParams } from "react-router-dom";
import { Activity, ImageOff, Pencil, Stethoscope } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Badge, VisitStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Modal } from "@/components/ui/dialog";
import { EmptyState, ForbiddenState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ConflictDialog } from "@/components/domain/ConflictDialog";
import { useToast } from "@/components/ui/toast";
import { AttachmentGallery } from "@/features/attachments/AttachmentGallery";
import { AttachmentUploader } from "@/features/attachments/AttachmentUploader";
import { VitalsList } from "@/features/vitals/VitalsList";
import { RecordVitalsDialog } from "@/features/vitals/RecordVitalsDialog";
import { EditVisitDialog } from "./EditVisitDialog";
import { PageHeader } from "@/features/shell/AppShell";
import {
  useAttachmentRefresh,
  useCloseVisit,
  usePatient,
  useVisit,
  useVisitAttachments,
} from "@/lib/api/queries";
import { ApiError, messageOf } from "@/lib/api/client";
import { GatedButton, usePermission } from "@/lib/permissions/Can";
import { formatDate, formatDateTime } from "@/lib/utils";

export default function VisitDetailPage() {
  const { visitId = "" } = useParams();
  const { has } = usePermission();
  const toast = useToast();
  const visitQuery = useVisit(visitId);
  const visit = visitQuery.data?.entity;
  const patientQuery = usePatient(visit?.patient_id ?? "", Boolean(visit?.patient_id));
  const attachmentsQuery = useVisitAttachments(visitId, has("document:read"));
  const attachments = attachmentsQuery.data?.pages.flatMap((page) => page.attachments) ?? [];
  const refreshUrl = useAttachmentRefresh(visitId);

  const closeVisit = useCloseVisit(visitId);
  const [editOpen, setEditOpen] = React.useState(false);
  const [closeOpen, setCloseOpen] = React.useState(false);
  const [vitalsOpen, setVitalsOpen] = React.useState(false);
  const [conflict, setConflict] = React.useState(false);
  const [closeError, setCloseError] = React.useState<string | null>(null);

  React.useEffect(() => {
    document.title = "Visit · HMS";
  }, []);

  if (visitQuery.isPending) {
    return (
      <div aria-busy="true">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-3 h-9 w-64" />
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-72 rounded-lg lg:col-span-2" />
          <Skeleton className="h-72 rounded-lg" />
        </div>
      </div>
    );
  }

  if (visitQuery.isError) {
    const error = visitQuery.error;
    if (error instanceof ApiError && error.isForbidden) return <ForbiddenState help={error.message} />;
    return (
      <>
        <PageHeader title="Visit" back={{ to: "/patients", label: "Patients" }} />
        <EmptyState
          title={error instanceof ApiError && error.isNotFound ? "Visit not found" : "This visit could not load"}
          help={error.message}
          action={
            <Button variant="secondary" onClick={() => void visitQuery.refetch()}>
              Try again
            </Button>
          }
        />
      </>
    );
  }

  if (!visit) return null;

  const patient = patientQuery.data?.entity;
  const isOpen = visit.status === "open";
  const etag = visitQuery.data?.etag ?? null;

  const handleClose = async () => {
    setCloseError(null);
    try {
      await closeVisit.mutateAsync({ etag, version: visit.version });
      toast.success("Visit closed", "The record is now locked for clinical additions.");
      setCloseOpen(false);
    } catch (error) {
      if (error instanceof ApiError && error.isConflict) {
        setCloseOpen(false);
        setConflict(true);
        return;
      }
      setCloseError(messageOf(error, "The visit could not be closed."));
      if (error instanceof ApiError && error.status === 409) void visitQuery.refetch();
    }
  };

  return (
    <>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2.5">
            <span className="capitalize">{visit.type} visit</span>
            <VisitStatusBadge status={visit.status} />
          </span>
        }
        subtitle={`${formatDate(visit.visit_date)} · ${visit.attending_clinician.name}`}
        back={
          visit.patient_id
            ? { to: `/patients/${visit.patient_id}/visits`, label: "Patient visits" }
            : { to: "/patients", label: "Patients" }
        }
        actions={
          <>
            <GatedButton
              permission="vitals:write"
              variant="secondary"
              disabled={!isOpen}
              onClick={() => setVitalsOpen(true)}
              leadingIcon={<Activity className="h-4 w-4" />}
            >
              Record vitals
            </GatedButton>
            <GatedButton
              permission="visit:update"
              variant="secondary"
              disabled={!isOpen}
              onClick={() => setEditOpen(true)}
              leadingIcon={<Pencil className="h-4 w-4" />}
            >
              Edit
            </GatedButton>
            <GatedButton permission="visit:close" variant="danger-outline" disabled={!isOpen} onClick={() => setCloseOpen(true)}>
              Close visit
            </GatedButton>
          </>
        }
      />

      {patient ? (
        <Card className="mb-4">
          <Link
            to={`/patients/${patient._id}`}
            className="flex items-center gap-3 rounded-lg px-5 py-3.5 transition-colors hover:bg-surface-2"
          >
            <Avatar name={patient.display_name} seed={patient._id} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.9375rem] font-semibold text-ink">{patient.display_name}</p>
              <p className="text-small font-normal text-muted">
                <span className="font-mono">{patient.patient_number}</span> · {patient.age_years} years
              </p>
            </div>
            <span className="text-small font-semibold text-brand-700">Open record</span>
          </Link>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader
              title="Reason for visit"
              action={
                isOpen && has("visit:update") ? (
                  <Button variant="ghost" size="sm" onClick={() => setEditOpen(true)}>
                    Edit
                  </Button>
                ) : null
              }
            />
            <CardBody>
              {visit.reason_for_visit ? (
                <p className="max-w-[70ch] whitespace-pre-wrap text-[0.9375rem] leading-relaxed text-ink">
                  {visit.reason_for_visit}
                </p>
              ) : (
                <p className="text-[0.9375rem] text-muted">
                  No reason recorded. {isOpen ? "Use Edit to add clinical notes." : ""}
                </p>
              )}
            </CardBody>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader
              title="Vitals"
              subtitle={visit.vitals.length ? `${visit.vitals.length} measurement${visit.vitals.length === 1 ? "" : "s"}` : undefined}
              action={
                isOpen ? (
                  <GatedButton permission="vitals:write" size="sm" variant="secondary" onClick={() => setVitalsOpen(true)}>
                    Record
                  </GatedButton>
                ) : null
              }
            />
            <CardBody className="p-0 pb-1">
              {visit.vitals.length > 0 ? (
                <VitalsList vitals={visit.vitals} />
              ) : (
                <EmptyState
                  icon={Activity}
                  title="No vitals on this visit"
                  help="Record the first measurement to start the trend."
                  action={
                    isOpen ? (
                      <GatedButton permission="vitals:write" onClick={() => setVitalsOpen(true)}>
                        Record vitals
                      </GatedButton>
                    ) : undefined
                  }
                />
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Visit details" />
            <CardBody className="space-y-3">
              <Detail label="Status">
                <VisitStatusBadge status={visit.status} />
              </Detail>
              <Detail label="Visit date">{formatDate(visit.visit_date)}</Detail>
              <Detail label="Attending">
                <span className="inline-flex items-center gap-1.5">
                  <Stethoscope aria-hidden className="h-3.5 w-3.5 text-faint" />
                  {visit.attending_clinician.name}
                </span>
              </Detail>
              <Detail label="Opened">{formatDateTime(visit.created_at)}</Detail>
              {visit.closed_at ? <Detail label="Closed">{formatDateTime(visit.closed_at)}</Detail> : null}
              {visit.status === "closed" ? (
                <p className="rounded-md bg-surface-2 px-3 py-2 text-small text-muted">
                  This visit is locked. Clinical additions and edits are unavailable.
                </p>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Images" subtitle="Stored privately; shown with short-lived links" />
            <CardBody className="space-y-4">
              {has("document:capture") ? (
                <AttachmentUploader
                  visitId={visitId}
                  canUpload={isOpen}
                  disabledReason="Images can only be added to an open visit."
                />
              ) : null}

              {!has("document:read") ? (
                <p className="text-small text-muted">Your role cannot view visit images.</p>
              ) : attachmentsQuery.isPending ? (
                <div className="grid grid-cols-2 gap-2.5">
                  <Skeleton className="aspect-square rounded-md" />
                  <Skeleton className="aspect-square rounded-md" />
                </div>
              ) : attachmentsQuery.isError ? (
                <div className="rounded-md border border-warning/30 bg-warning-soft px-3 py-2.5 text-small text-warning">
                  Images could not load.{" "}
                  {attachmentsQuery.error instanceof ApiError ? attachmentsQuery.error.message : ""}
                  <button
                    type="button"
                    onClick={() => void attachmentsQuery.refetch()}
                    className="ml-1 font-semibold underline"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <>
                  <AttachmentGallery attachments={attachments} onRefreshUrl={refreshUrl} />
                  {attachmentsQuery.hasNextPage ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      loading={attachmentsQuery.isFetchingNextPage}
                      onClick={() => void attachmentsQuery.fetchNextPage()}
                    >
                      Load more images
                    </Button>
                  ) : null}
                </>
              )}
            </CardBody>
          </Card>

          {!has("document:read") && !has("document:capture") ? (
            <div className="flex items-center gap-2 rounded-md border border-dashed border-line px-3 py-2.5 text-small text-faint">
              <ImageOff aria-hidden className="h-4 w-4" />
              Images are not in your access.
            </div>
          ) : null}
        </div>
      </div>

      <EditVisitDialog
        visit={visit}
        etag={etag}
        open={editOpen}
        onOpenChange={setEditOpen}
        onReloadRequested={() => void visitQuery.refetch()}
      />

      <RecordVitalsDialog
        patientId={visit.patient_id}
        openVisits={isOpen ? [visit] : []}
        defaultVisitId={visit._id}
        open={vitalsOpen}
        onOpenChange={setVitalsOpen}
      />

      <Modal
        open={closeOpen}
        onOpenChange={setCloseOpen}
        title="Close this visit?"
        description="Closing locks the visit. Vitals, notes and images can no longer be added."
        footer={
          <>
            <Button variant="secondary" onClick={() => setCloseOpen(false)}>
              Keep open
            </Button>
            <Button
              variant="danger-outline"
              loading={closeVisit.isPending}
              onClick={() => void handleClose()}
            >
              Close visit
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {closeError ? (
            <p role="alert" className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-small text-danger">
              {closeError}
            </p>
          ) : null}
          <p className="text-[0.9375rem] text-muted">
            You are closing the <span className="font-semibold capitalize text-ink">{visit.type}</span>{" "}
            visit from <span className="font-semibold text-ink">{formatDate(visit.visit_date)}</span>.
            This is recorded in the audit trail.
          </p>
          <ul className="space-y-1.5 text-small text-muted">
            <li>· The visit stays visible in the patient's history.</li>
            <li>· A closed visit cannot be reopened in this release.</li>
            <li>· Your changes are version-checked before saving.</li>
          </ul>
          {visit.status !== "open" ? (
            <Badge tone="neutral">This visit is already closed</Badge>
          ) : null}
        </div>
      </Modal>

      <ConflictDialog
        open={conflict}
        onOpenChange={setConflict}
        recordLabel="visit"
        onReview={() => setConflict(false)}
        onReload={() => {
          setConflict(false);
          void visitQuery.refetch();
        }}
      />
    </>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-small text-muted">{label}</span>
      <span className="text-right text-small font-medium text-ink">{children}</span>
    </div>
  );
}
