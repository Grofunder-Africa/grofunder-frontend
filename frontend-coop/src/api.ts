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
  patch: <T>(p: string, b?: unknown) => request<T>('PATCH', p, b),
  put: <T>(p: string, b?: unknown) => request<T>('PUT', p, b),
};

export interface Cluster { id: string; name: string; head_farmer_id: string | null; head_name?: string | null; member_count: number }
export interface Farmer { id: string; full_name: string; phone?: string | null; national_id?: string | null; coop_member_no: string | null; cluster_id: string | null; cluster_name?: string | null; credit_limit_cents: number | null; registration_complete?: boolean }
export interface Product { id: string; name: string; season: string | null; current_rate_cents_per_kg: number | null }
export interface Loan {
  id: string; farmer_id: string; status: string; principal_cents: number; weeks: number;
  total_repayable_cents: number; applied_at: string;
}

export const coopApi = {
  login: (email: string, password: string) =>
    api.post<{ token: string; user: { id: string; role: string } }>('/auth/login', { email, password }),
  loginByUsername: (username: string, password: string) =>
    api.post<{ token: string; user: { id: string; role: string } }>('/auth/coop-login', { username, password }),
  activate: (cooperativeName: string, code: string, password: string, email?: string) =>
    api.post<{ cooperativeId: string; userId: string; username: string }>('/cooperatives/activate', { cooperativeName, code, email, password }),

  clusters: () => api.get<{ data: Cluster[] }>('/clusters'),
  addCluster: (name: string) => api.post<Cluster>('/clusters', { name }),
  appointHead: (clusterId: string, farmerId: string) =>
    api.patch<Cluster>(`/clusters/${clusterId}/head`, { farmerId }),

  farmers: (clusterId?: string) => api.get<{ data: Farmer[] }>(`/farmers${clusterId ? `?cluster_id=${clusterId}` : ''}`),
  addFarmer: (fullName: string, clusterName: string, phone?: string, nationalId?: string, coopMemberNo?: string) =>
    api.post<Farmer>('/farmers', { fullName, clusterName, phone, nationalId, coopMemberNo }),
  updateFarmer: (id: string, fields: { phone?: string; nationalId?: string; coopMemberNo?: string; clusterName?: string }) =>
    api.patch<Farmer>(`/farmers/${id}`, fields),
  importFarmers: (rows: Record<string, string>[]) =>
    api.post<{ imported: number; errors: { row: number; message: string }[] }>('/farmers/import', { rows }),

  products: () => api.get<{ data: Product[] }>('/products'),
  addProduct: (name: string, rateCentsPerKg: number, season?: string) =>
    api.post<Product>('/products', { name, rateCentsPerKg, season, effectiveFrom: new Date().toISOString().slice(0, 10) }),

  coopApprove: (loanId: string) => api.post<{ status: string }>(`/loans/${loanId}/coop-approval`, {}),

  myProfile: () => api.get<CoopProfile>('/cooperatives/me'),
  updateContacts: (c: { contactName?: string; contactPhone?: string; contactEmail?: string }) =>
    api.patch<{ contact_name: string | null; contact_phone: string | null; contact_email: string | null }>('/cooperatives/me/contacts', c),

  inbox: () => api.get<{ data: InboxMessage[] }>('/inbox'),
  inboxUnread: () => api.get<{ count: number }>('/inbox/unread'),
  markRead: (id: string) => api.post<{ ok: boolean }>(`/inbox/${id}/read`, {}),
  markAllRead: () => api.post<{ ok: boolean; marked: number }>('/inbox/read-all', {}),
  coopReject: (loanId: string, reason: string) => api.post<{ status: string }>(`/loans/${loanId}/coop-reject`, { reason }),

  sendMessage: (audience: string, body: string, audienceRef?: string) =>
    api.post<{ campaignId: string; sentCount: number; failedCount: number }>('/messaging/campaigns', { audience, body, audienceRef }),
};

export function kes(cents: number | null | undefined): string {
  if (cents == null) return '\u2014';
  return 'KES ' + Math.round(cents / 100).toLocaleString('en-KE');
}

export interface CoopProfile {
  id: string; name: string; slug: string; county: string | null; status: string; entity_type: string;
  contact_name: string | null; contact_phone: string | null; contact_email: string | null;
}

export interface InboxMessage {
  id: string; body: string; sender: string | null; sentAt: string | null; readAt: string | null;
}
