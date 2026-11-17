import * as React from "react";
import { useParams } from "react-router-dom";
import { Activity } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ForbiddenState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { VitalsList } from "@/features/vitals/VitalsList";
import { RecordVitalsDialog } from "@/features/vitals/RecordVitalsDialog";
import { usePatientVisits, usePatientVitals, useVitalsEnteredInError } from "@/lib/api/queries";
import { GatedButton, usePermission } from "@/lib/permissions/Can";
import { ApiError } from "@/lib/api/client";

export default function PatientVitalsTab() {
  const { patientId = "" } = useParams();
  const { has } = usePermission();
  const query = usePatientVitals(patientId);
  const visitsQuery = usePatientVisits(patientId);
  const markError = useVitalsEnteredInError(patientId);
  const [recordOpen, setRecordOpen] = React.useState(false);

  const vitals = query.data?.pages.flatMap((page) => page.vitals) ?? [];
  const openVisits = (visitsQuery.data?.pages.flatMap((page) => page.visits) ?? []).filter(
    (visit) => visit.status === "open",
  );

  if (!has("visit:read")) {
    return <ForbiddenState help="Viewing vitals needs the visit:read permission." />;
  }

  return (
    <div>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-h2 text-ink">Vitals</h2>
          <p className="mt-0.5 text-small text-muted">
            {openVisits.length > 0
              ? `${openVisits.length} open visit${openVisits.length === 1 ? "" : "s"} ready for measurements`
              : "Open a visit before recording measurements"}
          </p>
        </div>
        <GatedButton
          permission="vitals:write"
          disabled={openVisits.length === 0 || visitsQuery.isPending}
          onClick={() => setRecordOpen(true)}
          leadingIcon={<Activity className="h-4 w-4" />}
        >
          Record vitals
        </GatedButton>
      </div>

      <Card className="overflow-hidden">
        {query.isPending ? (
          <div className="space-y-3 p-5" aria-busy="true">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-10" />
            ))}
          </div>
        ) : query.isError ? (
          <EmptyState
            title="Vitals could not load"
            help={query.error instanceof ApiError ? query.error.message : "Please try again."}
            action={
              <Button variant="secondary" onClick={() => void query.refetch()}>
                Try again
              </Button>
            }
          />
        ) : vitals.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No vitals recorded"
            help="Measurements are stored against an open visit and shown newest first."
            action={
              openVisits.length > 0 ? (
                <GatedButton permission="vitals:write" onClick={() => setRecordOpen(true)}>
                  Record the first measurement
                </GatedButton>
              ) : undefined
            }
          />
        ) : (
          <>
            <VitalsList
              vitals={vitals}
              markingError={markError.isPending}
              onMarkError={async (record, reason) => {
                await markError.mutateAsync({ vitalsId: record._id, reason });
              }}
            />
            {query.hasNextPage ? (
              <div className="flex justify-center border-t border-line px-4 py-4">
                <Button
                  variant="secondary"
                  onClick={() => void query.fetchNextPage()}
                  loading={query.isFetchingNextPage}
                >
                  Load more measurements
                </Button>
              </div>
            ) : null}
          </>
        )}
      </Card>

      <RecordVitalsDialog
        patientId={patientId}
        openVisits={openVisits}
        open={recordOpen}
        onOpenChange={setRecordOpen}
      />
    </div>
  );
}
