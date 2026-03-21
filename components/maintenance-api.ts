const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:3001/api";

type ApiErrorPayload = {
  message?: string | string[];
};

export type MaintenanceOverview = {
  environment: {
    nodeEnv: string;
    backendPublicBaseUrl: string;
    uploadsRoot: string;
    allowDestructiveActions: boolean;
  };
  counts: {
    roles: number;
    users: number;
    socios: number;
    admins: number;
    authorProfiles: number;
    works: number;
    purchases: number;
    fileAssets: number;
    uploadFilesOnDisk: number;
  };
  breakdown: {
    socioSegments: Array<{ label: string; total: number }>;
    purchaseStatuses: Array<{ status: string; total: number }>;
    workStatuses: Array<{ status: string; total: number }>;
    authorApplications: Array<{ status: string; total: number }>;
  };
  health: {
    usersWithoutRoles: { total: number; examples: string[] };
    usersWithAuthorRoleWithoutProfile: { total: number; examples: string[] };
    approvedAuthorWithoutRole: { total: number; examples: string[] };
    worksMissingRequiredAssets: {
      total: number;
      examples: Array<{ id: string; title: string; status: string }>;
    };
    fileAssetsMissingOnDisk: { total: number; examples: string[] };
    uploadsNotTracked: { total: number; examples: string[] };
  };
  admins: Array<{
    id: string;
    email: string;
    status: string;
    roles: string[];
    socioCategory: string;
  }>;
};

export type MaintenanceActionResponse = {
  ok: boolean;
  action: string;
  totalOrphans?: number;
  examples?: unknown[];
  removed?: number;
  preserveAdminUserIds?: string[];
  preservedAdminUserIds?: string[];
  usersToDelete?: number;
  worksToDelete?: number;
  purchasesToDelete?: number;
  fileAssetsToDelete?: number;
  uploadFilesToRemove?: number;
  removedUploads?: number;
  rolesSeeded?: string[];
  warning?: string;
  admins?: Array<{
    label: string;
    userId: string;
    email: string;
    roles: string[];
  }>;
};

function normalizeApiMessage(payload: ApiErrorPayload | null, fallback: string) {
  if (!payload?.message) {
    return fallback;
  }

  return Array.isArray(payload.message) ? payload.message.join(" ") : payload.message;
}

async function maintenanceRequest<T>(
  path: string,
  token: string,
  body?: unknown,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: typeof body === "undefined" ? undefined : JSON.stringify(body),
    cache: "no-store",
  });

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as T | ApiErrorPayload) : null;

  if (!response.ok) {
    throw new Error(
      normalizeApiMessage(payload as ApiErrorPayload | null, "La solicitud de mantenimiento fallo."),
    );
  }

  return payload as T;
}

export async function fetchMaintenanceOverview(token: string) {
  return maintenanceRequest<MaintenanceOverview>("/admin/maintenance/overview", token);
}

export async function cleanupOrphanedUploads(token: string, simulate = true) {
  return maintenanceRequest<MaintenanceActionResponse>(
    "/admin/maintenance/cleanup/orphaned-uploads",
    token,
    { simulate },
  );
}

export async function runSoftClean(
  token: string,
  payload: { confirmationText: string; simulate?: boolean; removeUploads?: boolean },
) {
  return maintenanceRequest<MaintenanceActionResponse>(
    "/admin/maintenance/cleanup/dev-soft-clean",
    token,
    payload,
  );
}

export async function runFactoryReset(
  token: string,
  payload: { confirmationText: string; simulate?: boolean; removeUploads?: boolean },
) {
  return maintenanceRequest<MaintenanceActionResponse>(
    "/admin/maintenance/cleanup/dev-factory-reset",
    token,
    payload,
  );
}

export async function bootstrapAdmins(
  token: string,
  payload: {
    confirmationText: string;
    adminEmail?: string;
    adminPassword?: string;
    adminFirstName?: string;
    adminLastName?: string;
    admin2Email?: string;
    admin2Password?: string;
    admin2FirstName?: string;
    admin2LastName?: string;
  },
) {
  return maintenanceRequest<MaintenanceActionResponse>(
    "/admin/maintenance/admins/bootstrap",
    token,
    payload,
  );
}
