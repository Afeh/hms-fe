/**
 * Types mirroring the backend OpenAPI contract in `hms-be/openapi.json`.
 * Field names follow the wire format, including the `_id` alias on responses.
 */

export type ApiStatus = "success" | "error";

export interface Envelope<T> {
  status: ApiStatus;
  status_code: number;
  message: string;
  data: T;
}

export interface ErrorDetail {
  field: string;
  message: string;
}

export interface ErrorData {
  code?: string;
  request_id?: string;
  errors?: ErrorDetail[];
  [key: string]: unknown;
}

export type PatientSex = "male" | "female" | "other" | "unknown";
export type PatientStatus = "active" | "inactive" | "deceased";
export type VisitStatus = "open" | "closed" | "cancelled";
export type VitalsStatus = "active" | "entered_in_error";
export type AttachmentStatus = "pending" | "uploaded";

export interface NameSchema {
  given: string[];
  family: string;
  other?: string | null;
}

export interface RoleSummary {
  _id: string;
  key: string;
  name: string;
  mfa_required: boolean;
}

export interface PatientName {
  given: string[];
  family: string;
  other?: string | null;
}

export interface PatientAddress {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
}

export interface NextOfKin {
  name: string;
  relationship?: string | null;
  phone?: string | null;
}

export interface Payer {
  name?: string | null;
  scheme?: string | null;
  member_number?: string | null;
}

export interface Patient {
  _id: string;
  tenant_id: string;
  patient_number: string;
  status: PatientStatus;
  name: PatientName;
  date_of_birth: string;
  dob_approximate: boolean;
  sex: PatientSex;
  phones: string[];
  address?: PatientAddress | null;
  next_of_kin: NextOfKin[];
  registration_date: string;
  payer?: Payer | null;
  care_team: string[];
  legacy_number?: string | null;
  paper_file: boolean;
  display_name: string;
  age_years: number;
  last_visit_date?: string | null;
  has_photo: boolean;
  photo_updated_at?: string | null;
  version: number;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface PatientListItem {
  _id: string;
  patient_number: string;
  display_name: string;
  date_of_birth: string;
  sex: PatientSex;
  status: PatientStatus;
  phones: string[];
  registration_date: string;
  last_visit_date?: string | null;
  has_photo: boolean;
  photo_updated_at?: string | null;
  version: number;
}

export interface PatientListResponse {
  patients: PatientListItem[];
  next_cursor?: string | null;
}

export interface PatientCreate {
  name: PatientName;
  date_of_birth: string;
  dob_approximate?: boolean;
  sex?: PatientSex;
  phones?: string[];
  address?: PatientAddress | null;
  next_of_kin?: NextOfKin[];
  payer?: Payer | null;
  legacy_number?: string | null;
  paper_file?: boolean;
}

export interface PatientUpdate {
  name?: PatientName;
  phones?: string[];
  address?: PatientAddress | null;
  next_of_kin?: NextOfKin[] | null;
  payer?: Payer | null;
  paper_file?: boolean;
}

export interface ClinicianRef {
  _id: string;
  name: string;
}

export interface Visit {
  _id: string;
  patient_id: string;
  type: string;
  visit_date: string;
  status: VisitStatus;
  attending_clinician: ClinicianRef;
  reason_for_visit?: string | null;
  vitals: Vitals[];
  closed_at?: string | null;
  closed_by?: string | null;
  version: number;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface VisitListResponse {
  visits: Visit[];
  next_cursor?: string | null;
}

export interface VisitCreate {
  type: string;
  visit_date?: string;
  attending_clinician_id: string;
  reason_for_visit?: string | null;
}

export interface VisitUpdate {
  type?: string;
  visit_date?: string;
  attending_clinician_id?: string;
  reason_for_visit?: string | null;
}

export interface VitalWarning {
  field: string;
  value: number;
  message: string;
}

export interface Vitals {
  _id: string;
  patient_id: string;
  visit_id: string;
  measured_at: string;
  recorded_by?: string | null;
  recorded_by_name?: string | null;
  temperature_c?: number | null;
  pulse_bpm?: number | null;
  systolic_mmhg?: number | null;
  diastolic_mmhg?: number | null;
  weight_kg?: number | null;
  height_cm?: number | null;
  bmi?: number | null;
  warnings: VitalWarning[];
  status: VitalsStatus;
  entered_in_error_reason?: string | null;
  version: number;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface VitalsListResponse {
  vitals: Vitals[];
  next_cursor?: string | null;
}

export interface VitalsCreate {
  measured_at?: string;
  temperature_c?: number | null;
  pulse_bpm?: number | null;
  systolic_mmhg?: number | null;
  diastolic_mmhg?: number | null;
  weight_kg?: number | null;
  height_cm?: number | null;
  acknowledge_warnings?: boolean;
}

export interface Attachment {
  _id: string;
  visit_id: string;
  patient_id: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  status: AttachmentStatus;
  caption?: string | null;
  download_url?: string | null;
  download_expires_at?: string | null;
  uploaded_at?: string | null;
  uploaded_by?: string | null;
  version: number;
  created_at?: string | null;
}

export interface AttachmentListResponse {
  attachments: Attachment[];
  next_cursor?: string | null;
}

export interface DownloadUrl {
  url: string;
  expires_at: string;
}

/** A short-lived link a phone can use to add images to one visit. */
export interface CaptureSession {
  id: string;
  token: string;
  visit_id: string;
  expires_at: string;
  uploads: number;
}

export interface CaptureSessionStatus {
  visit_id: string;
  patient_name: string;
  patient_number: string;
  visit_type: string;
  visit_date: string;
  expires_at: string;
  uploads: number;
  visit_open: boolean;
}

export interface TenantProfile {
  _id: string;
  name: string;
  slug: string;
  code?: string | null;
  status: string;
  plan: string;
  timezone: string;
  country?: string | null;
  legal_hold: boolean;
}

export interface MeUser {
  _id: string;
  email: string;
  name: NameSchema;
  phone?: string | null;
  is_verified: boolean;
  mfa_enabled: boolean;
  tenant_id: string;
  status: string;
  display_name?: string | null;
  last_login_at?: string | null;
  created_at?: string | null;
}

export interface MeResponse {
  user: MeUser;
  roles: RoleSummary[];
  permissions: string[];
  tenant: TenantProfile;
  perm_version: number;
}

export interface LoginUser {
  _id: string;
  email: string;
  name: NameSchema;
  is_verified: boolean;
  tenant_id: string;
  roles: RoleSummary[];
  permissions: string[];
  created_at?: string | null;
}

export interface LoginResponse {
  mfa_required: boolean;
  access_token: string;
  expires_in: number;
  refresh_token: string;
  refresh_expires_at: string;
  user: LoginUser;
}

export interface RefreshResponse {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  refresh_expires_at: string;
}

export interface LogoutResponse {
  signed_out: boolean;
}

export interface TenantConfig {
  tenant_id: string;
  version: number;
  branding: {
    display_name?: string | null;
    logo_url?: string | null;
    favicon_url?: string | null;
    primary_color?: string | null;
    primary_colour?: string | null;
    support_email?: string | null;
  };
  modules: Record<string, boolean>;
  patient_id_format: {
    prefix: string;
    pattern: string;
    sequence_start: number;
    reset_sequence: string;
  };
  document_types: Array<Record<string, unknown>>;
  visit_types: Array<{ key?: string; label?: string; active?: boolean; enabled?: boolean }>;
  ai: Record<string, unknown>;
  security: {
    idle_timeout_min: number;
    absolute_timeout_hours: number;
    password_min_length: number;
    break_glass_minutes: number;
  };
  retention: Record<string, number | null>;
}

export interface DownloadEnvelope {
  download: DownloadUrl;
}
