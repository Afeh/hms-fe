import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, ShieldCheck, UserPlus, Users } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { PageHeader } from "@/features/shell/AppShell";
import { usePatients } from "@/lib/api/queries";
import { useSession } from "@/lib/auth/SessionProvider";
import { Can, usePermission } from "@/lib/permissions/Can";
import { formatDate, formatRelative } from "@/lib/utils";

export default function DashboardPage() {
  const { session } = useSession();
  const { has } = usePermission();
  const canReadPatients = has("patient:read") || has("patient:read:all");
  const recent = usePatients({ limit: 5, sort: "-registration_date" });
  const patients = recent.data?.pages.flatMap((page) => page.patients) ?? [];

  const firstName = session?.user.name.given[0] ?? session?.user.display_name ?? "there";
  const greeting = greetingFor(new Date());

  return (
    <>
      <PageHeader
        title={`${greeting}, ${firstName}`}
        subtitle={`${session?.tenant.name} · ${formatDate(new Date().toISOString())}`}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-12 xl:gap-5">
        <Card className="gradient-soft md:col-span-2 xl:col-span-7">
          <CardBody className="p-5 sm:p-6">
            <p className="text-micro text-brand-700">Today</p>
            <h2 className="mt-2 max-w-[30ch] text-h2 text-ink">
              Keep the clinical day moving.
            </h2>
            <p className="mt-1.5 max-w-[52ch] text-[0.9375rem] text-muted">
              Register a patient, open a visit, or record vitals against an open visit.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Can permission="patient:create">
                <Button asChild leadingIcon={<UserPlus className="h-4 w-4" />}>
                  <Link to="/patients?new=1">New patient</Link>
                </Button>
              </Can>
              {canReadPatients ? (
                <Button asChild variant="secondary" leadingIcon={<Users className="h-4 w-4" />}>
                  <Link to="/patients">Patient directory</Link>
                </Button>
              ) : null}
            </div>
          </CardBody>
        </Card>

        <Card className="xl:col-span-5">
          <CardHeader title="Your access" subtitle="From your signed-in session" />
          <CardBody>
            <div className="flex flex-wrap gap-1.5">
              {session?.roles.length ? (
                session.roles.map((role) => (
                  <Badge key={role._id} tone="brand" icon={ShieldCheck}>
                    {role.name}
                  </Badge>
                ))
              ) : (
                <p className="text-small text-muted">No roles assigned.</p>
              )}
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-md bg-surface-2 px-3 py-2.5">
                <dt className="text-micro text-faint">Permissions</dt>
                <dd className="mt-0.5 font-mono text-h3 tabular text-ink">
                  {session?.permissions.length ?? 0}
                </dd>
              </div>
              <div className="rounded-md bg-surface-2 px-3 py-2.5">
                <dt className="text-micro text-faint">Tenant plan</dt>
                <dd className="mt-0.5 text-[0.9375rem] font-semibold capitalize text-ink">
                  {session?.tenant.plan ?? "—"}
                </dd>
              </div>
            </dl>
            {session?.user.mfa_enabled ? (
              <p className="mt-3 text-small text-muted">Multi-factor authentication is on.</p>
            ) : null}
          </CardBody>
        </Card>

        <Card className="md:col-span-2 xl:col-span-7">
          <CardHeader
            title="Recent patients"
            subtitle="Newest registrations in this hospital"
            action={
              canReadPatients ? (
                <Button asChild variant="ghost" size="sm">
                  <Link to="/patients" className="gap-1">
                    View all <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              ) : null
            }
          />
          <CardBody className="p-0 pb-2">
            {!canReadPatients ? (
              <EmptyState
                title="Patient records are not in your access"
                help="Ask a hospital administrator if you need to view the patient directory."
              />
            ) : recent.isPending ? (
              <ul className="space-y-3 px-5 pb-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-pill" />
                    <SkeletonText lines={2} className="flex-1" />
                  </li>
                ))}
              </ul>
            ) : recent.isError ? (
              <EmptyState
                title="Recent patients could not load"
                help={recent.error instanceof Error ? recent.error.message : "Please try again."}
                action={
                  <Button variant="secondary" size="sm" onClick={() => void recent.refetch()}>
                    Try again
                  </Button>
                }
              />
            ) : patients.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No patients yet"
                help="The first registration in this hospital will appear here."
                action={
                  <Can permission="patient:create">
                    <Button asChild leadingIcon={<UserPlus className="h-4 w-4" />}>
                      <Link to="/patients?new=1">Register a patient</Link>
                    </Button>
                  </Can>
                }
              />
            ) : (
              <ul className="divide-y divide-line">
                {patients.map((patient) => (
                  <li key={patient._id}>
                    <Link
                      to={`/patients/${patient._id}`}
                      className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-2"
                    >
                      <Avatar name={patient.display_name} seed={patient._id} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[0.9375rem] font-semibold text-ink">
                          {patient.display_name}
                        </p>
                        <p className="truncate text-small font-normal text-muted">
                          <span className="font-mono">{patient.patient_number}</span> ·{" "}
                          {patient.sex === "unknown" ? "Sex not recorded" : patient.sex}
                        </p>
                      </div>
                      <div className="hidden text-right sm:block">
                        <p className="text-small text-muted">
                          <CalendarDays aria-hidden className="mr-1 inline h-3.5 w-3.5" />
                          {formatRelative(patient.registration_date)}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card className="md:col-span-2 xl:col-span-5">
          <CardHeader title="Shortcuts" subtitle="Only what your permissions allow" />
          <CardBody className="space-y-2">
            <ShortcutLink to="/patients" label="Patient directory" />
            <Can permission="patient:create">
              <ShortcutLink to="/patients?new=1" label="Register a patient" />
            </Can>
            <div className="rounded-md border border-dashed border-line px-3 py-3 text-small text-muted">
              Open a patient record to start a visit, record vitals or manage images.
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  );
}

function ShortcutLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="flex h-11 items-center justify-between rounded-md border border-line px-3 text-small font-semibold text-ink transition-colors hover:border-brand-300 hover:bg-surface-2"
    >
      {label}
      <ArrowRight aria-hidden className="h-3.5 w-3.5 text-faint" />
    </Link>
  );
}

function greetingFor(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
