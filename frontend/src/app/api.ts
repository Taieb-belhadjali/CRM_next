import type { AuthUser } from "./context/authTypes";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export function loginApi(email: string, password: string) {
  return request<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role?: "admin" | "commercial";
}

export interface RegisterResponse {
  id: string;
  name: string;
  email: string;
  role: "admin" | "commercial";
}

export function registerApi(payload: RegisterPayload) {
  return request<RegisterResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getMe(token: string) {
  return request<AuthUser>("/api/auth/me", {}, token).then(
    // /me returns { user: {...} }
    (res: unknown) => {
      const r = res as { user: AuthUser };
      return r.user ?? (res as AuthUser);
    }
  );
}

// ── Admin: Users ──────────────────────────────────────────────────────────────

export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "commercial";
  isActive: boolean;
  createdAt: string;
}

export function listUsers(token: string) {
  return request<{ users: AdminUser[] }>("/api/admin/users", {}, token).then(
    (r) => r.users
  );
}

export function toggleUserActive(token: string, userId: string, isActive: boolean) {
  return request<{ user: AdminUser }>(
    `/api/admin/users/${userId}`,
    { method: "PATCH", body: JSON.stringify({ isActive }) },
    token
  );
}

export function changeUserRole(token: string, userId: string, role: "admin" | "commercial") {
  return request<{ user: AdminUser }>(
    `/api/admin/users/${userId}`,
    { method: "PATCH", body: JSON.stringify({ role }) },
    token
  );
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  role?: "admin" | "commercial";
  isActive?: boolean;
}

export function updateUser(token: string, userId: string, payload: UpdateUserPayload) {
  return request<{ user: AdminUser }>(
    `/api/admin/users/${userId}`,
    { method: "PATCH", body: JSON.stringify(payload) },
    token
  );
}

export function deleteUser(token: string, userId: string) {
  return request<{ message: string }>(
    `/api/admin/users/${userId}`,
    { method: "DELETE" },
    token
  );
}

export function inviteUser(token: string, payload: RegisterPayload) {
  return request<RegisterResponse>(
    "/api/admin/users",
    { method: "POST", body: JSON.stringify(payload) },
    token
  );
}

// ── Shared ────────────────────────────────────────────────────────────────────

export interface PaginatedParams {
  search?: string;
  page?: number;
  limit?: number;
}

export interface OwnerRef {
  _id: string;
  name: string;
  email: string;
}

// ── Contacts ──────────────────────────────────────────────────────────────────

export interface Contact {
  _id: string;
  firstName: string;
  lastName: string;
  jobTitle?: string;
  email?: string;
  phone?: string;
  address?: string;
  account?: { _id: string; name: string; sector?: string } | null;
  owner?: OwnerRef;
  createdAt: string;
  updatedAt: string;
}

export interface ContactPayload {
  firstName: string;
  lastName: string;
  jobTitle?: string;
  email?: string;
  phone?: string;
  address?: string;
  account?: string | null;
}

export function listContacts(
  token: string,
  params: PaginatedParams & { account?: string } = {}
) {
  const q = new URLSearchParams();
  if (params.search) q.set("search", params.search);
  if (params.page) q.set("page", String(params.page));
  if (params.limit) q.set("limit", String(params.limit));
  if (params.account) q.set("account", params.account);
  return request<{ contacts: Contact[]; total: number; page: number; limit: number }>(
    `/api/contacts?${q}`,
    {},
    token
  );
}

export function getContact(token: string, id: string) {
  return request<{ contact: Contact }>(`/api/contacts/${id}`, {}, token);
}

export function createContact(token: string, payload: ContactPayload) {
  return request<{ contact: Contact }>(
    "/api/contacts",
    { method: "POST", body: JSON.stringify(payload) },
    token
  );
}

export function updateContact(token: string, id: string, payload: Partial<ContactPayload>) {
  return request<{ contact: Contact }>(
    `/api/contacts/${id}`,
    { method: "PATCH", body: JSON.stringify(payload) },
    token
  );
}

export function deleteContact(token: string, id: string) {
  return request<{ message: string }>(`/api/contacts/${id}`, { method: "DELETE" }, token);
}

// ── Accounts ──────────────────────────────────────────────────────────────────

export type AccountSize = "1-10" | "11-50" | "51-200" | "201-500" | "500+";
export type AccountStatus = "active" | "inactive" | "disputed";

export interface Account {
  _id: string;
  name: string;
  siret?: string;
  sector?: string;
  size?: AccountSize;
  estimatedRevenue?: number;
  status: AccountStatus;
  address?: string;
  owner?: OwnerRef;
  createdAt: string;
  updatedAt: string;
}

export interface AccountPayload {
  name: string;
  siret?: string;
  sector?: string;
  size?: AccountSize;
  estimatedRevenue?: number;
  status?: AccountStatus;
  address?: string;
}

export function listAccounts(
  token: string,
  params: PaginatedParams & { status?: string } = {}
) {
  const q = new URLSearchParams();
  if (params.search) q.set("search", params.search);
  if (params.page) q.set("page", String(params.page));
  if (params.limit) q.set("limit", String(params.limit));
  if (params.status) q.set("status", params.status);
  return request<{ accounts: Account[]; total: number; page: number; limit: number }>(
    `/api/accounts?${q}`,
    {},
    token
  );
}

export function getAccount(token: string, id: string) {
  return request<{ account: Account; contacts: Contact[] }>(`/api/accounts/${id}`, {}, token);
}

export function createAccount(token: string, payload: AccountPayload) {
  return request<{ account: Account }>(
    "/api/accounts",
    { method: "POST", body: JSON.stringify(payload) },
    token
  );
}

export function updateAccount(token: string, id: string, payload: Partial<AccountPayload>) {
  return request<{ account: Account }>(
    `/api/accounts/${id}`,
    { method: "PATCH", body: JSON.stringify(payload) },
    token
  );
}

export function deleteAccount(token: string, id: string) {
  return request<{ message: string }>(`/api/accounts/${id}`, { method: "DELETE" }, token);
}

// ── Prospects ─────────────────────────────────────────────────────────────────

export type ProspectStatus = "new" | "contacted" | "qualified" | "converted" | "unqualified";

export interface ProspectLocation {
  type: "Point";
  coordinates: [number, number]; // [lng, lat]
}

export interface Prospect {
  _id: string;
  firstName: string;
  lastName: string;
  company?: string;
  jobTitle?: string;
  email?: string;
  phone?: string;
  address?: string;
  location?: ProspectLocation;
  source: "manual" | "import" | "web_form";
  status: ProspectStatus;
  tags: string[];
  owner?: OwnerRef;
  createdAt: string;
  updatedAt: string;
}

export interface ProspectPayload {
  firstName: string;
  lastName: string;
  company?: string;
  jobTitle?: string;
  email?: string;
  phone?: string;
  address?: string;
  location?: ProspectLocation | null;
  source?: "manual" | "import" | "web_form";
  status?: ProspectStatus;
  tags?: string[];
}

export function listProspects(
  token: string,
  params: PaginatedParams & { status?: string; tag?: string; owner?: string } = {}
) {
  const q = new URLSearchParams();
  if (params.search) q.set("search", params.search);
  if (params.page) q.set("page", String(params.page));
  if (params.limit) q.set("limit", String(params.limit));
  if (params.status) q.set("status", params.status);
  if (params.tag) q.set("tag", params.tag);
  if (params.owner) q.set("owner", params.owner);
  return request<{ prospects: Prospect[]; total: number; page: number; limit: number }>(
    `/api/prospects?${q}`,
    {},
    token
  );
}

export function getProspect(token: string, id: string) {
  return request<{ prospect: Prospect }>(`/api/prospects/${id}`, {}, token);
}

export function createProspect(token: string, payload: ProspectPayload) {
  return request<{ prospect: Prospect }>(
    "/api/prospects",
    { method: "POST", body: JSON.stringify(payload) },
    token
  );
}

export function updateProspect(token: string, id: string, payload: Partial<ProspectPayload>) {
  return request<{ prospect: Prospect }>(
    `/api/prospects/${id}`,
    { method: "PATCH", body: JSON.stringify(payload) },
    token
  );
}

export function deleteProspect(token: string, id: string) {
  return request<{ message: string }>(`/api/prospects/${id}`, { method: "DELETE" }, token);
}

export function convertProspect(
  token: string,
  prospectId: string,
  createAccount: boolean
) {
  return request<{ prospect: Prospect; contact: Contact; account: Account | null }>(
    "/api/prospects/convert",
    { method: "POST", body: JSON.stringify({ prospectId, createAccount }) },
    token
  );
}

export function importProspects(token: string, rows: Record<string, string>[]) {
  return request<{ inserted: number; skipped: number; errors: { row: number; error: string }[] }>(
    "/api/prospects/import",
    { method: "POST", body: JSON.stringify({ rows }) },
    token
  );
}

/** Returns a download URL — caller opens it directly */
export function exportProspectsUrl(
  params: { status?: string; tag?: string; owner?: string } = {}
) {
  const q = new URLSearchParams();
  if (params.status) q.set("status", params.status);
  if (params.tag) q.set("tag", params.tag);
  if (params.owner) q.set("owner", params.owner);
  return `${BASE}/api/prospects/export?${q}`;
}
