const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ?? 'http://localhost:3001/api';

type ApiErrorPayload = {
  message?: string | string[];
};

function normalizeApiMessage(payload: ApiErrorPayload | null, fallback: string) {
  if (!payload?.message) {
    return fallback;
  }

  return Array.isArray(payload.message) ? payload.message.join(' ') : payload.message;
}

async function apiRequest<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST';
    body?: unknown;
    token?: string | null;
  } = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: typeof options.body === 'undefined' ? undefined : JSON.stringify(options.body),
    cache: 'no-store',
  });

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as T | ApiErrorPayload) : null;

  if (!response.ok) {
    throw new Error(
      normalizeApiMessage(payload as ApiErrorPayload | null, 'La solicitud al backend fallo.'),
    );
  }

  return payload as T;
}

export type RequestPrimaryAdminChangePayload = {
  currentPassword: string;
  newEmail: string;
  newPassword: string;
  confirmNewPassword: string;
};

export type PrimaryAdminChangeSummary = {
  id: string;
  currentAdminEmail: string;
  newAdminEmail: string;
  requestedAt: string;
  expiresAt: string;
};

export type PrimaryAdminChangeStatusResponse = {
  hasPendingRequest: boolean;
  request: PrimaryAdminChangeSummary | null;
};

export async function fetchPrimaryAdminChangeStatus(token: string) {
  return apiRequest<PrimaryAdminChangeStatusResponse>('/admin/security/primary-admin-change', {
    token,
  });
}

export async function requestPrimaryAdminChange(
  token: string,
  payload: RequestPrimaryAdminChangePayload,
) {
  return apiRequest<{
    message: string;
    request: PrimaryAdminChangeSummary;
    delivery: {
      mode: 'smtp' | 'development-preview';
      previewUrl?: string;
    };
  }>('/admin/security/primary-admin-change/request', {
    method: 'POST',
    body: payload,
    token,
  });
}

export async function fetchPrimaryAdminChangeApproval(token: string) {
  return apiRequest<{
    message: string;
    request: PrimaryAdminChangeSummary;
  }>(`/admin/security/primary-admin-change/approve?token=${encodeURIComponent(token)}`);
}

export async function approvePrimaryAdminChange(token: string) {
  return apiRequest<{
    message: string;
    request: {
      previousAdminEmail: string;
      newAdminEmail: string;
      approvedAt: string;
    };
  }>('/admin/security/primary-admin-change/approve', {
    method: 'POST',
    body: { token },
  });
}
