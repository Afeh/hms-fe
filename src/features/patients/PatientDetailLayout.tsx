import * as React from "react";
import { Link, Outlet, useParams, useSearchParams } from "react-router-dom";
import { AlertTriangle, Copy, FileText, Pencil, Stethoscope } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Badge, PatientStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ForbiddenState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { TabNav } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { PageHeader } from "@/features/shell/AppShell";
import { PrivacyShield } from "@/components/domain/PrivacyShield";
import { PatientFormDrawer } from "./PatientFormDrawer";
import { StartVisitDialog } from "@/features/visits/StartVisitDialog";
import { usePatient } from "@/lib/api/queries";
import { ApiError } from "@/lib/api/client";
import { GatedButton, usePermission } from "@/lib/permissions/Can";
import { formatDate, sexLabel } from "@/lib/utils";

export default function PatientDetailLayout() {
  const { patientId = "" } = useParams();
  const { has } = usePermission();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [editOpen, setEditOpen] = React.useState(false);
  const patientQuery = usePatient(patientId);

  const startVisitOpen = params.get("startVisit") === "1";
  const setStartVisitOpen = (open: boolean) => {
    const next = new URLSearchParams(params);
    if (open) next.set("startVisit", "1");
    else next.delete("startVisit");
    setParams(next, { replace: true });
  };

  React.useEffect(() => {
    // Patient names must never appear in the document title (guide §12).
    document.title = "Patient record · HMS";
  }, []);

  if (patientQuery.isPending) {
    return (
      <div aria-busy="true">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="mt-6 h-[148px] rounded-lg" />
        <Skeleton className="mt-4 h-64 rounded-lg" />
      </div>
    );
  }

  if (patientQuery.isError) {
    const error = patientQuery.error;
    if (error instanceof ApiError && error.isForbidden) {
      return <ForbiddenState help={error.message} />;
    }
    return (
      <>
        <PageHeader title="Patient record" back={{ to: "/patients", label: "Patients" }} />
        <EmptyState
          title={error instanceof ApiError && error.isNotFound ? "Patient not found" : "This record could not load"}
          help={
            error instanceof ApiError && error.isNotFound
              ? "The record may belong to another hospital or no longer exist."
              : error.message
          }
          action={
            <Button variant="secondary" onClick={() => void patientQuery.refetch()}>
              Try again
            </Button>
          }
        />
      </>
    );
  }

  const patient = patientQuery.data.entity;
  const etag = patientQuery.data.etag;

  const copyNumber = async () => {
    try {
      await navigator.clipboard.writeText(patient.patient_number);
      toast.success("Patient number copied");
    } catch {
      toast.error("Copy failed", "Select the number and copy it manually.");
    }
  };

  return (
    <PrivacyShield>
      <PageHeader
        title="Patient record"
        back={{ to: "/patients", label: "Patients" }}
        actions={
          <>
            <GatedButton
              permission="visit:create"
              onClick={() => setStartVisitOpen(true)}
              leadingIcon={<Stethoscope className="h-4 w-4" />}
            >
              Start visit
            </GatedButton>
            <GatedButton
              permission="patient:update"
              variant="secondary"
              onClick={() => setEditOpen(true)}
              leadingIcon={<Pencil className="h-4 w-4" />}
            >
              Edit
            </GatedButton>
          </>
        }
      />

      <Card className="mb-4">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
          <Avatar name={patient.display_name} seed={patient._id} size="lg" ring />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-h1 text-ink">{patient.display_name}</h2>
              <PatientStatusBadge status={patient.status} />
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span className="inline-flex items-center gap-1.5">
                <span className="font-mono text-small font-medium text-ink">{patient.patient_number}</span>
                <button
                  type="button"
                  onClick={() => void copyNumber()}
                  aria-label="Copy patient number"
                  className="rounded-sm p-1 text-faint hover:bg-surface-2 hover:text-ink"
                >
                  <Copy aria-hidden className="h-3.5 w-3.5" />
                </button>
              </span>
              <span className="text-small text-muted">
                {patient.age_years} years · {sexLabel(patient.sex)}
              </span>
              <span className="text-small text-muted">
                Registered {formatDate(patient.registration_date)}
              </span>
            </div>

            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {patient.date_of_birth ? (
                <Badge tone="neutral">
                  DOB {formatDate(patient.date_of_birth)}
                  {patient.dob_approximate ? " (approx.)" : ""}
                </Badge>
              ) : null}
              {patient.paper_file ? (
                <Badge tone="warning" icon={FileText}>
                  Paper file exists
                </Badge>
              ) : null}
              {patient.legacy_number ? (
                <Badge tone="neutral">
                  Legacy <span className="font-mono">{patient.legacy_number}</span>
                </Badge>
              ) : null}
              {patient.status === "deceased" ? (
                <Badge tone="danger" icon={AlertTriangle}>
                  Deceased — confirm before new care
                </Badge>
              ) : null}
            </div>
          </div>

          <div className="shrink-0 text-small text-muted sm:text-right">
            <p className="text-micro text-faint">Last visit</p>
            <p className="mt-0.5 font-semibold text-ink">
              {patient.last_visit_date ? formatDate(patient.last_visit_date) : "None"}
            </p>
            {patient.phones[0] ? (
              <>
                <p className="mt-2 text-micro text-faint">Phone</p>
                <p className="mt-0.5 font-mono font-medium text-ink">{patient.phones[0]}</p>
              </>
            ) : null}
          </div>
        </div>
      </Card>

      <div className="mb-4">
        <TabNav
          items={[
            { to: `/patients/${patient._id}`, label: "Overview", end: true },
            { to: `/patients/${patient._id}/visits`, label: "Visits" },
            { to: `/patients/${patient._id}/vitals`, label: "Vitals" },
            { to: `/patients/${patient._id}/attachments`, label: "Attachments" },
          ]}
        />
      </div>

      <Outlet />

      <PatientFormDrawer
        open={editOpen}
        onOpenChange={setEditOpen}
        patient={patient}
        etag={etag}
        onReloadRequested={() => void patientQuery.refetch()}
      />

      {has("visit:create") ? (
        <StartVisitDialog
          patientId={patient._id}
          open={startVisitOpen}
          onOpenChange={setStartVisitOpen}
        />
      ) : null}

      <p className="mt-6">
        <Link to="/patients" className="text-small font-semibold text-brand-700 hover:underline">
          Back to directory
        </Link>
      </p>
    </PrivacyShield>
  );
}
