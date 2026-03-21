const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ?? 'http://localhost:3001/api';

const AUTH_TOKEN_KEY = 'editorialhub_access_token';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
};

type ApiErrorPayload = {
  message?: string | string[];
};

export type LoyaltySnapshot = {
  level: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND';
  label: string;
  points: number;
  currentRatePercent: string;
  nextLevel: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND' | null;
  nextLevelLabel: string | null;
  nextLevelRatePercent: string | null;
  pointsToNextLevel: number;
  progressPercent: number;
  estimatedExtraPer100Mxn: string;
  isManualDiamond: boolean;
  assignedAt?: string | null;
  assignedByUserId?: string | null;
};

export type RegisterPayload = {
  email: string;
  password: string;
  confirmPassword: string;
};

export type VerifyEmailPayload = {
  email: string;
  code: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type ForgotPasswordPayload = {
  email: string;
};

export type ResetPasswordPayload = {
  email: string;
  code: string;
  newPassword: string;
  confirmNewPassword: string;
};

export type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
};

export type ApplyAuthorPayload = {
  publicName: string;
  authorProfileType: 'CERTIFIED' | 'ANONYMOUS';
  legalName?: string;
  bio?: string;
  taxId?: string;
  taxIdLetters?: string;
  taxIdDatePart?: string;
  taxIdHomoclave?: string;
  curp?: string;
  dateOfBirth?: string;
  payoutMethod?: string;
  payoutAccountData?: {
    accountHolder?: string;
    bankName?: string;
    clabe?: string;
    accountNumber?: string;
  };
};

export type AuthUser = {
  id: string;
  email: string;
  status: string;
  emailVerifiedAt: string | null;
  roles: string[];
  accountLabel: string;
  primaryAdministrativeLabel: string;
  administrativeLabels: string[];
  activitySummary: {
    createdWorkCount: number;
    confirmedPurchaseCount: number;
    hasWorks: boolean;
    hasConfirmedPurchases: boolean;
    hasEditorialActivity: boolean;
  };
  profile: {
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    country: string | null;
    avatarUrl: string | null;
  } | null;
  collaboratorProfile: {
    id: string;
    publicName: string;
    bio: string | null;
    authorProfileType: 'CERTIFIED' | 'ANONYMOUS';
    applicationStatus: 'IN_REVIEW' | 'APPROVED' | 'REJECTED';
    royaltyRatePercent: string | null;
    loyalty: LoyaltySnapshot | null;
    legalName: string | null;
    curp: string | null;
    dateOfBirth: string | null;
    bankValidationStatus: string | null;
    bankValidationReference: string | null;
    bankValidationRequestedAt: string | null;
    bankValidationNotes: string | null;
    bankValidatedAt: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
  favoredSocio: {
    isFavored: boolean;
    assignedAt: string | null;
    assignedByUserId: string | null;
  };
  createdAt: string;
  updatedAt: string;
};

export type AuthorProfile = {
  id: string;
  userId: string;
  userEmail: string | null;
  publicName: string;
  legalName: string | null;
  bio: string | null;
  authorProfileType: 'CERTIFIED' | 'ANONYMOUS';
  applicationStatus: 'IN_REVIEW' | 'APPROVED' | 'REJECTED';
  royaltyRatePercent: string | null;
  loyalty?: LoyaltySnapshot | null;
  rejectionReason: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AuthorApplicationsResponse = {
  items: AuthorProfile[];
  total: number;
};

export type WorkAsset = {
  fileId: string;
  originalName: string;
  mimeType: string;
  sizeBytes: string;
  url: string;
  uploadedAt: string | null;
};
export type WorkRatingSummary = {
  organicAverage: number | null;
  visibleAverage: number | null;
  totalReviews: number;
  breakdown: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
};

export type WorkEditorialSignal = {
  favoredEligible: boolean;
  editorialBadgeText: string | null;
  editorialHeadline: string | null;
  featuredReviewNote: string | null;
  hasVisibleRatingOverride: boolean;
};

export type PublishedWorkReview = {
  id: string;
  rating: number;
  comment: string;
  editorialFeatured: boolean;
  reviewerDisplayName: string;
  reviewerLabel: string;
  createdAt: string;
  updatedAt: string;
};

export type MyWorkReview = {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
};

export type Work = {
  id: string;
  authorProfileId: string;
  createdByUserId: string;
  createdByEmail: string | null;
  authorPublicName: string | null;
  authorUserEmail: string | null;
  title: string;
  slug: string;
  description: string | null;
  publicationType: 'BOOK' | 'MAGAZINE' | 'ARTICLE' | 'OTHER';
  status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'PUBLISHED' | 'CANCELLED';
  currentEdition: number;
  publishedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  editorialNotes: string | null;
  coverFileId: string | null;
  assets: {
    cover: WorkAsset | null;
    backCover: WorkAsset | null;
    manuscript: WorkAsset | null;
  };
  ratings?: WorkRatingSummary;
  editorial?: WorkEditorialSignal;
  metadata: Record<string, unknown> | null;
  resubmittableAfter: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateWorkPayload = {
  title: string;
  description?: string;
  publicationType?: 'BOOK' | 'MAGAZINE' | 'ARTICLE' | 'OTHER';
  metadata?: Record<string, unknown>;
};

export type UpdateWorkPayload = CreateWorkPayload;

export type ReviewWorksResponse = {
  items: Work[];
  total: number;
};

export type LibraryPurchaseItem = {
  id: string;
  title: string;
  authorName: string;
  unitPrice: string;
  royaltyRatePercent: string;
  workId: string;
  workSlug: string;
  publicationType: Work["publicationType"];
  editionNumber: number;
  coverUrl: string | null;
  manuscriptUrl: string | null;
  manuscriptMimeType: string | null;
  purchasedAt: string;
};

export type LibraryPurchase = {
  id: string;
  folio: string;
  status: string;
  currency: string;
  subtotalAmount: string;
  totalAmount: string;
  confirmedAt: string | null;
  createdAt: string;
  downloadKey: {
    code: string;
    status: string;
    expiresAt: string;
    attemptsUsed: number;
    maxAttempts: number;
  } | null;
  items: LibraryPurchaseItem[];
};
export type WorkReviewAccess = {
  canReview: boolean;
  hasPurchased: boolean;
  review: MyWorkReview | null;
};

function normalizeApiMessage(payload: ApiErrorPayload | null, fallback: string) {
  if (!payload?.message) {
    return fallback;
  }

  return Array.isArray(payload.message) ? payload.message.join(' ') : payload.message;
}

async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
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

async function apiFormRequest<T>(path: string, body: FormData, token: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body,
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

export function getStoredToken() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setStoredToken(token: string) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  }
}

export function clearStoredToken() {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
  }
}

export async function registerUser(payload: RegisterPayload) {
  return apiRequest<{
    message: string;
    user: { id: string; email: string; status: string };
    verificationCode?: string;
    verificationCodeExpiresAt?: string;
  }>('/auth/register', {
    method: 'POST',
    body: payload,
  });
}

export async function verifyEmail(payload: VerifyEmailPayload) {
  return apiRequest<{
    message: string;
    user: { id: string; email: string; status: string; emailVerifiedAt: string | null };
  }>('/auth/verify-email', {
    method: 'POST',
    body: payload,
  });
}

export async function loginUser(payload: LoginPayload) {
  return apiRequest<{
    accessToken: string;
    tokenType: string;
    expiresIn: string;
    user: {
      id: string;
      email: string;
      status: string;
      emailVerifiedAt: string | null;
      roles: string[];
    };
  }>('/auth/login', {
    method: 'POST',
    body: payload,
  });
}

export async function forgotPassword(payload: ForgotPasswordPayload) {
  return apiRequest<{
    message: string;
    resetCode?: string;
    resetCodeExpiresAt?: string;
  }>('/auth/forgot-password', {
    method: 'POST',
    body: payload,
  });
}

export async function resetPassword(payload: ResetPasswordPayload) {
  return apiRequest<{
    message: string;
  }>('/auth/reset-password', {
    method: 'POST',
    body: payload,
  });
}

export async function changePassword(token: string, payload: ChangePasswordPayload) {
  return apiRequest<{
    message: string;
  }>('/auth/change-password', {
    method: 'POST',
    body: payload,
    token,
  });
}
export async function fetchMe(token: string) {
  return apiRequest<AuthUser>('/users/me', { token });
}

export async function fetchUsers(token: string) {
  return apiRequest<{ items: AuthUser[]; total: number }>('/users', { token });
}

export async function assignFavoredSocio(token: string, userId: string) {
  return apiRequest<AuthUser>(`/users/${userId}/favored-socio`, {
    method: 'POST',
    token,
  });
}

export async function removeFavoredSocio(token: string, userId: string) {
  return apiRequest<AuthUser>(`/users/${userId}/favored-socio`, {
    method: 'DELETE',
    token,
  });
}

export async function assignDiamondLoyalty(token: string, userId: string) {
  return apiRequest<AuthUser>('/users/' + userId + '/loyalty-diamond', {
    method: 'POST',
    token,
  });
}

export async function removeDiamondLoyalty(token: string, userId: string) {
  return apiRequest<AuthUser>('/users/' + userId + '/loyalty-diamond', {
    method: 'DELETE',
    token,
  });
}

export async function fetchMyAuthorProfile(token: string) {
  return apiRequest<{
    hasAuthorProfile: boolean;
    authorProfile: AuthorProfile | null;
  }>('/authors/me', { token });
}

export async function applyAuthor(token: string, payload: ApplyAuthorPayload) {
  return apiRequest<{
    message: string;
    authorProfile: AuthorProfile;
  }>('/authors/apply', {
    method: 'POST',
    body: payload,
    token,
  });
}

export async function fetchAuthorApplications(token: string) {
  return apiRequest<AuthorApplicationsResponse>('/admin/authors/applications', { token });
}

export async function approveAuthorApplication(token: string, authorProfileId: string, royaltyRatePercent: string) {
  return apiRequest<{ message: string; authorProfile: AuthorProfile }>(
    `/admin/authors/${authorProfileId}/approve`,
    {
      method: 'POST',
      body: { royaltyRatePercent },
      token,
    },
  );
}

export async function rejectAuthorApplication(token: string, authorProfileId: string, rejectionReason: string) {
  return apiRequest<{ message: string; authorProfile: AuthorProfile }>(
    `/admin/authors/${authorProfileId}/reject`,
    {
      method: 'POST',
      body: { rejectionReason },
      token,
    },
  );
}

export async function createWork(token: string, payload: CreateWorkPayload) {
  return apiRequest<{ message: string; work: Work }>('/works', {
    method: 'POST',
    body: payload,
    token,
  });
}

export async function fetchMyWorks(token: string) {
  return apiRequest<{ items: Work[]; total: number }>('/works/me', { token });
}

export async function fetchPublishedWorks() {
  return apiRequest<{ items: Work[]; total: number }>('/works/public');
}

export async function fetchPublishedWork(identifier: string) {
  return apiRequest<Work>(`/works/public/${identifier}`);
}

export async function fetchPublishedWorkReviews(identifier: string) {
  return apiRequest<{ items: PublishedWorkReview[]; total: number }>(
    `/works/public/${identifier}/reviews`,
  );
}

export async function fetchMyWorkReview(token: string, workId: string) {
  return apiRequest<WorkReviewAccess>(`/works/${workId}/reviews/me`, { token });
}

export async function upsertWorkReview(
  token: string,
  workId: string,
  payload: { rating: number; comment: string },
) {
  return apiRequest<{ message: string; review: MyWorkReview }>(`/works/${workId}/reviews`, {
    method: 'POST',
    body: payload,
    token,
  });
}

export async function fetchMyWork(token: string, workId: string) {
  return apiRequest<Work>(`/works/me/${workId}`, { token });
}

export async function updateWork(token: string, workId: string, payload: UpdateWorkPayload) {
  return apiRequest<{ message: string; work: Work }>(`/works/${workId}`, {
    method: 'PATCH',
    body: payload,
    token,
  });
}

export async function submitWorkForReview(token: string, workId: string) {
  return apiRequest<{ message: string; work: Work }>(`/works/${workId}/submit`, {
    method: 'POST',
    token,
  });
}

export async function uploadWorkAsset(
  token: string,
  workId: string,
  kind: 'cover' | 'back-cover' | 'manuscript',
  file: File,
) {
  const formData = new FormData();
  formData.append('file', file);

  return apiFormRequest<{ message: string; work: Work }>(
    `/works/${workId}/assets/${kind}`,
    formData,
    token,
  );
}

export async function deleteWork(token: string, workId: string) {
  return apiRequest<{ message: string }>(`/works/${workId}`, {
    method: 'DELETE',
    token,
  });
}

export async function fetchReviewWorks(token: string) {
  return apiRequest<ReviewWorksResponse>('/admin/works/review', { token });
}

export async function fetchModerationWorks(token: string) {
  return apiRequest<ReviewWorksResponse>('/admin/works/moderation', { token });
}

export async function approveWork(token: string, workId: string, editorialNotes?: string) {
  return apiRequest<{ message: string; work: Work }>(`/admin/works/${workId}/approve`, {
    method: 'POST',
    body: { editorialNotes },
    token,
  });
}

export async function rejectWork(
  token: string,
  workId: string,
  rejectionReason: string,
  resubmittableAfter: string,
) {
  return apiRequest<{ message: string; work: Work }>(`/admin/works/${workId}/reject`, {
    method: 'POST',
    body: { rejectionReason, resubmittableAfter },
    token,
  });
}

export async function publishWork(token: string, workId: string) {
  return apiRequest<{ message: string; work: Work }>(`/admin/works/${workId}/publish`, {
    method: 'POST',
    token,
  });
}



export async function cancelWorkPublication(
  token: string,
  workId: string,
  cancellationReason: string,
) {
  return apiRequest<{ message: string; work: Work }>(`/admin/works/${workId}/cancel`, {
    method: 'POST',
    body: { cancellationReason },
    token,
  });
}

export async function checkoutPublishedWork(
  token: string,
  workId: string,
  payload: { acceptTerms: boolean; termsVersion: string },
) {
  return apiRequest<{
    message: string;
    alreadyOwned: boolean;
    checkoutUrl: string | null;
    purchaseId?: string;
    purchase?: LibraryPurchase;
  }>(`/purchases/checkout/${workId}`, {
    method: 'POST',
    body: payload,
    token,
  });
}

export async function fetchMyPurchases(token: string) {
  return apiRequest<{ items: LibraryPurchase[]; total: number }>('/purchases/me', { token });
}














export async function upsertWorkEditorialLayer(
  token: string,
  workId: string,
  payload: {
    editorialBadgeText?: string;
    editorialHeadline?: string;
    featuredReviewNote?: string;
    visibleAverageRating?: number | null;
  },
) {
  return apiRequest<{ message: string; editorial: WorkEditorialSignal }>(
    `/admin/works/${workId}/editorial`,
    {
      method: 'POST',
      body: payload,
      token,
    },
  );
}




