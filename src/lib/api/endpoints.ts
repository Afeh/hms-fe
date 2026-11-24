import { api, apiUrl, ifMatch, type ApiResult } from "./client";
import type {
  Attachment,
  AttachmentListResponse,
  CaptureSession,
  DownloadUrl,
  LoginResponse,
  LogoutResponse,
  MeResponse,
  Patient,
  PatientCreate,
  PatientListResponse,
  PatientUpdate,
  RefreshResponse,
  TenantConfig,
  TenantProfile,
  Visit,
  VisitCreate,
  VisitListResponse,
  VisitUpdate,
  Vitals,
  VitalsCreate,
  VitalsListResponse,
} from "@/types/api";

export interface PageParams {
  limit?: number;
  cursor?: string | null;
}

export interface PatientListParams extends PageParams {
  status?: string | null;
  registered_from?: string | null;
  registered_to?: string | null;
  sort?: "registration_date" | "-registration_date" | "name" | "-name";
}

export const authApi = {
  login: (email: string, password: string, deviceLabel?: string) =>
    api.post<LoginResponse>(
      "/auth/login",
      { email, password, device_label: deviceLabel || null },
      { skipRefresh: true },
    ),
  me: () => api.get<MeResponse>("/auth/me"),
  logout: () => api.post<LogoutResponse>("/auth/logout", {}, { skipRefresh: true }),
  refresh: () => api.post<RefreshResponse>("/auth/refresh", {}, { skipRefresh: true }),
};

export const tenantApi = {
  profile: () => api.get<{ tenant: TenantProfile }>("/tenant"),
  config: () => api.get<{ config: TenantConfig }>("/tenant/config"),
};

export const patientsApi = {
  list: (params: PatientListParams, signal?: AbortSignal) =>
    api.get<PatientListResponse>("/patients", {
      query: {
        status: params.status,
        registered_from: params.registered_from,
        registered_to: params.registered_to,
        sort: params.sort,
        limit: params.limit ?? 25,
        cursor: params.cursor,
      },
      signal,
    }),
  get: (patientId: string) => api.get<{ patient: Patient }>(`/patients/${patientId}`),
  create: (body: PatientCreate) => api.post<{ patient: Patient }>("/patients", body),
  update: (patientId: string, body: PatientUpdate, etag: string | null, version?: number) =>
    api.patch<{ patient: Patient }>(`/patients/${patientId}`, body, {
      headers: matchHeader(etag, version),
    }),
  uploadPhoto: (patientId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.upload<{ patient: Patient }>(`/patients/${patientId}/photo`, formData);
  },
  deletePhoto: (patientId: string) =>
    api.request<{ patient: Patient }>(`/patients/${patientId}/photo`, { method: "DELETE" }),
  /** Authenticated URL for a patient's photo; the version busts the browser cache. */
  photoUrl: (patient: Pick<Patient, "_id" | "photo_updated_at">) =>
    apiUrl(`/patients/${patient._id}/photo`, { v: patient.photo_updated_at ?? undefined }),
};

export const visitsApi = {
  listForPatient: (patientId: string, params: PageParams) =>
    api.get<VisitListResponse>(`/patients/${patientId}/visits`, {
      query: { limit: params.limit ?? 25, cursor: params.cursor },
    }),
  create: (patientId: string, body: VisitCreate) =>
    api.post<{ visit: Visit }>(`/patients/${patientId}/visits`, body),
  get: (visitId: string) => api.get<{ visit: Visit }>(`/visits/${visitId}`),
  update: (visitId: string, body: VisitUpdate, etag: string | null, version?: number) =>
    api.patch<{ visit: Visit }>(`/visits/${visitId}`, body, {
      headers: matchHeader(etag, version),
    }),
  close: (visitId: string, etag: string | null, version?: number) =>
    api.post<{ visit: Visit }>(
      `/visits/${visitId}/close`,
      { force: false },
      { headers: matchHeader(etag, version) },
    ),
};

export const vitalsApi = {
  listForPatient: (patientId: string, params: PageParams & { visit_id?: string | null }) =>
    api.get<VitalsListResponse>(`/patients/${patientId}/vitals`, {
      query: { limit: params.limit ?? 25, cursor: params.cursor, visit_id: params.visit_id },
    }),
  record: (visitId: string, body: VitalsCreate) =>
    api.post<{ vitals: Vitals }>(`/visits/${visitId}/vitals`, body),
  markEnteredInError: (vitalsId: string, reason: string) =>
    api.patch<{ vitals: Vitals }>(`/vitals/${vitalsId}`, { status: "entered_in_error", reason }),
};

export const attachmentsApi = {
  list: (visitId: string, params: PageParams) =>
    api.get<AttachmentListResponse>(`/visits/${visitId}/attachments`, {
      query: { limit: params.limit ?? 25, cursor: params.cursor },
    }),
  upload: (visitId: string, file: File, caption?: string) => {
    const formData = new FormData();
    formData.append("file", file);
    if (caption) formData.append("caption", caption);
    return api.upload<{ attachment: Attachment }>(
      `/visits/${visitId}/attachments`,
      formData,
    );
  },
  downloadUrl: (visitId: string, attachmentId: string) =>
    api.get<{ download: DownloadUrl }>(`/visits/${visitId}/attachments/${attachmentId}/url`),
  createCaptureSession: (visitId: string) =>
    api.post<{ session: CaptureSession }>(`/visits/${visitId}/capture-sessions`),
  revokeCaptureSession: (visitId: string, sessionId: string) =>
    api.request<{ revoked: boolean }>(`/visits/${visitId}/capture-sessions/${sessionId}`, {
      method: "DELETE",
    }),
};

function matchHeader(etag: string | null, version?: number): Record<string, string> {
  const value = ifMatch(etag, version);
  return value ? { "If-Match": value } : {};
}

export type { ApiResult };
