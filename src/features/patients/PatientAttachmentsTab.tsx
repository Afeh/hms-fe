import * as React from "react";
import { useParams } from "react-router-dom";
import { ImageOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState, ForbiddenState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AttachmentGallery } from "@/features/attachments/AttachmentGallery";
import { useAttachmentRefresh, usePatientVisits, useVisitAttachments } from "@/lib/api/queries";
import { usePermission } from "@/lib/permissions/Can";
import { ApiError } from "@/lib/api/client";
import { formatDate } from "@/lib/utils";

export default function PatientAttachmentsTab() {
  const { patientId = "" } = useParams();
  const { has } = usePermission();
  const visitsQuery = usePatientVisits(patientId);
  const visits = visitsQuery.data?.pages.flatMap((page) => page.visits) ?? [];
  const [visitId, setVisitId] = React.useState<string>("");

  React.useEffect(() => {
    if (!visitId && visits[0]) setVisitId(visits[0]._id);
  }, [visitId, visits]);

  const attachmentsQuery = useVisitAttachments(visitId, has("document:read"));
  const refreshUrl = useAttachmentRefresh(visitId);
  const attachments = attachmentsQuery.data?.pages.flatMap((page) => page.attachments) ?? [];

  if (!has("document:read")) {
    return <ForbiddenState help="Viewing images needs the document:read permission." />;
  }

  return (
    <div>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-h2 text-ink">Attachments</h2>
          <p className="mt-0.5 max-w-[70ch] text-small text-muted">
            Images belong to a visit. Choose a visit to review its images, or open the visit to add
            new ones.
          </p>
        </div>
        {visits.length > 0 ? (
          <label className="flex w-full flex-col gap-1.5 sm:w-[260px]">
            <span className="text-micro text-faint">Visit</span>
            <Select value={visitId} onChange={(event) => setVisitId(event.target.value)}>
              {visits.map((visit) => (
                <option key={visit._id} value={visit._id}>
                  {visit.type} · {formatDate(visit.visit_date)}
                </option>
              ))}
            </Select>
          </label>
        ) : null}
      </div>

      <Card>
        <CardHeader
          title="Visit images"
          subtitle={
            visitId
              ? has("document:capture")
                ? "Open the visit to upload more images."
                : undefined
              : undefined
          }
        />
        <CardBody>
          {visitsQuery.isPending ? (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <Skeleton key={index} className="aspect-square rounded-md" />
              ))}
            </div>
          ) : visits.length === 0 ? (
            <EmptyState
              icon={ImageOff}
              title="No visits to attach images to"
              help="Images are stored on visits. Open a visit first."
            />
          ) : attachmentsQuery.isPending && visitId ? (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="aspect-square rounded-md" />
              ))}
            </div>
          ) : attachmentsQuery.isError ? (
            <EmptyState
              title="Images could not load"
              help={
                attachmentsQuery.error instanceof ApiError
                  ? attachmentsQuery.error.message
                  : undefined
              }
              action={
                <Button variant="secondary" onClick={() => void attachmentsQuery.refetch()}>
                  Try again
                </Button>
              }
            />
          ) : (
            <>
              <AttachmentGallery attachments={attachments} onRefreshUrl={refreshUrl} />
              {attachmentsQuery.hasNextPage ? (
                <div className="mt-4 flex justify-center">
                  <Button
                    variant="secondary"
                    onClick={() => void attachmentsQuery.fetchNextPage()}
                    loading={attachmentsQuery.isFetchingNextPage}
                  >
                    Load more images
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
