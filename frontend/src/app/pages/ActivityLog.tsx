import { useEffect, useState } from "react";
import {
  Activity, LogIn, LogOut, UserPlus, UserX, UserCog,
  Contact, Building2, Users, FileUp, ArrowRightCircle,
  ShieldAlert, ChevronDown, Handshake, CheckSquare,
  Phone, Video, Ticket as TicketIcon, RefreshCw,
} from "lucide-react";
import { listActivity, listUsers, type ActivityLogEntry, type AdminUser } from "../api";
import { useAuth } from "../hooks/useAuth";
import { Pagination } from "../components/shared/Pagination";
import { SearchBar } from "../components/shared/SearchBar";

const LIMIT = 50;

// ── Action config ─────────────────────────────────────────────────────────────

const ACTION_META: Record<string, {
  label: string;
  icon: React.ElementType;
  colour: string;
  describe: (log: ActivityLogEntry) => string;
}> = {
  login:             { label: "Login",            icon: LogIn,           colour: "text-emerald-600 bg-emerald-50 border-emerald-200",
    describe: (l) => `${l.userName ?? l.userEmail ?? "Unknown"} signed in` },
  logout:            { label: "Logout",           icon: LogOut,          colour: "text-zinc-500 bg-zinc-100 border-zinc-200",
    describe: (l) => `${l.userName ?? l.userEmail ?? "Unknown"} signed out` },
  register:          { label: "Register",         icon: UserPlus,        colour: "text-blue-600 bg-blue-50 border-blue-200",
    describe: (l) => `New account created for ${l.entityLabel ?? l.userEmail ?? "unknown"}` },
  login_failed:      { label: "Login failed",     icon: ShieldAlert,     colour: "text-red-600 bg-red-50 border-red-200",
    describe: (l) => `Failed login attempt${l.meta?.email ? ` for ${l.meta.email}` : ""}` },

  contact_create:    { label: "Contact created",  icon: Contact,         colour: "text-blue-600 bg-blue-50 border-blue-200",
    describe: (l) => `${l.userName ?? "Someone"} created contact ${l.entityLabel ?? ""}` },
  contact_update:    { label: "Contact updated",  icon: Contact,         colour: "text-amber-600 bg-amber-50 border-amber-200",
    describe: (l) => `${l.userName ?? "Someone"} updated ${l.entityLabel ?? "a contact"}${fmtFields(l.meta?.fields)}` },
  contact_delete:    { label: "Contact deleted",  icon: Contact,         colour: "text-red-600 bg-red-50 border-red-200",
    describe: (l) => `${l.userName ?? "Someone"} deleted contact ${l.entityLabel ?? ""}` },

  account_create:    { label: "Account created",  icon: Building2,       colour: "text-blue-600 bg-blue-50 border-blue-200",
    describe: (l) => `${l.userName ?? "Someone"} created account ${l.entityLabel ?? ""}` },
  account_update:    { label: "Account updated",  icon: Building2,       colour: "text-amber-600 bg-amber-50 border-amber-200",
    describe: (l) => `${l.userName ?? "Someone"} updated ${l.entityLabel ?? "an account"}${fmtFields(l.meta?.fields)}` },
  account_delete:    { label: "Account deleted",  icon: Building2,       colour: "text-red-600 bg-red-50 border-red-200",
    describe: (l) => `${l.userName ?? "Someone"} deleted account ${l.entityLabel ?? ""}` },

  prospect_create:   { label: "Prospect created", icon: UserPlus,        colour: "text-blue-600 bg-blue-50 border-blue-200",
    describe: (l) => `${l.userName ?? "Someone"} added prospect ${l.entityLabel ?? ""}` },
  prospect_update:   { label: "Prospect updated", icon: UserCog,         colour: "text-amber-600 bg-amber-50 border-amber-200",
    describe: (l) => `${l.userName ?? "Someone"} updated ${l.entityLabel ?? "a prospect"}${fmtFields(l.meta?.fields)}` },
  prospect_delete:   { label: "Prospect deleted", icon: UserX,           colour: "text-red-600 bg-red-50 border-red-200",
    describe: (l) => `${l.userName ?? "Someone"} deleted prospect ${l.entityLabel ?? ""}` },
  prospect_import:   { label: "Prospects imported", icon: FileUp,        colour: "text-violet-600 bg-violet-50 border-violet-200",
    describe: (l) => `${l.userName ?? "Someone"} imported ${l.meta?.inserted ?? "?"} prospect${Number(l.meta?.inserted) !== 1 ? "s" : ""}${l.meta?.skipped ? `, ${l.meta.skipped} skipped` : ""}` },
  prospect_convert:  { label: "Prospect converted", icon: ArrowRightCircle, colour: "text-emerald-600 bg-emerald-50 border-emerald-200",
    describe: (l) => `${l.userName ?? "Someone"} converted ${l.entityLabel ?? "a prospect"} to contact${l.meta?.accountId ? " + account" : ""}` },

  deal_create:       { label: "Deal created",     icon: Handshake,       colour: "text-blue-600 bg-blue-50 border-blue-200",
    describe: (l) => `${l.userName ?? "Someone"} created deal "${l.entityLabel ?? ""}"` },
  deal_update:       { label: "Deal updated",     icon: Handshake,       colour: "text-amber-600 bg-amber-50 border-amber-200",
    describe: (l) => `${l.userName ?? "Someone"} updated deal "${l.entityLabel ?? ""}${fmtFields(l.meta?.fields)}"` },
  deal_delete:       { label: "Deal deleted",     icon: Handshake,       colour: "text-red-600 bg-red-50 border-red-200",
    describe: (l) => `${l.userName ?? "Someone"} deleted deal "${l.entityLabel ?? ""}"` },
  deal_stage_change: { label: "Stage changed",    icon: RefreshCw,       colour: "text-violet-600 bg-violet-50 border-violet-200",
    describe: (l) => `${l.userName ?? "Someone"} moved "${l.entityLabel ?? "a deal"}" to ${l.meta?.stage ?? "new stage"}` },

  task_create:       { label: "Task created",     icon: CheckSquare,     colour: "text-blue-600 bg-blue-50 border-blue-200",
    describe: (l) => `${l.userName ?? "Someone"} created task "${l.entityLabel ?? ""}"` },
  task_update:       { label: "Task updated",     icon: CheckSquare,     colour: "text-amber-600 bg-amber-50 border-amber-200",
    describe: (l) => `${l.userName ?? "Someone"} updated task "${l.entityLabel ?? ""}${fmtFields(l.meta?.fields)}"` },
  task_delete:       { label: "Task deleted",     icon: CheckSquare,     colour: "text-red-600 bg-red-50 border-red-200",
    describe: (l) => `${l.userName ?? "Someone"} deleted task "${l.entityLabel ?? ""}"` },

  call_create:       { label: "Call logged",      icon: Phone,           colour: "text-blue-600 bg-blue-50 border-blue-200",
    describe: (l) => `${l.userName ?? "Someone"} logged call "${l.entityLabel ?? ""}"` },
  call_update:       { label: "Call updated",     icon: Phone,           colour: "text-amber-600 bg-amber-50 border-amber-200",
    describe: (l) => `${l.userName ?? "Someone"} updated call "${l.entityLabel ?? ""}"` },
  call_delete:       { label: "Call deleted",     icon: Phone,           colour: "text-red-600 bg-red-50 border-red-200",
    describe: (l) => `${l.userName ?? "Someone"} deleted call "${l.entityLabel ?? ""}"` },

  meeting_create:    { label: "Meeting scheduled", icon: Video,          colour: "text-blue-600 bg-blue-50 border-blue-200",
    describe: (l) => `${l.userName ?? "Someone"} scheduled "${l.entityLabel ?? "a meeting"}"` },
  meeting_update:    { label: "Meeting updated",  icon: Video,           colour: "text-amber-600 bg-amber-50 border-amber-200",
    describe: (l) => `${l.userName ?? "Someone"} updated "${l.entityLabel ?? "a meeting"}"` },
  meeting_delete:    { label: "Meeting deleted",  icon: Video,           colour: "text-red-600 bg-red-50 border-red-200",
    describe: (l) => `${l.userName ?? "Someone"} deleted meeting "${l.entityLabel ?? ""}"` },

  ticket_create:     { label: "Ticket opened",    icon: TicketIcon,      colour: "text-blue-600 bg-blue-50 border-blue-200",
    describe: (l) => `${l.userName ?? "Someone"} opened ticket "${l.entityLabel ?? ""}"` },
  ticket_update:     { label: "Ticket updated",   icon: TicketIcon,      colour: "text-amber-600 bg-amber-50 border-amber-200",
    describe: (l) => `${l.userName ?? "Someone"} updated ticket "${l.entityLabel ?? ""}${fmtFields(l.meta?.fields)}"` },
  ticket_delete:     { label: "Ticket deleted",   icon: TicketIcon,      colour: "text-red-600 bg-red-50 border-red-200",
    describe: (l) => `${l.userName ?? "Someone"} deleted ticket "${l.entityLabel ?? ""}"` },

  user_create:       { label: "User created",     icon: UserPlus,        colour: "text-blue-600 bg-blue-50 border-blue-200",
    describe: (l) => `${l.userName ?? "An admin"} created user ${l.entityLabel ?? ""}${l.meta?.role ? ` (${l.meta.role})` : ""}` },
  user_update:       { label: "User updated",     icon: UserCog,         colour: "text-amber-600 bg-amber-50 border-amber-200",
    describe: (l) => `${l.userName ?? "An admin"} updated user ${l.entityLabel ?? ""}${fmtFields(l.meta?.fields)}` },
  user_delete:       { label: "User deleted",     icon: UserX,           colour: "text-red-600 bg-red-50 border-red-200",
    describe: (l) => `${l.userName ?? "An admin"} deleted user ${l.entityLabel ?? ""}` },
};

const ACTION_GROUPS = [
  { label: "Auth",      values: ["login", "logout", "register", "login_failed"] },
  { label: "Contacts",  values: ["contact_create", "contact_update", "contact_delete"] },
  { label: "Accounts",  values: ["account_create", "account_update", "account_delete"] },
  { label: "Prospects", values: ["prospect_create", "prospect_update", "prospect_delete", "prospect_import", "prospect_convert"] },
  { label: "Deals",     values: ["deal_create", "deal_update", "deal_delete", "deal_stage_change"] },
  { label: "Tasks",     values: ["task_create", "task_update", "task_delete"] },
  { label: "Calls",     values: ["call_create", "call_update", "call_delete"] },
  { label: "Meetings",  values: ["meeting_create", "meeting_update", "meeting_delete"] },
  { label: "Tickets",   values: ["ticket_create", "ticket_update", "ticket_delete"] },
  { label: "Users",     values: ["user_create", "user_update", "user_delete"] },
];

const ENTITY_OPTIONS = ["contact", "account", "prospect", "deal", "task", "call", "meeting", "ticket", "user"];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtFields(fields: unknown): string {
  if (!Array.isArray(fields) || !fields.length) return "";
  const LABELS: Record<string, string> = {
    status: "status", stage: "stage", priority: "priority", title: "title",
    name: "name", email: "email", role: "role", isActive: "active status",
    value: "value", dueDate: "due date", assignee: "assignee",
    description: "description", subject: "subject", notes: "notes",
    scheduledAt: "schedule", durationMinutes: "duration",
  };
  const readable = fields.map((f) => LABELS[f as string] ?? f).join(", ");
  return ` · changed ${readable}`;
}

function getInitials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

const AVATAR_COLOURS = ["bg-blue-500","bg-violet-500","bg-emerald-500","bg-amber-500","bg-rose-500","bg-teal-500"];
function avatarColour(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLOURS[Math.abs(h) % AVATAR_COLOURS.length];
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)  return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// ── Row ───────────────────────────────────────────────────────────────────────

function LogRow({ log }: { log: ActivityLogEntry }) {
  const meta = ACTION_META[log.action];
  const Icon = meta?.icon ?? Activity;
  const colour = meta?.colour ?? "text-zinc-400 bg-zinc-100 border-zinc-200";
  const description = meta?.describe(log) ?? log.action;

  return (
    <div className="flex items-start gap-4 px-5 py-3.5 hover:bg-zinc-50/80 transition-colors border-b border-zinc-50 last:border-0">
      {/* Icon */}
      <div className={`mt-0.5 w-7 h-7 rounded-lg border flex items-center justify-center flex-shrink-0 ${colour}`}>
        <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
      </div>

      {/* Description + meta */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-zinc-800 leading-snug">{description}</p>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          {/* User avatar + name */}
          {log.userEmail && (
            <span className="flex items-center gap-1.5">
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0 ${avatarColour(log.userEmail)}`}>
                {getInitials(log.userName)}
              </span>
              <span className="text-[11px] text-zinc-500">{log.userName ?? log.userEmail}</span>
            </span>
          )}
          {/* IP address */}
          {log.ip && log.ip !== "unknown" && (
            <span className="text-[11px] text-zinc-400 font-mono">{log.ip}</span>
          )}
          {/* Action badge */}
          <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${colour}`}>
            <Icon className="w-2.5 h-2.5" strokeWidth={2} />
            {meta?.label ?? log.action}
          </span>
        </div>
      </div>

      {/* Timestamp */}
      <div className="flex-shrink-0 text-right">
        <span
          className="text-xs text-zinc-400 whitespace-nowrap"
          title={new Date(log.createdAt).toLocaleString()}
        >
          {timeAgo(log.createdAt)}
        </span>
        <p className="text-[10px] text-zinc-300 mt-0.5">
          {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ActivityLogPage() {
  const { token } = useAuth();
  const [logs, setLogs]           = useState<ActivityLogEntry[]>([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [search, setSearch]       = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [userFilter, setUserFilter]     = useState("");
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [users, setUsers]         = useState<AdminUser[]>([]);

  useEffect(() => {
    if (!token) return;
    listUsers(token).then(setUsers).catch(() => {});
  }, [token]);

  useEffect(() => { setPage(1); }, [search, actionFilter, entityFilter, userFilter]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    listActivity(token, {
      page, limit: LIMIT,
      search: search || undefined,
      action: actionFilter || undefined,
      entity: entityFilter || undefined,
      user: userFilter || undefined,
    })
      .then((r) => { setLogs(r.logs); setTotal(r.total); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token, page, search, actionFilter, entityFilter, userFilter]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">Activity Log</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{total.toLocaleString()} event{total !== 1 ? "s" : ""}</p>
        </div>
        <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center">
          <Activity className="w-4 h-4 text-zinc-500" strokeWidth={1.75} />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px]">
          <SearchBar value={search} onChange={setSearch} placeholder="Search name, email, IP…" />
        </div>

        <div className="relative">
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" strokeWidth={1.75} />
          <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}
            className="appearance-none pl-3 pr-9 py-2 text-sm bg-white border border-zinc-200 rounded-lg text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors">
            <option value="">All actions</option>
            {ACTION_GROUPS.map((g) => (
              <optgroup key={g.label} label={g.label}>
                {g.values.map((v) => <option key={v} value={v}>{ACTION_META[v]?.label ?? v}</option>)}
              </optgroup>
            ))}
          </select>
        </div>

        <div className="relative">
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" strokeWidth={1.75} />
          <select value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)}
            className="appearance-none pl-3 pr-9 py-2 text-sm bg-white border border-zinc-200 rounded-lg text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors">
            <option value="">All entities</option>
            {ENTITY_OPTIONS.map((e) => <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>)}
          </select>
        </div>

        <div className="relative">
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" strokeWidth={1.75} />
          <select value={userFilter} onChange={(e) => setUserFilter(e.target.value)}
            className="appearance-none pl-3 pr-9 py-2 text-sm bg-white border border-zinc-200 rounded-lg text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors">
            <option value="">All users</option>
            {users.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
          </select>
        </div>
      </div>

      {error && <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      {/* Feed */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <span className="w-6 h-6 border-2 border-zinc-300 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Activity className="w-10 h-10 text-zinc-300" strokeWidth={1.25} />
            <p className="text-sm text-zinc-400">No activity found.</p>
          </div>
        ) : (
          <div>
            {logs.map((log) => <LogRow key={log._id} log={log} />)}
          </div>
        )}
      </div>

      <Pagination page={page} total={total} limit={LIMIT} onChange={setPage} />
    </div>
  );
}
