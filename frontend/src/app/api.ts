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

// ── Activity log ──────────────────────────────────────────────────────────────

export interface ActivityLogEntry {
  _id: string;
  user: string | null;
  userName: string | null;
  userEmail: string | null;
  action: string;
  entity: string | null;
  entityId: string | null;
  entityLabel: string | null;
  ip: string | null;
  userAgent: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
}

export function listActivity(
  token: string,
  params: {
    page?: number;
    limit?: number;
    user?: string;
    action?: string;
    entity?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  } = {}
) {
  const q = new URLSearchParams();
  if (params.page)     q.set("page",     String(params.page));
  if (params.limit)    q.set("limit",    String(params.limit));
  if (params.user)     q.set("user",     params.user);
  if (params.action)   q.set("action",   params.action);
  if (params.entity)   q.set("entity",   params.entity);
  if (params.search)   q.set("search",   params.search);
  if (params.dateFrom) q.set("dateFrom", params.dateFrom);
  if (params.dateTo)   q.set("dateTo",   params.dateTo);
  return request<{ logs: ActivityLogEntry[]; total: number; page: number; limit: number }>(
    `/api/admin/activity?${q}`,
    {},
    token
  );
}

// ── Deals ─────────────────────────────────────────────────────────────────────

export type DealStage = "prospection" | "proposition" | "negociation" | "gagne" | "perdu";

export interface Deal {
  _id: string;
  title: string;
  stage: DealStage;
  value: number;
  order: number;
  account?: { _id: string; name: string } | null;
  contacts?: { _id: string; firstName: string; lastName: string; email?: string }[];
  owner?: OwnerRef;
  expectedCloseDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DealPayload {
  title: string;
  stage?: DealStage;
  value?: number;
  account?: string | null;
  contacts?: string[];
  expectedCloseDate?: string | null;
  order?: number;
}

export function listDeals(token: string, params: PaginatedParams & { stage?: string } = {}) {
  const q = new URLSearchParams();
  if (params.search) q.set("search", params.search);
  if (params.page)   q.set("page",   String(params.page));
  if (params.limit)  q.set("limit",  String(params.limit));
  if (params.stage)  q.set("stage",  params.stage);
  return request<{ deals: Deal[]; total: number; page: number; limit: number }>(`/api/deals?${q}`, {}, token);
}
export function createDeal(token: string, payload: DealPayload) {
  return request<{ deal: Deal }>("/api/deals", { method: "POST", body: JSON.stringify(payload) }, token);
}
export function updateDeal(token: string, id: string, payload: Partial<DealPayload>) {
  return request<{ deal: Deal }>(`/api/deals/${id}`, { method: "PATCH", body: JSON.stringify(payload) }, token);
}
export function deleteDeal(token: string, id: string) {
  return request<{ message: string }>(`/api/deals/${id}`, { method: "DELETE" }, token);
}
export function reorderDeals(token: string, updates: { id: string; stage: DealStage; order: number }[]) {
  return request<{ ok: boolean }>("/api/deals/reorder", { method: "PATCH", body: JSON.stringify({ updates }) }, token);
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

export type TaskStatus   = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high";

export interface Task {
  _id: string;
  title: string;
  description?: string;
  dueDate?: string;
  priority: TaskPriority;
  status: TaskStatus;
  assignee?: OwnerRef | null;
  relatedTo?: string | null;
  relatedToModel?: "Prospect" | "Contact" | "Account" | "Deal" | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskPayload {
  title: string;
  description?: string;
  dueDate?: string | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  assignee?: string | null;
  relatedTo?: string | null;
  relatedToModel?: string | null;
}

export function listTasks(token: string, params: PaginatedParams & { status?: string; priority?: string; assignee?: string; relatedTo?: string } = {}) {
  const q = new URLSearchParams();
  if (params.search)    q.set("search",    params.search);
  if (params.page)      q.set("page",      String(params.page));
  if (params.limit)     q.set("limit",     String(params.limit));
  if (params.status)    q.set("status",    params.status);
  if (params.priority)  q.set("priority",  params.priority);
  if (params.assignee)  q.set("assignee",  params.assignee);
  if (params.relatedTo) q.set("relatedTo", params.relatedTo);
  return request<{ tasks: Task[]; total: number; page: number; limit: number }>(`/api/tasks?${q}`, {}, token);
}
export function createTask(token: string, payload: TaskPayload) {
  return request<{ task: Task }>("/api/tasks", { method: "POST", body: JSON.stringify(payload) }, token);
}
export function updateTask(token: string, id: string, payload: Partial<TaskPayload>) {
  return request<{ task: Task }>(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify(payload) }, token);
}
export function deleteTask(token: string, id: string) {
  return request<{ message: string }>(`/api/tasks/${id}`, { method: "DELETE" }, token);
}

// ── Calls ─────────────────────────────────────────────────────────────────────

export type CallStatus    = "scheduled" | "completed" | "missed" | "cancelled";
export type CallDirection = "inbound" | "outbound";

export interface Call {
  _id: string;
  subject: string;
  direction: CallDirection;
  status: CallStatus;
  durationMinutes: number;
  scheduledAt?: string;
  notes?: string;
  relatedTo?: string | null;
  relatedToModel?: "Contact" | "Prospect" | "Deal" | null;
  owner?: OwnerRef;
  createdAt: string;
  updatedAt: string;
}

export interface CallPayload {
  subject: string;
  direction?: CallDirection;
  status?: CallStatus;
  durationMinutes?: number;
  scheduledAt?: string | null;
  notes?: string;
  relatedTo?: string | null;
  relatedToModel?: string | null;
}

export function listCalls(token: string, params: PaginatedParams & { status?: string; direction?: string } = {}) {
  const q = new URLSearchParams();
  if (params.page)      q.set("page",      String(params.page));
  if (params.limit)     q.set("limit",     String(params.limit));
  if (params.status)    q.set("status",    params.status);
  if (params.direction) q.set("direction", params.direction);
  return request<{ calls: Call[]; total: number; page: number; limit: number }>(`/api/calls?${q}`, {}, token);
}
export function createCall(token: string, payload: CallPayload) {
  return request<{ call: Call }>("/api/calls", { method: "POST", body: JSON.stringify(payload) }, token);
}
export function updateCall(token: string, id: string, payload: Partial<CallPayload>) {
  return request<{ call: Call }>(`/api/calls/${id}`, { method: "PATCH", body: JSON.stringify(payload) }, token);
}
export function deleteCall(token: string, id: string) {
  return request<{ message: string }>(`/api/calls/${id}`, { method: "DELETE" }, token);
}

// ── Meetings ──────────────────────────────────────────────────────────────────

export interface Meeting {
  _id: string;
  title: string;
  scheduledAt: string;
  durationMinutes: number;
  location?: string;
  meetingLink?: string;
  notes?: string;
  participants?: OwnerRef[];
  relatedTo?: string | null;
  relatedToModel?: string | null;
  owner?: OwnerRef;
  createdAt: string;
  updatedAt: string;
}

export interface MeetingPayload {
  title: string;
  scheduledAt: string;
  durationMinutes?: number;
  location?: string;
  meetingLink?: string;
  notes?: string;
  participants?: string[];
  relatedTo?: string | null;
  relatedToModel?: string | null;
}

export function listMeetings(token: string, params: { page?: number; limit?: number; from?: string; to?: string } = {}) {
  const q = new URLSearchParams();
  if (params.page)  q.set("page",  String(params.page));
  if (params.limit) q.set("limit", String(params.limit));
  if (params.from)  q.set("from",  params.from);
  if (params.to)    q.set("to",    params.to);
  return request<{ meetings: Meeting[]; total: number; page: number; limit: number }>(`/api/meetings?${q}`, {}, token);
}
export function createMeeting(token: string, payload: MeetingPayload) {
  return request<{ meeting: Meeting }>("/api/meetings", { method: "POST", body: JSON.stringify(payload) }, token);
}
export function updateMeeting(token: string, id: string, payload: Partial<MeetingPayload>) {
  return request<{ meeting: Meeting }>(`/api/meetings/${id}`, { method: "PATCH", body: JSON.stringify(payload) }, token);
}
export function deleteMeeting(token: string, id: string) {
  return request<{ message: string }>(`/api/meetings/${id}`, { method: "DELETE" }, token);
}

// ── Tickets ───────────────────────────────────────────────────────────────────

export type TicketStatus   = "open" | "in_progress" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "urgent";

export interface Ticket {
  _id: string;
  subject: string;
  description?: string;
  status: TicketStatus;
  priority: TicketPriority;
  contact?: { _id: string; firstName: string; lastName: string; email?: string } | null;
  account?: { _id: string; name: string } | null;
  assignee?: OwnerRef | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TicketPayload {
  subject: string;
  description?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  contact?: string | null;
  account?: string | null;
  assignee?: string | null;
}

export function listTickets(token: string, params: PaginatedParams & { status?: string; priority?: string } = {}) {
  const q = new URLSearchParams();
  if (params.search)   q.set("search",   params.search);
  if (params.page)     q.set("page",     String(params.page));
  if (params.limit)    q.set("limit",    String(params.limit));
  if (params.status)   q.set("status",   params.status);
  if (params.priority) q.set("priority", params.priority);
  return request<{ tickets: Ticket[]; total: number; page: number; limit: number }>(`/api/tickets?${q}`, {}, token);
}
export function createTicket(token: string, payload: TicketPayload) {
  return request<{ ticket: Ticket }>("/api/tickets", { method: "POST", body: JSON.stringify(payload) }, token);
}
export function updateTicket(token: string, id: string, payload: Partial<TicketPayload>) {
  return request<{ ticket: Ticket }>(`/api/tickets/${id}`, { method: "PATCH", body: JSON.stringify(payload) }, token);
}
export function deleteTicket(token: string, id: string) {
  return request<{ message: string }>(`/api/tickets/${id}`, { method: "DELETE" }, token);
}

// ── Quotes ────────────────────────────────────────────────────────────────────

export type QuoteStatus = "draft" | "sent" | "accepted" | "rejected";

export interface LineItem {
  description: string;
  quantity:    number;
  unitPrice:   number;
  taxRate:     number;
  subtotal?:   number;
  taxAmount?:  number;
  total?:      number;
}

export interface Quote {
  _id: string;
  number: string;
  title: string;
  status: QuoteStatus;
  issueDate?: string;
  validUntil?: string;
  lineItems: LineItem[];
  subtotal:   number;
  taxTotal:   number;
  grandTotal: number;
  notes?: string;
  terms?: string;
  invoiceId?: string | null;
  deal?:    { _id: string; title: string } | null;
  contact?: { _id: string; firstName: string; lastName: string; email?: string } | null;
  account?: { _id: string; name: string } | null;
  owner?:   OwnerRef;
  createdAt: string;
  updatedAt: string;
}

export interface QuotePayload {
  title: string;
  status?: QuoteStatus;
  issueDate?: string | null;
  validUntil?: string | null;
  deal?: string | null;
  contact?: string | null;
  account?: string | null;
  lineItems?: LineItem[];
  notes?: string;
  terms?: string;
}

export function listQuotes(token: string, params: PaginatedParams & { status?: string } = {}) {
  const q = new URLSearchParams();
  if (params.search) q.set("search", params.search);
  if (params.page)   q.set("page",   String(params.page));
  if (params.limit)  q.set("limit",  String(params.limit));
  if (params.status) q.set("status", params.status);
  return request<{ quotes: Quote[]; total: number; page: number; limit: number }>(`/api/quotes?${q}`, {}, token);
}
export function getQuote(token: string, id: string) {
  return request<{ quote: Quote }>(`/api/quotes/${id}`, {}, token);
}
export function createQuote(token: string, payload: QuotePayload) {
  return request<{ quote: Quote }>("/api/quotes", { method: "POST", body: JSON.stringify(payload) }, token);
}
export function updateQuote(token: string, id: string, payload: Partial<QuotePayload>) {
  return request<{ quote: Quote }>(`/api/quotes/${id}`, { method: "PATCH", body: JSON.stringify(payload) }, token);
}
export function deleteQuote(token: string, id: string) {
  return request<{ message: string }>(`/api/quotes/${id}`, { method: "DELETE" }, token);
}
export function convertQuote(token: string, id: string, options: { dueDate?: string; paymentInfo?: string } = {}) {
  return request<{ invoice: Invoice; quote: Quote }>(`/api/quotes/${id}/convert`, { method: "POST", body: JSON.stringify(options) }, token);
}
export function downloadPdf(token: string, type: "quote" | "invoice", id: string): Promise<Blob> {
  const path = type === "quote" ? `/api/quotes/${id}/pdf` : `/api/invoices/${id}/pdf`;
  return fetch(`${BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => {
    if (!r.ok) throw new Error("PDF generation failed.");
    return r.blob();
  });
}

// ── Invoices ──────────────────────────────────────────────────────────────────

export type InvoiceStatus = "draft" | "sent" | "unpaid" | "partial" | "paid" | "cancelled";

export interface Invoice {
  _id: string;
  number: string;
  title: string;
  status: InvoiceStatus;
  issueDate?: string;
  dueDate?: string;
  paidDate?: string;
  paidAmount: number;
  quoteId?: string | null;
  lineItems: LineItem[];
  subtotal:   number;
  taxTotal:   number;
  grandTotal: number;
  notes?: string;
  terms?: string;
  paymentInfo?: string;
  deal?:    { _id: string; title: string } | null;
  contact?: { _id: string; firstName: string; lastName: string; email?: string } | null;
  account?: { _id: string; name: string } | null;
  owner?:   OwnerRef;
  createdAt: string;
  updatedAt: string;
}

export interface InvoicePayload {
  title: string;
  status?: InvoiceStatus;
  issueDate?: string | null;
  dueDate?: string | null;
  paidDate?: string | null;
  paidAmount?: number;
  deal?: string | null;
  contact?: string | null;
  account?: string | null;
  lineItems?: LineItem[];
  notes?: string;
  terms?: string;
  paymentInfo?: string;
}

export function listInvoices(token: string, params: PaginatedParams & { status?: string; overdue?: boolean } = {}) {
  const q = new URLSearchParams();
  if (params.search)  q.set("search",  params.search);
  if (params.page)    q.set("page",    String(params.page));
  if (params.limit)   q.set("limit",   String(params.limit));
  if (params.status)  q.set("status",  params.status);
  if (params.overdue) q.set("overdue", "true");
  return request<{ invoices: Invoice[]; total: number; page: number; limit: number }>(`/api/invoices?${q}`, {}, token);
}
export function getInvoice(token: string, id: string) {
  return request<{ invoice: Invoice }>(`/api/invoices/${id}`, {}, token);
}
export function createInvoice(token: string, payload: InvoicePayload) {
  return request<{ invoice: Invoice }>("/api/invoices", { method: "POST", body: JSON.stringify(payload) }, token);
}
export function updateInvoice(token: string, id: string, payload: Partial<InvoicePayload>) {
  return request<{ invoice: Invoice }>(`/api/invoices/${id}`, { method: "PATCH", body: JSON.stringify(payload) }, token);
}
export function deleteInvoice(token: string, id: string) {
  return request<{ message: string }>(`/api/invoices/${id}`, { method: "DELETE" }, token);
}

// ── Orders ─────────────────────────────────────────────────────────────────────

export type OrderStatus = "pending" | "confirmed" | "fulfilled" | "cancelled";

export interface Order {
  _id: string;
  number: string;
  title: string;
  status: OrderStatus;
  sourceType?: "quote" | "invoice" | null;
  sourceId?: string | null;
  lineItems: LineItem[];
  subtotal:   number;
  taxTotal:   number;
  grandTotal: number;
  notes?: string;
  terms?: string;
  deal?:    { _id: string; title: string } | null;
  contact?: { _id: string; firstName: string; lastName: string; email?: string } | null;
  account?: { _id: string; name: string } | null;
  owner?:   OwnerRef;
  createdAt: string;
  updatedAt: string;
}

export interface OrderPayload {
  title: string;
  status?: OrderStatus;
  sourceType?: "quote" | "invoice" | null;
  sourceId?: string | null;
  deal?: string | null;
  contact?: string | null;
  account?: string | null;
  lineItems?: LineItem[];
  notes?: string;
  terms?: string;
}

export function listOrders(token: string, params: PaginatedParams & { status?: string } = {}) {
  const q = new URLSearchParams();
  if (params.search) q.set("search", params.search);
  if (params.page)   q.set("page",   String(params.page));
  if (params.limit)  q.set("limit",  String(params.limit));
  if (params.status) q.set("status", params.status);
  return request<{ orders: Order[]; total: number; page: number; limit: number }>(`/api/orders?${q}`, {}, token);
}
export function getOrder(token: string, id: string) {
  return request<{ order: Order }>(`/api/orders/${id}`, {}, token);
}
export function createOrder(token: string, payload: OrderPayload) {
  return request<{ order: Order }>("/api/orders", { method: "POST", body: JSON.stringify(payload) }, token);
}
export function updateOrder(token: string, id: string, payload: Partial<OrderPayload>) {
  return request<{ order: Order }>(`/api/orders/${id}`, { method: "PATCH", body: JSON.stringify(payload) }, token);
}
export function deleteOrder(token: string, id: string) {
  return request<{ message: string }>(`/api/orders/${id}`, { method: "DELETE" }, token);
}
export function convertToOrder(token: string, sourceType: "quote" | "invoice", sourceId: string) {
  return request<{ order: Order }>(`/api/${sourceType}s/${sourceId}/convert-to-order`, { method: "POST" }, token);
}

// ── Purchase Orders ────────────────────────────────────────────────────────────

export type PurchaseOrderStatus = "pending" | "ordered" | "received" | "cancelled";

export interface PurchaseOrder {
  _id: string;
  number: string;
  title: string;
  status: PurchaseOrderStatus;
  supplier: string;
  lineItems: LineItem[];
  subtotal:   number;
  taxTotal:   number;
  grandTotal: number;
  notes?: string;
  deal?:    { _id: string; title: string } | null;
  contact?: { _id: string; firstName: string; lastName: string; email?: string } | null;
  account?: { _id: string; name: string } | null;
  owner?:   OwnerRef;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderPayload {
  title: string;
  status?: PurchaseOrderStatus;
  supplier: string;
  deal?: string | null;
  contact?: string | null;
  account?: string | null;
  lineItems?: LineItem[];
  notes?: string;
}

export function listPurchaseOrders(token: string, params: PaginatedParams & { status?: string } = {}) {
  const q = new URLSearchParams();
  if (params.search) q.set("search", params.search);
  if (params.page)   q.set("page",   String(params.page));
  if (params.limit)  q.set("limit",  String(params.limit));
  if (params.status) q.set("status", params.status);
  return request<{ purchaseOrders: PurchaseOrder[]; total: number; page: number; limit: number }>(`/api/purchase-orders?${q}`, {}, token);
}
export function getPurchaseOrder(token: string, id: string) {
  return request<{ purchaseOrder: PurchaseOrder }>(`/api/purchase-orders/${id}`, {}, token);
}
export function createPurchaseOrder(token: string, payload: PurchaseOrderPayload) {
  return request<{ purchaseOrder: PurchaseOrder }>("/api/purchase-orders", { method: "POST", body: JSON.stringify(payload) }, token);
}
export function updatePurchaseOrder(token: string, id: string, payload: Partial<PurchaseOrderPayload>) {
  return request<{ purchaseOrder: PurchaseOrder }>(`/api/purchase-orders/${id}`, { method: "PATCH", body: JSON.stringify(payload) }, token);
}
export function deletePurchaseOrder(token: string, id: string) {
  return request<{ message: string }>(`/api/purchase-orders/${id}`, { method: "DELETE" }, token);
}

// ── Deliveries ────────────────────────────────────────────────────────────────

export type DeliveryStatus = "preparing" | "shipped" | "delivered";

export interface Delivery {
  _id: string;
  number: string;
  orderId: string;
  invoiceId?: string | null;
  trackingNumber: string;
  status: DeliveryStatus;
  carrier?: string | null;
  estimatedDelivery?: string | null;
  deliveredAt?: string | null;
  notes?: string | null;
  order?: { _id: string; number: string; title: string } | null;
  invoice?: { _id: string; number: string; title: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryPayload {
  orderId: string;
  invoiceId?: string | null;
  trackingNumber: string;
  status?: DeliveryStatus;
  carrier?: string | null;
  estimatedDelivery?: string | null;
  notes?: string | null;
}

export function listDeliveries(token: string, params: PaginatedParams & { status?: string; orderId?: string } = {}) {
  const q = new URLSearchParams();
  if (params.search) q.set("search", params.search);
  if (params.page)   q.set("page",   String(params.page));
  if (params.limit)  q.set("limit",  String(params.limit));
  if (params.status) q.set("status", params.status);
  if (params.orderId) q.set("orderId", params.orderId);
  return request<{ deliveries: Delivery[]; total: number; page: number; limit: number }>(`/api/deliveries?${q}`, {}, token);
}
export function getDelivery(token: string, id: string) {
  return request<{ delivery: Delivery }>(`/api/deliveries/${id}`, {}, token);
}
export function createDelivery(token: string, payload: DeliveryPayload) {
  return request<{ delivery: Delivery }>("/api/deliveries", { method: "POST", body: JSON.stringify(payload) }, token);
}
export function updateDelivery(token: string, id: string, payload: Partial<DeliveryPayload>) {
  return request<{ delivery: Delivery }>(`/api/deliveries/${id}`, { method: "PATCH", body: JSON.stringify(payload) }, token);
}
export function deleteDelivery(token: string, id: string) {
  return request<{ message: string }>(`/api/deliveries/${id}`, { method: "DELETE" }, token);
}
