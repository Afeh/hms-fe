import type { Attachment, CaptureSessionStatus } from "@/types/api";

import { apiUrl } from "./client";

/**
 * Unauthenticated calls for the phone capture page. They deliberately bypass the
 * app's API client: there is no session to refresh and no login redirect should
 * happen when a capture link is invalid or expired. The token in the path is the
 * credential.
 */
export class CaptureLinkError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "CaptureLinkError";
    this.status = status;
  }
}

interface Envelope<T> {
  status?: string;
  message?: string;
  data?: T;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(apiUrl(path), { credentials: "omit", ...init });
  } catch {
    throw new CaptureLinkError(
      0,
      "We could not reach the hospital system. Check the connection and try again.",
    );
  }

  const payload = (await response.json().catch(() => null)) as Envelope<T> | null;
  if (!response.ok || payload?.status === "error") {
    throw new CaptureLinkError(response.status, payload?.message || messageFor(response.status));
  }
  return (payload?.data ?? (payload as T)) as T;
}

function messageFor(status: number): string {
  if (status === 404) return "This photo link is not valid. Ask staff to create a new one.";
  if (status === 410) return "This photo link has expired or was closed. Ask staff for a new one.";
  if (status === 409) return "This visit is closed, so photos can no longer be added.";
  if (status === 413) return "That image is too large.";
  if (status === 415) return "Only JPEG, PNG, WebP or HEIC images are supported.";
  return "Something went wrong. Please try again.";
}

export const captureApi = {
  status: (token: string) => request<CaptureSessionStatus>(`/capture/${encodeURIComponent(token)}`),

  upload: (token: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return request<{ attachment: Attachment }>(
      `/capture/${encodeURIComponent(token)}/attachments`,
      { method: "POST", body: formData },
    );
  },

  close: (token: string) =>
    request<{ closed: boolean }>(`/capture/${encodeURIComponent(token)}`, { method: "DELETE" }),
};
