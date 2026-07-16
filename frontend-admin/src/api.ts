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

export interface Cooperative { id: string; name: string; county: string | null; status: string; activationCode?: string }
export interface Weights { repayment: number; delivery: number; circle: number; tenure_savings: number; declared: number }
export interface LadderStep { step: number; limit_cents: number; min_score: number; min_loans_closed: number }
export interface Rules { version: number; weights: Weights; ladder: LadderStep[]; mismatch_discount_threshold_bps: number }
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

  onboardCoop: (name: string, county?: string) =>
    api.post<Cooperative & { activationCode: string }>('/cooperatives', { name, county }),
  listCoops: () => api.get<{ data: Cooperative[] }>('/cooperatives'),

  rules: () => api.get<Rules>('/rules/credit'),
  rulesHistory: () => api.get<{ data: Rules[] }>('/rules/credit/history'),
  publishRules: (weights?: Weights, ladder?: LadderStep[]) =>
    api.put<{ version: number }>('/rules/credit', { weights, ladder }),

  gfApprove: (loanId: string) => api.post<{ status: string }>(`/loans/${loanId}/gf-approval`, {}),
  gfReject: (loanId: string, reason: string) => api.post<{ status: string }>(`/loans/${loanId}/gf-reject`, { reason }),
  disburse: (loanId: string) => api.post<{ status: string; partnerTxnId: string }>(`/loans/${loanId}/disburse`, {}),

  listLoans: (status?: string) =>
    api.get<{ data: Loan[] }>(`/loans${status && status !== 'ALL' ? `?status=${status}` : ''}`),
  loanFlow: (loanId: string) => api.get<LoanFlow>(`/loans/${loanId}/flow`),

  deleteCoop: (id: string, reason?: string) =>
    api.del<{ ok: boolean; deleted: boolean }>(`/cooperatives/${id}`, { reason }),

  reconSummary: () => api.get<{ data: ReconRow[] }>('/reconciliation/summary'),
  reconExceptions: () => api.get<{ data: Exception[] }>('/reconciliation/exceptions'),
  resolveException: (id: string, note: string) => api.post<{ ok: boolean }>(`/reconciliation/exceptions/${id}/resolve`, { note }),

  runArrears: () => api.post<{ scanned: number; markedInArrears: number; lateFeesApplied: number }>('/arrears/sweep', {}),
};

export function kes(cents: number | null | undefined): string {
  if (cents == null) return '\u2014';
  return 'KES ' + Math.round(cents / 100).toLocaleString('en-KE');
}
