import * as React from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronRight, MoreHorizontal, Search, UserPlus, Users, X } from "lucide-react";

import { Badge, PatientStatusBadge } from "@/components/ui/badge";
import { Button, IconButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ForbiddenState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Menu, MenuItem, MenuLabel } from "@/components/ui/menu";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/features/shell/AppShell";
import { PatientAvatar } from "./PatientAvatar";
import { PatientFormDrawer } from "./PatientFormDrawer";
import { usePatients } from "@/lib/api/queries";
import { usePermission, GatedButton } from "@/lib/permissions/Can";
import { ageFromDob, cn, formatDate, formatRelative, sexLabel } from "@/lib/utils";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";

const STATUS_FILTERS = [
  { value: null, label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "deceased", label: "Deceased" },
] as const;

type Density = "comfortable" | "compact";

export default function PatientListPage() {
  const { has } = usePermission();
  const canRead = has("patient:read") || has("patient:read:all");
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [status, setStatus] = React.useState<string | null>(null);
  const [density, setDensity] = React.useState<Density>("comfortable");

  const query = usePatients({ limit: 25, status, sort: "-registration_date" });
  const loaded = query.data?.pages.flatMap((page) => page.patients) ?? [];

  const needle = debouncedSearch.trim().toLowerCase();
  const filtered = needle
    ? loaded.filter(
        (patient) =>
          patient.display_name.toLowerCase().includes(needle) ||
          patient.patient_number.toLowerCase().includes(needle) ||
          patient.phones.some((phone) => phone.includes(needle)),
      )
    : loaded;

  const createOpen = params.get("new") === "1";
  const setCreateOpen = (open: boolean) => {
    const next = new URLSearchParams(params);
    if (open) next.set("new", "1");
    else next.delete("new");
    setParams(next, { replace: true });
  };

  if (!canRead) {
    return (
      <>
        <PageHeader title="Patients" />
        <ForbiddenState help="Viewing the patient directory needs the patient:read permission." />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Patients"
        subtitle={
          query.data
            ? `${loaded.length}${query.hasNextPage ? "+" : ""} record${loaded.length === 1 ? "" : "s"} loaded`
            : "Patient directory"
        }
        actions={
          <GatedButton
            permission="patient:create"
            onClick={() => setCreateOpen(true)}
            leadingIcon={<UserPlus className="h-4 w-4" />}
          >
            New patient
          </GatedButton>
        }
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-[380px]">
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, patient number or phone"
            aria-label="Search loaded patients"
            className="pl-9 pr-10"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-faint hover:text-ink"
            >
              <X aria-hidden className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.label}
                type="button"
                aria-pressed={status === filter.value}
                onClick={() => setStatus(filter.value)}
                className={cn(
                  "h-9 rounded-pill border px-3 text-small font-semibold transition-colors",
                  status === filter.value
                    ? "border-brand-300 bg-brand-50 text-brand-700 dark:bg-surface-2 dark:text-brand-300"
                    : "border-line bg-surface text-muted hover:text-ink",
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <div className="hidden items-center gap-1 rounded-pill border border-line bg-surface p-0.5 md:flex">
            {(["comfortable", "compact"] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={density === option}
                onClick={() => setDensity(option)}
                className={cn(
                  "h-8 rounded-pill px-2.5 text-[0.75rem] font-semibold capitalize",
                  density === option ? "bg-surface-2 text-ink" : "text-faint hover:text-muted",
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>

      {needle ? (
        <p className="mb-3 text-small text-muted">
          Filtering the {loaded.length} loaded record{loaded.length === 1 ? "" : "s"}. Load more to
          widen the search.
        </p>
      ) : null}

      <Card className="overflow-hidden">
        {query.isPending ? (
          <ListSkeleton />
        ) : query.isError ? (
          <EmptyState
            title="Patients could not load"
            help={query.error instanceof Error ? query.error.message : "Please try again."}
            action={
              <Button variant="secondary" onClick={() => void query.refetch()}>
                Try again
              </Button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title={needle || status ? "No patients match" : "No patients yet"}
            help={
              needle || status
                ? "Try a different search or status filter, or load more records."
                : "Register the first patient to start the directory."
            }
            action={
              needle || status ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSearch("");
                    setStatus(null);
                  }}
                >
                  Clear filters
                </Button>
              ) : (
                <GatedButton permission="patient:create" onClick={() => setCreateOpen(true)}>
                  Register a patient
                </GatedButton>
              )
            }
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[760px] border-collapse text-left">
                <thead className="sticky top-0 z-10 bg-surface">
                  <tr className="border-b border-line">
                    {["Patient", "Patient number", "Age / sex", "Last visit", "Status", ""].map(
                      (heading, index) => (
                        <th
                          key={heading || index}
                          scope="col"
                          className="px-5 py-2.5 text-micro text-faint"
                        >
                          {heading}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((patient) => (
                    <tr
                      key={patient._id}
                      className="border-b border-line/70 transition-colors last:border-0 hover:bg-surface-2"
                    >
                      <td className={cn("px-5", density === "compact" ? "py-2" : "py-3.5")}>
                        <Link
                          to={`/patients/${patient._id}`}
                          className="flex items-center gap-3 rounded-sm"
                        >
                          <PatientAvatar patient={patient} size={density === "compact" ? "sm" : "md"} />
                          <span className="min-w-0">
                            <span className="block truncate text-[0.9375rem] font-semibold text-ink">
                              {patient.display_name}
                            </span>
                            <span className="block text-small font-normal text-muted md:hidden">
                              {formatDate(patient.date_of_birth)}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className={cn("px-5", density === "compact" ? "py-2" : "py-3.5")}>
                        <span className="font-mono text-small text-ink">{patient.patient_number}</span>
                      </td>
                      <td className={cn("px-5 text-[0.9375rem] text-muted", density === "compact" ? "py-2" : "py-3.5")}>
                        <span className="tabular">{ageFromDob(patient.date_of_birth)}</span> ·{" "}
                        {sexLabel(patient.sex)}
                      </td>
                      <td className={cn("px-5 text-small text-muted", density === "compact" ? "py-2" : "py-3.5")}>
                        {patient.last_visit_date ? (
                          <span title={formatDate(patient.last_visit_date)}>
                            {formatRelative(patient.last_visit_date)}
                          </span>
                        ) : (
                          <span className="text-faint">No visits</span>
                        )}
                      </td>
                      <td className={cn("px-5", density === "compact" ? "py-2" : "py-3.5")}>
                        <PatientStatusBadge status={patient.status} />
                      </td>
                      <td className={cn("px-3 text-right", density === "compact" ? "py-2" : "py-3.5")}>
                        <Menu
                          trigger={
                            <IconButton label={`Actions for ${patient.display_name}`} className="h-9 w-9">
                              <MoreHorizontal aria-hidden className="h-4 w-4" />
                            </IconButton>
                          }
                        >
                          <MenuLabel>{patient.patient_number}</MenuLabel>
                          <MenuItem onSelect={() => navigate(`/patients/${patient._id}`)}>
                            Open record
                          </MenuItem>
                          {has("visit:create") ? (
                            <MenuItem
                              onSelect={() => navigate(`/patients/${patient._id}?startVisit=1`)}
                            >
                              Start visit
                            </MenuItem>
                          ) : null}
                        </Menu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile stacked cards */}
            <ul className="divide-y divide-line md:hidden">
              {filtered.map((patient) => (
                <li key={patient._id}>
                  <Link
                    to={`/patients/${patient._id}`}
                    className="flex min-h-[64px] items-center gap-3 px-4 py-3"
                  >
                    <PatientAvatar patient={patient} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[0.9375rem] font-semibold text-ink">
                        {patient.display_name}
                      </p>
                      <p className="truncate text-small font-normal text-muted">
                        <span className="font-mono">{patient.patient_number}</span>
                        {" · "}
                        {patient.last_visit_date
                          ? `Last visit ${formatRelative(patient.last_visit_date)}`
                          : "No visits"}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <PatientStatusBadge status={patient.status} />
                        <Badge tone="neutral">
                          {ageFromDob(patient.date_of_birth)} · {sexLabel(patient.sex)}
                        </Badge>
                      </div>
                    </div>
                    <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-faint" />
                  </Link>
                </li>
              ))}
            </ul>

            {query.hasNextPage ? (
              <div className="flex justify-center border-t border-line px-4 py-4">
                <Button
                  variant="secondary"
                  onClick={() => void query.fetchNextPage()}
                  loading={query.isFetchingNextPage}
                >
                  {query.isFetchingNextPage ? "Loading…" : "Load more patients"}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </Card>

      <PatientFormDrawer
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(patient) => navigate(`/patients/${patient._id}`)}
      />
    </>
  );
}

function ListSkeleton() {
  return (
    <div className="divide-y divide-line" aria-busy="true">
      <span className="sr-only">Loading patients…</span>
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 px-5 py-4">
          <Skeleton className="h-10 w-10 rounded-pill" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="hidden h-5 w-20 rounded-pill sm:block" />
        </div>
      ))}
    </div>
  );
}
