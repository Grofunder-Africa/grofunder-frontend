/**
 * API client for the Grofunder farmer app.
 *
 * Wraps fetch with: the /api/v1 base, the bearer token, JSON handling, and the
 * backend's error envelope ({ error: { code, message } }) turned into thrown
 * ApiError objects the UI can show. The token lives in memory + sessionStorage
 * so a refresh keeps the farmer signed in without a full re-login.
 */
const BASE = (import.meta.env.VITE_API_URL ?? '') + '/api/v1';

const TOKEN_KEY = 'grofunder_token';

export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string | null): void {
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
  else sessionStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(public code: string, message: string, public status: number) {
    super(message);
  }
}

/**
 * Registered once by App.tsx so that ANY expired-session response, from ANY
 * screen, routes back to sign-in consistently — rather than each screen
 * needing to remember to check for a 401 itself (which is exactly the kind
 * of thing that's easy to do on one screen and forget on the next five).
 */
let sessionExpiredHandler: (() => void) | null = null;
export function onSessionExpired(handler: () => void): void {
  sessionExpiredHandler = handler;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : {};

  if (!res.ok) {
    const err = data?.error ?? {};
    if (res.status === 401) {
      setToken(null);
      sessionExpiredHandler?.();
    }
    throw new ApiError(err.code ?? 'ERROR', err.message ?? 'Something went wrong', res.status);
  }
  return data as T;
}

export const api = {
  get: <T>(p: string) => request<T>('GET', p),
  post: <T>(p: string, b?: unknown) => request<T>('POST', p, b),
  del: <T>(p: string) => request<T>('DELETE', p),
  put: <T>(p: string, b?: unknown) => request<T>('PUT', p, b),
  patch: <T>(p: string, b?: unknown) => request<T>('PATCH', p, b),
};

/* ---- typed endpoint helpers the app uses ---- */

export interface LoginResponse { token: string; user: { id: string; role: string } }
/** Step 1 of sign-in: either an OTP challenge, or the token when OTP is off. */
export type LoginStart =
  | { otpRequired: true; challengeId: string; sentTo: string }
  | ({ otpRequired: false } & LoginResponse);
export interface ScoreInfo {
  credit_score: number | null;
  credit_limit_cents: number | null;
  tree_stage: number;
  registrationComplete?: boolean;
  circleActive?: boolean;
  hasLimit?: boolean;
  hasIdPhotos?: boolean;
  canBorrow?: boolean;
  missing?: { phone: boolean; nationalId: boolean; circle: boolean; circleNotActive: boolean; limit: boolean; idPhotoFront: boolean; idPhotoBack: boolean };
}
export interface FarmerRecord {
  id: string; full_name: string; coop_member_no: string | null;
  cooperative_name: string | null;
  cluster_name: string | null; cluster_head: string | null; delivery_count: number;
  known_crops: string[];
}
export interface Quote {
  principalCents: number; weeks: number; ratePmBps: number;
  totalInterestCents: number; totalRepayableCents: number; weeklyInstalmentCents: number;
}
export interface Instalment {
  seq_no: number; due_date: string; amount_due_cents: number;
  amount_paid_cents: number; status: string; days_past_due: number;
}
export interface Loan {
  id: string; status: string; principal_cents: number; weeks: number;
  total_repayable_cents: number; purpose: string | null; applied_at: string;
}

export const farmerApi = {
  // Step 1 of sign-in. Either returns a challenge (OTP sent) or, when OTP is
  // turned off server-side, the token directly.
  login: (phone: string, pin: string) =>
    api.post<LoginStart>('/auth/farmer-login', { phone, pin }),
  verifyOtp: (challengeId: string, code: string) =>
    api.post<LoginResponse>('/auth/farmer-login/verify', { challengeId, code }),
  forgotPin: (phone: string, nationalId: string) =>
    api.post<{ challengeId: string; sentTo: string }>('/auth/forgot-pin', { phone, nationalId }),
  verifyPinResetOtp: (challengeId: string, code: string) =>
    api.post<{ resetToken: string }>('/auth/forgot-pin/verify', { challengeId, code }),
  resetPin: (resetToken: string, newPin: string) =>
    api.post<{ ok: boolean }>('/auth/forgot-pin/reset', { resetToken, newPin }),
  register: (phone: string, pin: string, coopMemberNo?: string) =>
    api.post<{ farmerId: string; userId: string }>('/farmer-onboarding/register', { phone, pin, coopMemberNo }),
  records: () => api.get<FarmerRecord>('/farmer-onboarding/records'),
  score: () => api.get<ScoreInfo>('/loans/my-score'),
  myActiveLoan: () => api.get<MyActiveLoanStage | null>('/loans/my-active'),
  quote: (principalCents: number, weeks: number) =>
    api.post<Quote>('/loans/quote', { principalCents, weeks }),
  apply: (principalCents: number, weeks: number, purpose?: string) =>
    api.post<{ loanId: string; status: string; quote: Quote }>('/loans', { principalCents, weeks, purpose }),
  loan: (id: string) => api.get<Loan>(`/loans/${id}`),
  schedule: (id: string) => api.get<{ data: Instalment[] }>(`/loans/${id}/schedule`),
  notifications: () => api.get<{ data: { id: string; type: string; payload: Record<string, unknown>; created_at: string }[] }>('/arrears/notifications'),
  inbox: () => api.get<{ data: FarmerInboxMessage[] }>('/farmer-inbox'),
  inboxUnread: () => api.get<{ count: number }>('/farmer-inbox/unread'),
  markRead: (id: string) => api.post<{ ok: boolean }>(`/farmer-inbox/${id}/read`, {}),
  markAllRead: () => api.post<{ ok: boolean; marked: number }>('/farmer-inbox/read-all', {}),
  farmerMessages: () => api.get<{ data: FarmerMessage[] }>('/farmer-messages'),
  sendFarmerMessage: (audience: FarmerAudience, body: string) =>
    api.post<{ id: string }>('/farmer-messages', { audience, body }),
  logGroRequest: (category: string, freeText?: string) =>
    api.post<{ id: string }>('/farmer-messages/requests', { category, freeText }),
  myRecords: () => api.get<{ data: CaptureRecord[] }>('/my-records/records'),
  deliverySummary: () => api.get<DeliverySummary>('/my-records/delivery-summary'),
  feed: () => api.get<{ data: FeedPost[] }>('/posts/feed'),
  createPost: (body: { imageBase64: string; contentType: string; caption?: string; toCluster: boolean; toCircle: boolean; toCooperative: boolean; toWebsite: boolean }) =>
    api.post<{ id: string; imageUrl: string; websiteStatus: string | null }>('/posts', body),
  deletePost: (id: string) => api.del<{ ok: boolean }>(`/posts/${id}`),

  // Gro's walkthrough
  onboardingStatus: () => api.get<OnboardingStatus>('/farmer-onboarding/status'),
  confirmRecord: () => api.post<{ ok: boolean }>('/farmer-onboarding/confirm', {}),
  confirmNationalId: (nationalId: string) =>
    api.post<{ verified: boolean; reason?: 'MISMATCH' | 'PENDING_VERIFICATION' }>('/farmer-onboarding/confirm-id', { nationalId }),
  saveIdPhoto: (side: 'front' | 'back' | 'selfie', imageBase64: string, contentType: string) =>
    api.post<{ url: string }>('/farmer-onboarding/id-photo', { side, imageBase64, contentType }),
  updateProfile: (input: { username?: string; photoBase64?: string; photoContentType?: string }) =>
    api.patch<{ username: string | null; photoUrl: string | null }>('/farmer-onboarding/profile', input),
  changePin: (currentPin: string, newPin: string) =>
    api.post<{ ok: boolean }>('/farmer-onboarding/change-pin', { currentPin, newPin }),
  raiseDiscrepancy: (field: string, details?: string) =>
    api.post<{ id: string; status: string }>('/farmer-onboarding/discrepancies', { field, details }),
  setEconomicProfile: (
    crops: string[],
    activities: string[],
    incomeSources: { activity: string; frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'SEASONAL'; avgAmountCents?: number }[],
    dateOfBirth?: string,
    gender?: string,
  ) =>
    api.post<{ ok: boolean }>('/farmer-onboarding/economic-profile', { crops, activities, incomeSources, dateOfBirth, gender }),
  setFarmDetails: (input: { totalAcres?: number; cultivatedAcres?: number; landArrangement?: string; farmingExperience?: string }) =>
    api.post<{ ok: boolean }>('/farmer-onboarding/farm-details', input),
  setHomeLocation: (lat: number | null, lng: number | null, text?: string) =>
    api.put<{ ok: boolean }>('/farmer-onboarding/home-location', { lat: lat ?? undefined, lng: lng ?? undefined, text }),
  myCircleStatus: () => api.get<MyCircleStatus>('/circles/my-circle'),
  clusterMates: () => api.get<{ data: { id: string; fullName: string }[]; diagnostics?: Record<string, unknown> }>('/circles/cluster-mates'),
  createCircle: (name: string, memberFarmerIds: string[]) =>
    api.post<{ circleId: string; state: string }>('/circles', { name, memberFarmerIds }),
  submitVouches: (circleId: string, declineFarmerIds?: string[]) =>
    api.post<{ state: string }>(`/circles/${circleId}/vouches`, { declineFarmerIds }),
  removeCircleMember: (circleId: string, farmerId: string) =>
    api.del<{ state: string }>(`/circles/${circleId}/members/${farmerId}`),
  leaveCircle: () => api.post<{ ok: boolean }>('/circles/leave', {}),
  deleteCircle: (circleId: string) => api.del<{ ok: boolean }>(`/circles/${circleId}`),
};

export interface OnboardingStatus {
  recordConfirmed: boolean;
  idAttempted: boolean;
  idVerified: boolean;
  hasEconomicProfile: boolean;
  hasHomeLocation: boolean;
  circleId: string | null;
  circleState: string | null;
}
export interface MyCircleStatus {
  hasCircle: boolean;
  circle?: {
    id: string; name: string; state: string; member_count: number;
    confirmed_pairs: number; total_pairs: number; members_confirmed: number;
    isHead: boolean; myVouchDone: boolean;
    members: { farmerId: string; fullName: string; isHead: boolean; myVouchStatus: string; hasConfirmedAll: boolean }[];
  };
}

export interface FeedPost {
  id: string; author_name: string; is_mine: boolean;
  image_url: string; caption: string | null; audience: string[];
  website_status: string | null; created_at: string;
}

export interface CaptureRecord {
  type: string; label: string; unit: 'kg' | 'KES';
  total_units: number; entries: { id: string; entry_date: string; amount_units: number }[];
}

export interface DeliverySummary {
  totalDeliveries: number;
  totalKg: number;
  totalEarningsCents: number;
  totalDeductionsCents: number;
  netReceivedCents: number;
  avgKgPerWeek: number;
  avgEarningsCentsPerWeek: number;
  nextExpectedDate: string | null;
  lastDelivery: {
    date: string; quantityKg: number; earningsCents: number; deductionsCents: number; product: string;
  } | null;
}
export interface MyActiveLoanStage {
  loanId: string;
  status: string;
  weeks: number;
  instalmentsPaid: number;
  instalmentsTotal: number;
  nextDueDate: string | null;
}

export interface FarmerInboxMessage {
  id: string;
  body: string;
  senderType: 'COOPERATIVE' | 'GROFUNDER';
  senderName: string;
  sentAt: string | null;
  readAt: string | null;
}

export type FarmerAudience = 'CIRCLE' | 'CLUSTER' | 'COOPERATIVE' | 'EVERYONE' | 'GROFUNDER_ADMIN';
export interface FarmerMessage {
  id: string;
  body: string;
  audience: FarmerAudience;
  senderName: string;
  isMine: boolean;
  createdAt: string;
}

/** KES cents -> "KES 5,000" */
export function kes(cents: number | null | undefined): string {
  if (cents == null) return '—';
  return 'KES ' + Math.round(cents / 100).toLocaleString('en-KE');
}
