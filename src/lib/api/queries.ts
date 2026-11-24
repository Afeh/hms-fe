import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";

import {
  attachmentsApi,
  patientsApi,
  tenantApi,
  visitsApi,
  vitalsApi,
  type PatientListParams,
} from "./endpoints";
import type {
  Attachment,
  AttachmentListResponse,
  Patient,
  PatientCreate,
  PatientListResponse,
  PatientUpdate,
  TenantConfig,
  Visit,
  VisitCreate,
  VisitListResponse,
  VisitUpdate,
  Vitals,
  VitalsCreate,
  VitalsListResponse,
} from "@/types/api";

/** A single entity plus the version metadata needed for `If-Match`. */
export interface Versioned<T> {
  entity: T;
  etag: string | null;
}

export const queryKeys = {
  patient: (id: string) => ["patient", id] as const,
  patients: (filters: PatientListParams) => ["patients", filters] as const,
  visits: (patientId: string) => ["visits", patientId] as const,
  visit: (id: string) => ["visit", id] as const,
  vitals: (patientId: string, visitId?: string | null) =>
    ["vitals", patientId, visitId ?? "all"] as const,
  attachments: (visitId: string) => ["attachments", visitId] as const,
  tenantConfig: ["tenant-config"] as const,
};

export function useTenantConfig(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.tenantConfig,
    queryFn: () => tenantApi.config(),
    enabled,
    staleTime: 5 * 60_000,
    retry: false,
  });
}

export function usePatients(filters: PatientListParams) {
  return useInfiniteQuery<
    PatientListResponse,
    Error,
    InfiniteData<PatientListResponse>,
    readonly unknown[],
    string | null
  >({
    queryKey: queryKeys.patients(filters),
    queryFn: ({ pageParam }) => patientsApi.list({ ...filters, cursor: pageParam }).then((r) => r.data),
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
  });
}

export function usePatient(patientId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.patient(patientId),
    queryFn: async (): Promise<Versioned<Patient>> => {
      const result = await patientsApi.get(patientId);
      return { entity: result.data.patient, etag: result.etag };
    },
    enabled: enabled && Boolean(patientId),
  });
}

export function useUploadPatientPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { patientId: string; file: File }) =>
      patientsApi.uploadPhoto(input.patientId, input.file),
    onSuccess: (result, input) => {
      queryClient.setQueryData<Versioned<Patient>>(queryKeys.patient(input.patientId), (current) =>
        current ? { ...current, entity: result.data.patient } : current,
      );
      void queryClient.invalidateQueries({ queryKey: ["patients"] });
    },
  });
}

export function useDeletePatientPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { patientId: string }) => patientsApi.deletePhoto(input.patientId),
    onSuccess: (result, input) => {
      queryClient.setQueryData<Versioned<Patient>>(queryKeys.patient(input.patientId), (current) =>
        current ? { ...current, entity: result.data.patient } : current,
      );
      void queryClient.invalidateQueries({ queryKey: ["patients"] });
    },
  });
}

export function useCreatePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: PatientCreate) => patientsApi.create(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["patients"] });
    },
  });
}

export function useUpdatePatient(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { body: PatientUpdate; etag: string | null; version?: number }) =>
      patientsApi.update(patientId, input.body, input.etag, input.version),
    onSuccess: (result) => {
      queryClient.setQueryData<Versioned<Patient>>(queryKeys.patient(patientId), {
        entity: result.data.patient,
        etag: result.etag,
      });
      void queryClient.invalidateQueries({ queryKey: ["patients"] });
    },
  });
}

export function usePatientVisits(patientId: string) {
  return useInfiniteQuery<
    VisitListResponse,
    Error,
    InfiniteData<VisitListResponse>,
    readonly unknown[],
    string | null
  >({
    queryKey: queryKeys.visits(patientId),
    queryFn: ({ pageParam }) =>
      visitsApi.listForPatient(patientId, { limit: 25, cursor: pageParam }).then((r) => r.data),
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
  });
}

export function useVisit(visitId: string) {
  return useQuery({
    queryKey: queryKeys.visit(visitId),
    queryFn: async (): Promise<Versioned<Visit>> => {
      const result = await visitsApi.get(visitId);
      return { entity: result.data.visit, etag: result.etag };
    },
  });
}

export function useCreateVisit(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: VisitCreate) => visitsApi.create(patientId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.visits(patientId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.patient(patientId) });
      void queryClient.invalidateQueries({ queryKey: ["patients"] });
    },
  });
}

export function useUpdateVisit(visitId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { body: VisitUpdate; etag: string | null; version?: number }) =>
      visitsApi.update(visitId, input.body, input.etag, input.version),
    onSuccess: (result) => {
      queryClient.setQueryData<Versioned<Visit>>(queryKeys.visit(visitId), {
        entity: result.data.visit,
        etag: result.etag,
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.visits(result.data.visit.patient_id) });
    },
  });
}

export function useCloseVisit(visitId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { etag: string | null; version?: number }) =>
      visitsApi.close(visitId, input.etag, input.version),
    onSuccess: (result) => {
      queryClient.setQueryData<Versioned<Visit>>(queryKeys.visit(visitId), {
        entity: result.data.visit,
        etag: result.etag,
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.visits(result.data.visit.patient_id) });
    },
  });
}

export function usePatientVitals(patientId: string, visitId?: string | null) {
  return useInfiniteQuery<
    VitalsListResponse,
    Error,
    InfiniteData<VitalsListResponse>,
    readonly unknown[],
    string | null
  >({
    queryKey: queryKeys.vitals(patientId, visitId),
    queryFn: ({ pageParam }) =>
      vitalsApi
        .listForPatient(patientId, { limit: 25, cursor: pageParam, visit_id: visitId })
        .then((r) => r.data),
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
  });
}

export function useRecordVitals(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { visitId: string; body: VitalsCreate }) =>
      vitalsApi.record(input.visitId, input.body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["vitals", patientId] });
      void queryClient.invalidateQueries({ queryKey: ["visit"] });
    },
  });
}

export function useVitalsEnteredInError(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { vitalsId: string; reason: string }) =>
      vitalsApi.markEnteredInError(input.vitalsId, input.reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["vitals", patientId] });
    },
  });
}

export function useVisitAttachments(visitId: string, enabled = true) {
  return useInfiniteQuery<
    AttachmentListResponse,
    Error,
    InfiniteData<AttachmentListResponse>,
    readonly unknown[],
    string | null
  >({
    queryKey: queryKeys.attachments(visitId),
    queryFn: ({ pageParam }) =>
      attachmentsApi.list(visitId, { limit: 25, cursor: pageParam }).then((r) => r.data),
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    enabled: enabled && Boolean(visitId),
  });
}

export function useUploadAttachment(visitId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { file: File; caption?: string }) =>
      attachmentsApi.upload(visitId, input.file, input.caption),
    onSuccess: (result) => {
      queryClient.setQueryData<InfiniteData<AttachmentListResponse>>(
        queryKeys.attachments(visitId),
        (current) => {
          if (!current) return current;
          const [first, ...rest] = current.pages;
          if (!first) return current;
          const nextFirst: AttachmentListResponse = {
            ...first,
            attachments: [...first.attachments, result.data.attachment],
          };
          return { ...current, pages: [nextFirst, ...rest] };
        },
      );
    },
  });
}

export function useAttachmentRefresh(visitId: string) {
  const queryClient = useQueryClient();
  return async (attachment: Attachment): Promise<string | null> => {
    try {
      const result = await attachmentsApi.downloadUrl(visitId, attachment._id);
      const url = result.data.download.url;
      queryClient.setQueryData<InfiniteData<AttachmentListResponse>>(
        queryKeys.attachments(visitId),
        (current) => {
          if (!current) return current;
          return {
            ...current,
            pages: current.pages.map((page) => ({
              ...page,
              attachments: page.attachments.map((item) =>
                item._id === attachment._id
                  ? {
                      ...item,
                      download_url: url,
                      download_expires_at: result.data.download.expires_at,
                    }
                  : item,
              ),
            })),
          };
        },
      );
      return url;
    } catch {
      return null;
    }
  };
}

export type { Attachment, TenantConfig, Visit, Vitals };
