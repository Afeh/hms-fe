import { Link, useParams } from "react-router-dom";
import { CalendarClock, ChevronRight, Stethoscope } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ForbiddenState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { VisitStatusBadge } from "@/components/ui/badge";
import { usePatientVisits } from "@/lib/api/queries";
import { GatedButton, usePermission } from "@/lib/permissions/Can";
import { ApiError } from "@/lib/api/client";
import { formatDate } from "@/lib/utils";

export default function PatientVisitsTab() {
  const { patientId = "" } = useParams();
  const { has } = usePermission();
  const query = usePatientVisits(patientId);
  const visits = query.data?.pages.flatMap((page) => page.visits) ?? [];

  if (!has("visit:read")) {
    return <ForbiddenState help="Viewing visits needs the visit:read permission." />;
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-h2 text-ink">Visits</h2>
        {has("visit:create") ? (
          <Link
            to={`/patients/${patientId}?startVisit=1`}
            className="inline-flex h-9 items-center rounded-md bg-brand-700 px-3 text-small font-semibold text-white hover:bg-brand-600"
          >
            New visit
          </Link>
        ) : (
          <GatedButton permission="visit:create" size="sm">
            New visit
          </GatedButton>
        )}
      </div>

      <Card className="overflow-hidden">
        {query.isPending ? (
          <div className="divide-y divide-line" aria-busy="true">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="px-5 py-4">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="mt-2 h-3 w-64" />
              </div>
            ))}
          </div>
        ) : query.isError ? (
          <EmptyState
            title="Visits could not load"
            help={query.error instanceof ApiError ? query.error.message : "Please try again."}
            action={
              <Button variant="secondary" onClick={() => void query.refetch()}>
                Try again
              </Button>
            }
          />
        ) : visits.length === 0 ? (
          <EmptyState
            icon={Stethoscope}
            title="No visits yet"
            help="Open a visit to record clinical details, vitals and images for this patient."
            action={
              has("visit:create") ? (
                <Button asChild>
                  <Link to={`/patients/${patientId}?startVisit=1`}>Start a visit</Link>
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <ul className="divide-y divide-line">
              {visits.map((visit) => (
                <li key={visit._id}>
                  <Link
                    to={`/visits/${visit._id}`}
                    className="flex items-center gap-3 px-4 py-4 transition-colors hover:bg-surface-2 sm:px-5"
                  >
                    <span
                      aria-hidden
                      className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-md bg-surface-2 text-muted sm:flex"
                    >
                      <CalendarClock className="h-4 w-4" strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[0.9375rem] font-semibold capitalize text-ink">
                          {visit.type} visit
                        </p>
                        <VisitStatusBadge status={visit.status} />
                      </div>
                      <p className="mt-0.5 truncate text-small font-normal text-muted">
                        {formatDate(visit.visit_date)} · {visit.attending_clinician.name}
                        {visit.reason_for_visit ? ` · ${visit.reason_for_visit}` : ""}
                      </p>
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
                  Load more visits
                </Button>
              </div>
            ) : null}
          </>
        )}
      </Card>
    </div>
  );
}
