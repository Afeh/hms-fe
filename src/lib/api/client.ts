import type { Envelope, ErrorData, ErrorDetail } from "@/types/api";

const RAW_BASE = ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "").replace(/\/$/, "");
// Accept either the API origin or the full `/api/v1` base in the env var.
const API_BASE = RAW_BASE.endsWith("/api/v1") ? RAW_BASE : `${RAW_BASE}/api/v1`;

/** Access token lives in memory only (guide §12): never localStorage. */
let accessToken: string | null = null;
let refreshInFlight: Promise<string | null> | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields: ErrorDetail[];
  readonly requestId?: string;
  readonly data?: ErrorData;

  constructor(
    status: number,
    message: string,
    code = "request_failed",
    fields: ErrorDetail[] = [],
    data?: ErrorData,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
    this.requestId = data?.request_id;
    this.data = data;
  }

  get isConflict(): boolean {
    return this.status === 412;
  }
  get isForbidden(): boolean {
    return this.status === 403;
  }
  get isNotFound(): boolean {
    return this.status === 404;
  }
  get isNetwork(): boolean {
    return this.status === 0;
  }
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  query?: Record<string, string | number | boolean | null | undefined>;
  body?: unknown;
  formData?: FormData;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /** Skip the silent-refresh retry (used by auth endpoints themselves). */
  skipRefresh?: boolean;
}

export interface ApiResult<T> {
  data: T;
  message: string;
  status: number;
  etag: string | null;
}

export function apiUrl(path: string, query?: RequestOptions["query"]): string {
  return buildUrl(path, query);
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = `${API_BASE}${path}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }
  const search = params.toString();
  return search ? `${url}?${search}` : url;
}

async function attemptRefresh(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!response.ok) return null;
      const payload = (await response.json()) as Envelope<{ access_token: string }>;
      const token = payload?.data?.access_token ?? null;
      accessToken = token;
      return token;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

function isEnvelope(value: unknown): value is Envelope<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    "status" in value &&
    "data" in value &&
    "status_code" in value
  );
}

async function parseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }
  const text = await response.text().catch(() => "");
  return text ? { message: text } : null;
}

async function send<T>(path: string, options: RequestOptions): Promise<ApiResult<T>> {
  const { method = "GET", query, body, formData, headers = {}, signal } = options;
  const requestHeaders: Record<string, string> = { Accept: "application/json", ...headers };
  if (accessToken) requestHeaders.Authorization = `Bearer ${accessToken}`;
  if (body !== undefined && !formData) requestHeaders["Content-Type"] = "application/json";

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      credentials: "include",
      headers: requestHeaders,
      body: formData ?? (body === undefined ? undefined : JSON.stringify(body)),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(
      0,
      "We could not reach the server. Check your connection and try again.",
      "network_error",
    );
  }

  const payload = await parseBody(response);

  if (response.status === 401) {
    if (!options.skipRefresh) {
      const token = await attemptRefresh();
      if (token) return send<T>(path, { ...options, skipRefresh: true });
    }
    // A failed login is a normal form error, not an expired session.
    if (!path.startsWith("/auth/login") && !path.startsWith("/auth/refresh")) {
      onUnauthorized?.();
    }
  }

  if (!response.ok || (isEnvelope(payload) && payload.status === "error")) {
    const envelope = isEnvelope(payload) ? payload : null;
    const data = (envelope?.data ?? {}) as ErrorData;
    const messageFromText =
      !envelope && payload && typeof payload === "object" && "message" in payload
        ? String((payload as { message?: unknown }).message ?? "")
        : "";
    throw new ApiError(
      response.status,
      envelope?.message || messageFromText || fallbackMessage(response.status),
      typeof data.code === "string" ? data.code : "request_failed",
      Array.isArray(data.errors) ? (data.errors as ErrorDetail[]) : [],
      data,
    );
  }

  const data = isEnvelope(payload) ? (payload.data as T) : (payload as T);
  return {
    data,
    message: isEnvelope(payload) ? payload.message : "",
    status: response.status,
    etag: response.headers.get("ETag"),
  };
}

function fallbackMessage(status: number): string {
  if (status === 403) return "You do not have access to this action.";
  if (status === 404) return "We could not find that record.";
  if (status === 409) return "This record is no longer in a state that allows that change.";
  if (status === 412) return "This record was updated by someone else.";
  if (status === 413) return "That file is too large.";
  if (status === 429) return "Too many attempts. Please wait a moment and try again.";
  if (status >= 500) return "The server ran into a problem. Please try again.";
  return "Something went wrong. Please try again.";
}

export const api = {
  request: send,

  get<T>(path: string, options: Omit<RequestOptions, "method" | "body" | "formData"> = {}) {
    return send<T>(path, { ...options, method: "GET" });
  },
  post<T>(path: string, body?: unknown, options: RequestOptions = {}) {
    return send<T>(path, { ...options, method: "POST", body: body ?? {} });
  },
  patch<T>(path: string, body: unknown, options: RequestOptions = {}) {
    return send<T>(path, { ...options, method: "PATCH", body });
  },
  upload<T>(path: string, formData: FormData, options: RequestOptions = {}) {
    return send<T>(path, { ...options, method: "POST", formData });
  },
};

/** `If-Match` accepts a quoted integer version, e.g. `"4"`. */
export function ifMatch(etag: string | null, fallbackVersion?: number): string | undefined {
  if (etag) return etag;
  if (typeof fallbackVersion === "number") return `"${fallbackVersion}"`;
  return undefined;
}

export function messageOf(error: unknown, fallback = "Something went wrong."): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
