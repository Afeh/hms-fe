import { Link, useParams } from "react-router-dom";
import { Activity, CalendarClock, Home, Phone, Stethoscope, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { usePatient, usePatientVisits, usePatientVitals } from "@/lib/api/queries";
import { Can } from "@/lib/permissions/Can";
import { formatDate, formatDateTime, sexLabel } from "@/lib/utils";
import type { Vitals } from "@/types/api";

export default function PatientOverviewTab() {
  const { patientId = "" } = useParams();
  const patientQuery = usePatient(patientId);
  const visitsQuery = usePatientVisits(patientId);
  const vitalsQuery = usePatientVitals(patientId);

  const patient = patientQuery.data?.entity;
  const visits = visitsQuery.data?.pages.flatMap((page) => page.visits) ?? [];
  const openVisit = visits.find((visit) => visit.status === "open");
  const latestVitals = vitalsQuery.data?.pages
    .flatMap((page) => page.vitals)
    .find((record) => record.status === "active");

  if (!patient) return null;

  return (
    <div className="grid gap-4 xl:grid-cols-12 xl:gap-5">
      <Card className="xl:col-span-4">
        <CardHeader title="Demographics" />
        <CardBody className="space-y-3">
          <Row label="Date of birth">
            {formatDate(patient.date_of_birth)}
            {patient.dob_approximate ? <span className="text-faint"> (approx.)</span> : null}
          </Row>
          <Row label="Age">{patient.age_years} years</Row>
          <Row label="Sex">{sexLabel(patient.sex)}</Row>
          <Row label="Registered">{formatDate(patient.registration_date)}</Row>
          <Row label="Patient number">
            <span className="font-mono">{patient.patient_number}</span>
          </Row>
        </CardBody>
      </Card>

      <Card className="xl:col-span-4">
        <CardHeader title="Contact" action={<Home aria-hidden className="h-4 w-4 text-faint" />} />
        <CardBody className="space-y-3">
          <div>
            <p className="text-micro text-faint">Phone numbers</p>
            {patient.phones.length ? (
              <ul className="mt-1 space-y-1">
                {patient.phones.map((phone) => (
                  <li key={phone} className="flex items-center gap-1.5">
                    <Phone aria-hidden className="h-3.5 w-3.5 text-faint" />
                    <span className="font-mono text-[0.9375rem] text-ink">{phone}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-[0.9375rem] text-muted">Not recorded</p>
            )}
          </div>
          <div>
            <p className="text-micro text-faint">Address</p>
            <address className="mt-1 not-italic text-[0.9375rem] leading-relaxed text-ink">
              {addressLines(patient.address).length ? (
                addressLines(patient.address).map((line) => <span key={line} className="block">{line}</span>)
              ) : (
                <span className="text-muted">Not recorded</span>
              )}
            </address>
          </div>
        </CardBody>
      </Card>

      <Card className="xl:col-span-4">
        <CardHeader title="Next of kin" action={<Users aria-hidden className="h-4 w-4 text-faint" />} />
        <CardBody>
          {patient.next_of_kin.length ? (
            <ul className="space-y-3">
              {patient.next_of_kin.map((contact, index) => (
                <li key={`${contact.name}-${index}`}>
                  <p className="text-[0.9375rem] font-semibold text-ink">{contact.name}</p>
                  <p className="text-small text-muted">
                    {contact.relationship || "Relationship not recorded"}
                  </p>
                  {contact.phone ? (
                    <p className="mt-0.5 font-mono text-small text-muted">{contact.phone}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[0.9375rem] text-muted">No emergency contact recorded.</p>
          )}
        </CardBody>
      </Card>

      <Card className="xl:col-span-5">
        <CardHeader
          title="Latest vitals"
          action={
            <Link to={`/patients/${patient._id}/vitals`} className="text-small font-semibold text-brand-700 hover:underline">
              All vitals
            </Link>
          }
        />
        <CardBody>
          {vitalsQuery.isPending ? (
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-14" />
              ))}
            </div>
          ) : latestVitals ? (
            <VitalsSummary vitals={latestVitals} />
          ) : (
            <EmptyState
              icon={Activity}
              title="No vitals recorded"
              help="Measurements recorded against a visit appear here."
              className="py-6"
            />
          )}
        </CardBody>
      </Card>

      <Card className="xl:col-span-4">
        <CardHeader title="Current visit" action={<CalendarClock aria-hidden className="h-4 w-4 text-faint" />} />
        <CardBody>
          {openVisit ? (
            <div className="rounded-md gradient-soft p-4">
              <div className="flex items-center justify-between">
                <p className="text-[0.9375rem] font-semibold capitalize text-ink">{openVisit.type}</p>
                <Badge tone="brand">Open</Badge>
              </div>
              <p className="mt-1 text-small text-muted">
                Opened {formatDate(openVisit.visit_date)} · {openVisit.attending_clinician.name}
              </p>
              {openVisit.reason_for_visit ? (
                <p className="mt-2 line-clamp-3 text-small text-muted">{openVisit.reason_for_visit}</p>
              ) : null}
              <Link
                to={`/visits/${openVisit._id}`}
                className="mt-3 inline-flex items-center gap-1 text-small font-semibold text-brand-700 hover:underline"
              >
                <Stethoscope aria-hidden className="h-3.5 w-3.5" />
                Open visit
              </Link>
            </div>
          ) : (
            <div className="py-2">
              <p className="text-[0.9375rem] text-muted">No open visit for this patient.</p>
              <Can permission="visit:create">
                <Link
                  to={`/patients/${patient._id}?startVisit=1`}
                  className="mt-2 inline-flex text-small font-semibold text-brand-700 hover:underline"
                >
                  Start a visit
                </Link>
              </Can>
            </div>
          )}
        </CardBody>
      </Card>

      <Card className="xl:col-span-3">
        <CardHeader title="Payer" />
        <CardBody className="space-y-3">
          {patient.payer?.name || patient.payer?.scheme ? (
            <>
              <Row label="Payer">{patient.payer?.name || "—"}</Row>
              <Row label="Scheme">{patient.payer?.scheme || "—"}</Row>
              <Row label="Member number">
                <span className="font-mono">{patient.payer?.member_number || "—"}</span>
              </Row>
            </>
          ) : (
            <p className="text-[0.9375rem] text-muted">Self-pay or not recorded.</p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-small text-muted">{label}</span>
      <span className="text-right text-[0.9375rem] font-medium text-ink">{children}</span>
    </div>
  );
}

function addressLines(address: {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
} | null | undefined): string[] {
  if (!address) return [];
  const region = [address.city, address.state, address.postal_code].filter(Boolean).join(", ");
  return [address.line1, address.line2, region, address.country]
    .filter((line): line is string => Boolean(line && line.trim()))
    .map((line) => line.trim());
}

function VitalsSummary({ vitals }: { vitals: Vitals }) {
  const pressure =
    vitals.systolic_mmhg !== null && vitals.systolic_mmhg !== undefined
      ? `${vitals.systolic_mmhg}/${vitals.diastolic_mmhg ?? "—"}`
      : "—";
  return (
    <div>
      <p className="text-small text-muted">Measured {formatDateTime(vitals.measured_at)}</p>
      <dl className="mt-3 grid grid-cols-3 gap-2">
        <Metric label="Temp" value={vitals.temperature_c} unit="°C" />
        <Metric label="Pulse" value={vitals.pulse_bpm} unit="bpm" />
        <Metric label="BP" value={pressure} unit="mmHg" />
        <Metric label="Weight" value={vitals.weight_kg} unit="kg" />
        <Metric label="Height" value={vitals.height_cm} unit="cm" />
        <Metric label="BMI" value={vitals.bmi} unit="" />
      </dl>
      {vitals.warnings.length > 0 ? (
        <ul className="mt-3 space-y-1">
          {vitals.warnings.map((warning) => (
            <li key={warning.field} className="text-small text-warning">
              {warning.message}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function Metric({ label, value, unit }: { label: string; value: number | string | null | undefined; unit: string }) {
  return (
    <div className="rounded-md bg-surface-2 px-2.5 py-2">
      <dt className="text-micro text-faint">{label}</dt>
      <dd className="mt-0.5 font-mono text-[0.9375rem] font-semibold tabular text-ink">
        {value === null || value === undefined || value === "" ? "—" : value}
        {unit ? <span className="ml-0.5 text-[0.6875rem] font-normal text-muted">{unit}</span> : null}
      </dd>
    </div>
  );
}
