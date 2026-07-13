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
