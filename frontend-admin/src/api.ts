/**
 * API client for the Grofunder ADMIN portal (GF_ADMIN).
 * The internal cockpit: onboard cooperatives, final loan approval + disbursement,
 * edit credit-score weights + ladder, run reconciliation, view the system.
 */
const BASE = (import.meta.env.VITE_API_URL ?? '') + '/api/v1';
const TOKEN_KEY = 'grofunder_admin_token';

export function getToken(): string | null { return sessionStorage.getItem(TOKEN_KEY); }
export function setToken(t: string | null): void {
  if (t) sessionStorage.setItem(TOKEN_KEY, t); else sessionStorage.removeItem(TOKEN_KEY);
}
export class ApiError extends Error {
  constructor(public code: string, message: string, public status: number) { super(message); }
}
async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) { const e = data?.error ?? {}; throw new ApiError(e.code ?? 'ERROR', e.message ?? 'Something went wrong', res.status); }
  return data as T;
}
export const api = {
  get: <T>(p: string) => request<T>('GET', p),
  post: <T>(p: string, b?: unknown) => request<T>('POST', p, b),
  put: <T>(p: string, b?: unknown) => request<T>('PUT', p, b),
  del: <T>(p: string, b?: unknown) => request<T>('DELETE', p, b),
};

export interface Cooperative { id: string; name: string; county: string | null; status: string; activationCode?: string; entity_type?: string; lending_suspended?: boolean; suspend_reason?: string | null }
export interface SuspEntry { id: string; name: string; suspend_reason: string | null; suspended_at: string; cooperative_name?: string }
export interface Suspensions { cooperatives: SuspEntry[]; clusters: SuspEntry[]; circles: SuspEntry[] }
export interface ChildEntry { id: string; name: string; lending_suspended: boolean; suspend_reason: string | null; cluster_name?: string }
export interface CoopChildren { clusters: ChildEntry[]; circles: ChildEntry[] }
export interface MessageCampaign { id: string; audience: string; sender_label: string | null; sender_email: string; body: string; recipient_count: number; sent_count: number; failed_count: number; created_at: string }
export interface PipelineStage { stage: string; label: string; count: number; stuck: number }
export interface PipelineLoan { id: string; status: string; principal_cents: number; weeks: number; farmer_name: string; cooperative_name: string; stage: string; stage_label: string; stuck: boolean; hours_at_stage: number }
export interface Pipeline { stages: PipelineStage[]; loans: PipelineLoan[] }
export interface Weights { repayment: number; delivery: number; circle: number; tenure_savings: number; declared: number }
export interface AdminMe { id: string; email: string; full_name: string | null; admin_level: string; must_change_password: boolean }
export interface AdminUser { id: string; email: string; full_name: string | null; admin_level: string; status: string; last_login_at: string | null; created_at: string }
export interface LadderStep { step: number; limit_cents: number; min_score: number; min_loans_closed: number }
export interface CustomFeature { key: string; label: string; weight: number; kind: 'COMPUTABLE' | 'EXTERNAL'; source: string; active: boolean }
export interface Rules { version: number; weights: Weights; ladder: LadderStep[]; mismatch_discount_threshold_bps: number; custom_features?: CustomFeature[] }
export interface Loan {
  id: string; status: string; principal_cents: number; weeks: number; total_repayable_cents: number;
  applied_at: string; coop_approved_at: string | null; gf_approved_at: string | null;
  disbursed_at: string | null; closed_at: string | null;
  farmer_name: string; credit_score: number | null; cooperative_name: string;
}
export interface FlowStage { key: string; label: string; at: string | null; reached: boolean }
export interface LoanFlow {
  loan: Loan & { credit_limit_cents: number | null; cooperative_status: string; reject_reason: string | null };
  circleState: string | null; rejected: boolean; rejectReason: string | null; inArrears: boolean;
  stages: FlowStage[];
}
export interface ReconRow { statement_date: string; matched: string; exceptions: string; resolved: string }
export interface Exception { id: string; statement_date: string; partner_ref: string; amount_cents: number; direction: string }

export const adminApi = {
  login: (email: string, password: string) =>
    api.post<{ token: string; user: { id: string; role: string } }>('/auth/login', { email, password }),

  onboardCoop: (name: string, county?: string, entityType?: 'COOPERATIVE' | 'AGENT') =>
    api.post<Cooperative & { activationCode: string }>('/cooperatives', { name, county, entityType }),
  listCoops: () => api.get<{ data: Cooperative[] }>('/cooperatives'),

  rules: () => api.get<Rules>('/rules/credit'),
  rulesHistory: () => api.get<{ data: Rules[] }>('/rules/credit/history'),
  publishRules: (weights?: Weights, ladder?: LadderStep[]) =>
    api.put<{ version: number }>('/rules/credit', { weights, ladder }),
  computableSources: () => api.get<{ sources: Record<string, string> }>('/rules/credit/computable-sources'),
  publishFeatures: (customFeatures: CustomFeature[]) =>
    api.put<{ version: number }>('/rules/credit', { customFeatures }),

  gfApprove: (loanId: string) => api.post<{ status: string }>(`/loans/${loanId}/gf-approval`, {}),
  gfReject: (loanId: string, reason: string) => api.post<{ status: string }>(`/loans/${loanId}/gf-reject`, { reason }),
  disburse: (loanId: string) => api.post<{ status: string; partnerTxnId: string }>(`/loans/${loanId}/disburse`, {}),

  listLoans: (status?: string) =>
    api.get<{ data: Loan[] }>(`/loans${status && status !== 'ALL' ? `?status=${status}` : ''}`),
  loanFlow: (loanId: string) => api.get<LoanFlow>(`/loans/${loanId}/flow`),

  deleteCoop: (id: string, reason?: string) =>
    api.del<{ ok: boolean; deleted: boolean }>(`/cooperatives/${id}`, { reason }),

  me: () => api.get<AdminMe>('/account/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.put<{ ok: boolean }>('/account/password', { currentPassword, newPassword }),
  changeEmail: (email: string) => api.put<{ ok: boolean }>('/account/email', { email }),
  listAdmins: () => api.get<{ data: AdminUser[] }>('/account/admins'),
  inviteAdmin: (email: string, fullName: string, level: string, tempPassword: string) =>
    api.post<{ id: string; email: string; level: string }>('/account/admins', { email, fullName, level, tempPassword }),
  changeAdminLevel: (id: string, level: string) =>
    api.put<{ ok: boolean }>(`/account/admins/${id}/level`, { level }),
  revokeAdmin: (id: string) => api.post<{ ok: boolean }>(`/account/admins/${id}/revoke`, {}),

  suspensions: () => api.get<Suspensions>('/access/suspensions'),
  suspend: (level: string, id: string, reason: string) =>
    api.post<{ ok: boolean }>(`/access/${level}/${id}/suspend`, { reason }),
  resume: (level: string, id: string) =>
    api.post<{ ok: boolean }>(`/access/${level}/${id}/resume`, {}),
  coopChildren: (coopId: string) => api.get<CoopChildren>(`/access/cooperative/${coopId}/children`),

  sendMessage: (audience: string, body: string, audienceRef?: string) =>
    api.post<{ campaignId: string; recipientCount: number; sentCount: number; failedCount: number; skippedNoPhone: number }>(
      '/admin-messaging/send', { audience, body, audienceRef }),
  messageLog: () => api.get<{ data: MessageCampaign[] }>('/admin-messaging/log'),

  pipeline: (stuckHours?: number) =>
    api.get<Pipeline>(`/loans/pipeline/view${stuckHours ? `?stuckHours=${stuckHours}` : ''}`),

  exportData: (dataset: string) => api.get<{ data: Record<string, unknown>[] }>(`/export/${dataset}`),

  reconSummary: () => api.get<{ data: ReconRow[] }>('/reconciliation/summary'),
  reconExceptions: () => api.get<{ data: Exception[] }>('/reconciliation/exceptions'),
  resolveException: (id: string, note: string) => api.post<{ ok: boolean }>(`/reconciliation/exceptions/${id}/resolve`, { note }),

  runArrears: () => api.post<{ scanned: number; markedInArrears: number; lateFeesApplied: number }>('/arrears/sweep', {}),
};

export function kes(cents: number | null | undefined): string {
  if (cents == null) return '\u2014';
  return 'KES ' + Math.round(cents / 100).toLocaleString('en-KE');
}
