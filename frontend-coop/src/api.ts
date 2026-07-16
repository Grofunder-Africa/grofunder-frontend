/**
 * API client for the Grofunder cooperative portal.
 * Same fetch wrapper + error envelope as the farmer app, with the endpoint
 * helpers a COOP_ADMIN uses: activation, clusters, farmers, products,
 * production, loan approvals, and messaging.
 */
const BASE = (import.meta.env.VITE_API_URL ?? '') + '/api/v1';
const TOKEN_KEY = 'grofunder_coop_token';

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
  if (!res.ok) {
    const err = data?.error ?? {};
    throw new ApiError(err.code ?? 'ERROR', err.message ?? 'Something went wrong', res.status);
  }
  return data as T;
}

export const api = {
  get: <T>(p: string) => request<T>('GET', p),
  post: <T>(p: string, b?: unknown) => request<T>('POST', p, b),
  put: <T>(p: string, b?: unknown) => request<T>('PUT', p, b),
};

export interface Cluster { id: string; name: string; head_farmer_id: string | null; member_count: number }
export interface Farmer { id: string; full_name: string; coop_member_no: string | null; cluster_id: string | null; credit_score: number | null; credit_limit_cents: number }
export interface Product { id: string; name: string; season: string | null; current_rate_cents_per_kg: number | null }
export interface Loan {
  id: string; farmer_id: string; status: string; principal_cents: number; weeks: number;
  total_repayable_cents: number; applied_at: string;
}

export const coopApi = {
  login: (email: string, password: string) =>
    api.post<{ token: string; user: { id: string; role: string } }>('/auth/login', { email, password }),
  activate: (cooperativeName: string, code: string, email: string, password: string) =>
    api.post<{ cooperativeId: string; userId: string }>('/cooperatives/activate', { cooperativeName, code, email, password }),

  clusters: () => api.get<{ data: Cluster[] }>('/clusters'),
  addCluster: (name: string) => api.post<Cluster>('/clusters', { name }),

  farmers: () => api.get<{ data: Farmer[] }>('/farmers'),
  addFarmer: (fullName: string, clusterName: string, phone?: string, coopMemberNo?: string) =>
    api.post<Farmer>('/farmers', { fullName, clusterName, phone, coopMemberNo }),
  importFarmers: (rows: Record<string, string>[]) =>
    api.post<{ imported: number; errors: { row: number; message: string }[] }>('/farmers/import', { rows }),

  products: () => api.get<{ data: Product[] }>('/products'),
  addProduct: (name: string, rateCentsPerKg: number, season?: string) =>
    api.post<Product>('/products', { name, rateCentsPerKg, season, effectiveFrom: new Date().toISOString().slice(0, 10) }),

  scoreFarmer: (farmerId: string) => api.post<{ score: number; limitCents: number }>(`/loans/score/${farmerId}`, {}),
  coopApprove: (loanId: string) => api.post<{ status: string }>(`/loans/${loanId}/coop-approval`, {}),
  coopReject: (loanId: string, reason: string) => api.post<{ status: string }>(`/loans/${loanId}/coop-reject`, { reason }),

  sendMessage: (audience: string, body: string, audienceRef?: string) =>
    api.post<{ campaignId: string; sentCount: number; failedCount: number }>('/messaging/campaigns', { audience, body, audienceRef }),
};

export function kes(cents: number | null | undefined): string {
  if (cents == null) return '\u2014';
  return 'KES ' + Math.round(cents / 100).toLocaleString('en-KE');
}
