import { useEffect, useRef, useState } from "react";
import {
  Activity, LogIn, LogOut, UserPlus, UserX, UserCog,
  Contact, Building2, Users, FileUp, ArrowRightCircle,
  ShieldAlert, ChevronDown, Handshake, CheckSquare,
  Phone, Video, Ticket as TicketIcon, RefreshCw, X,
  Search, Sparkles,
} from "lucide-react";
import { listActivity, listUsers, type ActivityLogEntry, type AdminUser } from "../api";
import { useAuth } from "../hooks/useAuth";
import { useLanguage } from "../context/LanguageContext";
import { Pagination } from "../components/shared/Pagination";

const LIMIT = 50;

const ACTION_META: Record<string, {
  labelKey: string; icon: React.ElementType; colour: string;
  describe: (log: ActivityLogEntry, t: (key: string, params?: Record<string, string>) => string) => string;
}> = {
  login:            { labelKey: "actions.login",              icon: LogIn,            colour: "text-emerald-600 bg-emerald-50 border-emerald-200",  describe: (l, t) => t("actions.login", { name: l.userName ?? l.userEmail ?? "Unknown" }) },
  logout:           { labelKey: "actions.logout",             icon: LogOut,           colour: "text-zinc-500 bg-zinc-100 border-zinc-200",          describe: (l, t) => t("actions.logout", { name: l.userName ?? l.userEmail ?? "Unknown" }) },
  register:         { labelKey: "actions.register",           icon: UserPlus,         colour: "text-blue-600 bg-blue-50 border-blue-200",           describe: (l, t) => t("actions.register", { email: l.entityLabel ?? l.userEmail ?? "unknown" }) },
  login_failed:     { labelKey: "actions.loginFailed",       icon: ShieldAlert,      colour: "text-red-600 bg-red-50 border-red-200",              describe: (l, t) => t("actions.loginFailed", { email: l.meta?.email ? ` for ${l.meta.email}` : "" }) },
  contact_create:   { labelKey: "actions.contactCreate",    icon: Contact,          colour: "text-blue-600 bg-blue-50 border-blue-200",           describe: (l, t) => t("actions.contactCreate", { label: l.entityLabel ?? "" }) },
  contact_update:   { labelKey: "actions.contactUpdate",    icon: Contact,          colour: "text-amber-600 bg-amber-50 border-amber-200",        describe: (l, t) => t("actions.contactUpdate", { label: l.entityLabel ?? "a contact" }) + fmtFields(l.meta?.fields) },
  contact_delete:   { labelKey: "actions.contactDelete",    icon: Contact,          colour: "text-red-600 bg-red-50 border-red-200",              describe: (l, t) => t("actions.contactDelete", { label: l.entityLabel ?? "" }) },
  account_create:   { labelKey: "actions.accountCreate",    icon: Building2,        colour: "text-blue-600 bg-blue-50 border-blue-200",           describe: (l, t) => t("actions.accountCreate", { label: l.entityLabel ?? "" }) },
  account_update:   { labelKey: "actions.accountUpdate",    icon: Building2,        colour: "text-amber-600 bg-amber-50 border-amber-200",        describe: (l, t) => t("actions.accountUpdate", { label: l.entityLabel ?? "an account" }) + fmtFields(l.meta?.fields) },
  account_delete:   { labelKey: "actions.accountDelete",    icon: Building2,        colour: "text-red-600 bg-red-50 border-red-200",              describe: (l, t) => t("actions.accountDelete", { label: l.entityLabel ?? "" }) },
  prospect_create:  { labelKey: "actions.prospectCreate",   icon: UserPlus,         colour: "text-blue-600 bg-blue-50 border-blue-200",           describe: (l, t) => t("actions.prospectCreate", { label: l.entityLabel ?? "" }) },
  prospect_update:  { labelKey: "actions.prospectUpdate",   icon: UserCog,          colour: "text-amber-600 bg-amber-50 border-amber-200",        describe: (l, t) => t("actions.prospectUpdate", { label: l.entityLabel ?? "a prospect" }) + fmtFields(l.meta?.fields) },
  prospect_delete:  { labelKey: "actions.prospectDelete",   icon: UserX,            colour: "text-red-600 bg-red-50 border-red-200",              describe: (l, t) => t("actions.prospectDelete", { label: l.entityLabel ?? "" }) },
  prospect_import:  { labelKey: "actions.prospectImport",   icon: FileUp,           colour: "text-violet-600 bg-violet-50 border-violet-200",     describe: (l, t) => `${l.userName ?? t("common.someone")} ${t("actions.prospectImport", { count: l.meta?.inserted ?? "?", skipped: l.meta?.skipped ? `, ${l.meta.skipped} skipped` : "" })}` },
  prospect_convert: { labelKey: "actions.prospectConvert",  icon: ArrowRightCircle, colour: "text-emerald-600 bg-emerald-50 border-emerald-200",  describe: (l, t) => `${l.userName ?? t("common.someone")} ${t("actions.prospectConvert", { label: l.entityLabel ?? "a prospect", account: l.meta?.accountId ? " + account" : "" })}` },
  deal_create:      { labelKey: "actions.dealCreate",       icon: Handshake,        colour: "text-blue-600 bg-blue-50 border-blue-200",           describe: (l, t) => `${l.userName ?? t("common.someone")} ${t("actions.dealCreate", { label: l.entityLabel ?? "" })}` },
  deal_update:      { labelKey: "actions.dealUpdate",       icon: Handshake,        colour: "text-amber-600 bg-amber-50 border-amber-200",        describe: (l, t) => `${l.userName ?? t("common.someone")} ${t("actions.dealUpdate", { label: l.entityLabel ?? "" })}${fmtFields(l.meta?.fields)}` },
  deal_delete:      { labelKey: "actions.dealDelete",       icon: Handshake,        colour: "text-red-600 bg-red-50 border-red-200",              describe: (l, t) => `${l.userName ?? t("common.someone")} ${t("actions.dealDelete", { label: l.entityLabel ?? "" })}` },
  deal_stage_change:{ labelKey: "actions.dealStageChange",  icon: RefreshCw,        colour: "text-violet-600 bg-violet-50 border-violet-200",     describe: (l, t) => `${l.userName ?? t("common.someone")} ${t("actions.dealStageChange", { label: l.entityLabel ?? "a deal", stage: l.meta?.stage ?? "new stage" })}` },
  task_create:      { labelKey: "actions.taskCreate",       icon: CheckSquare,      colour: "text-blue-600 bg-blue-50 border-blue-200",           describe: (l, t) => `${l.userName ?? t("common.someone")} ${t("actions.taskCreate", { label: l.entityLabel ?? "" })}` },
  task_update:      { labelKey: "actions.taskUpdate",       icon: CheckSquare,      colour: "text-amber-600 bg-amber-50 border-amber-200",        describe: (l, t) => `${l.userName ?? t("common.someone")} ${t("actions.taskUpdate", { label: l.entityLabel ?? "" })}${fmtFields(l.meta?.fields)}` },
  task_delete:      { labelKey: "actions.taskDelete",       icon: CheckSquare,      colour: "text-red-600 bg-red-50 border-red-200",              describe: (l, t) => `${l.userName ?? t("common.someone")} ${t("actions.taskDelete", { label: l.entityLabel ?? "" })}` },
  call_create:      { labelKey: "actions.callCreate",       icon: Phone,            colour: "text-blue-600 bg-blue-50 border-blue-200",           describe: (l, t) => `${l.userName ?? t("common.someone")} ${t("actions.callCreate", { label: l.entityLabel ?? "" })}` },
  call_update:      { labelKey: "actions.callUpdate",       icon: Phone,            colour: "text-amber-600 bg-amber-50 border-amber-200",        describe: (l, t) => `${l.userName ?? t("common.someone")} ${t("actions.callUpdate", { label: l.entityLabel ?? "" })}` },
  call_delete:      { labelKey: "actions.callDelete",       icon: Phone,            colour: "text-red-600 bg-red-50 border-red-200",              describe: (l, t) => `${l.userName ?? t("common.someone")} ${t("actions.callDelete", { label: l.entityLabel ?? "" })}` },
  meeting_create:   { labelKey: "actions.meetingCreate",    icon: Video,            colour: "text-blue-600 bg-blue-50 border-blue-200",           describe: (l, t) => `${l.userName ?? t("common.someone")} ${t("actions.meetingCreate", { label: l.entityLabel ?? "a meeting" })}` },
  meeting_update:   { labelKey: "actions.meetingUpdate",    icon: Video,            colour: "text-amber-600 bg-amber-50 border-amber-200",        describe: (l, t) => `${l.userName ?? t("common.someone")} ${t("actions.meetingUpdate", { label: l.entityLabel ?? "a meeting" })}` },
  meeting_delete:   { labelKey: "actions.meetingDelete",    icon: Video,            colour: "text-red-600 bg-red-50 border-red-200",              describe: (l, t) => `${l.userName ?? t("common.someone")} ${t("actions.meetingDelete", { label: l.entityLabel ?? "" })}` },
  ticket_create:    { labelKey: "actions.ticketCreate",     icon: TicketIcon,       colour: "text-blue-600 bg-blue-50 border-blue-200",           describe: (l, t) => `${l.userName ?? t("common.someone")} ${t("actions.ticketCreate", { label: l.entityLabel ?? "" })}` },
  ticket_update:    { labelKey: "actions.ticketUpdate",     icon: TicketIcon,       colour: "text-amber-600 bg-amber-50 border-amber-200",        describe: (l, t) => `${l.userName ?? t("common.someone")} ${t("actions.ticketUpdate", { label: l.entityLabel ?? "" })}${fmtFields(l.meta?.fields)}` },
  ticket_delete:    { labelKey: "actions.ticketDelete",     icon: TicketIcon,       colour: "text-red-600 bg-red-50 border-red-200",              describe: (l, t) => `${l.userName ?? t("common.someone")} ${t("actions.ticketDelete", { label: l.entityLabel ?? "" })}` },
  user_create:      { labelKey: "actions.userCreate",       icon: UserPlus,         colour: "text-blue-600 bg-blue-50 border-blue-200",           describe: (l, t) => `${l.userName ?? t("common.someone")} ${t("actions.userCreate", { label: l.entityLabel ?? "" })}${l.meta?.role ? ` (${l.meta.role})` : ""}` },
  user_update:      { labelKey: "actions.userUpdate",       icon: UserCog,          colour: "text-amber-600 bg-amber-50 border-amber-200",        describe: (l, t) => `${l.userName ?? t("common.someone")} ${t("actions.userUpdate", { label: l.entityLabel ?? "" })}${fmtFields(l.meta?.fields)}` },
  user_delete:      { labelKey: "actions.userDelete",       icon: UserX,            colour: "text-red-600 bg-red-50 border-red-200",              describe: (l, t) => `${l.userName ?? t("common.someone")} ${t("actions.userDelete", { label: l.entityLabel ?? "" })}` },
};

const ACTION_GROUPS = [
  { label: "activityLog.groupAuth",      values: ["login","logout","register","login_failed"] },
  { label: "activityLog.groupContacts",  values: ["contact_create","contact_update","contact_delete"] },
  { label: "activityLog.groupAccounts",  values: ["account_create","account_update","account_delete"] },
  { label: "activityLog.groupProspects", values: ["prospect_create","prospect_update","prospect_delete","prospect_import","prospect_convert"] },
  { label: "activityLog.groupDeals",     values: ["deal_create","deal_update","deal_delete","deal_stage_change"] },
  { label: "activityLog.groupTasks",     values: ["task_create","task_update","task_delete"] },
  { label: "activityLog.groupCalls",     values: ["call_create","call_update","call_delete"] },
  { label: "activityLog.groupMeetings",  values: ["meeting_create","meeting_update","meeting_delete"] },
  { label: "activityLog.groupTickets",   values: ["ticket_create","ticket_update","ticket_delete"] },
  { label: "activityLog.groupUsers",     values: ["user_create","user_update","user_delete"] },
];

const ENTITY_OPTIONS = ["contact","account","prospect","deal","task","call","meeting","ticket","user"];

const KEYWORD_ACTION: Record<string, string> = {
  login: "login", "signed in": "login", "logged in": "login",
  logout: "logout", "signed out": "logout", "logged out": "logout",
  register: "register", registered: "register",
  "login failed": "login_failed", "failed login": "login_failed",
  "stage changed": "deal_stage_change", "moved deal": "deal_stage_change",
  imported: "prospect_import", "import": "prospect_import",
  converted: "prospect_convert", convert: "prospect_convert",
};

const KEYWORD_ENTITY: Record<string, string> = {
  contact: "contact", contacts: "contact",
  account: "account", accounts: "account",
  prospect: "prospect", prospects: "prospect",
  deal: "deal", deals: "deal",
  task: "task", tasks: "task",
  call: "call", calls: "call",
  meeting: "meeting", meetings: "meeting",
  ticket: "ticket", tickets: "ticket",
  user: "user", users: "user",
};

const KEYWORD_VERB: Record<string, string> = {
  created: "create", added: "create", new: "create",
  updated: "update", edited: "update", changed: "update",
  deleted: "delete", removed: "delete",
};

function todayRange(): { dateFrom: string; dateTo: string } {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const from = d.toISOString();
  d.setHours(23, 59, 59, 999);
  return { dateFrom: from, dateTo: d.toISOString() };
}

function yesterdayRange(): { dateFrom: string; dateTo: string } {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  d.setHours(0, 0, 0, 0);
  const from = d.toISOString();
  d.setHours(23, 59, 59, 999);
  return { dateFrom: from, dateTo: d.toISOString() };
}

function thisWeekRange(): { dateFrom: string; dateTo: string } {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  const from = d.toISOString();
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { dateFrom: from, dateTo: end.toISOString() };
}

interface ParsedQuery {
  text: string;
  action: string;
  entity: string;
  dateFrom: string;
  dateTo: string;
  chips: { key: string; label: string }[];
}

function parseQuery(raw: string, users: AdminUser[]): ParsedQuery {
  const result: ParsedQuery = { text: "", action: "", entity: "", dateFrom: "", dateTo: "", chips: [] };
  let remaining = raw.toLowerCase().trim();

  if (/\btoday\b/.test(remaining)) {
    const r = todayRange();
    result.dateFrom = r.dateFrom; result.dateTo = r.dateTo;
    result.chips.push({ key: "date", label: "Today" });
    remaining = remaining.replace(/\btoday\b/, "").trim();
  } else if (/\byesterday\b/.test(remaining)) {
    const r = yesterdayRange();
    result.dateFrom = r.dateFrom; result.dateTo = r.dateTo;
    result.chips.push({ key: "date", label: "Yesterday" });
    remaining = remaining.replace(/\byesterday\b/, "").trim();
  } else if (/\bthis\s*week\b/.test(remaining)) {
    const r = thisWeekRange();
    result.dateFrom = r.dateFrom; result.dateTo = r.dateTo;
    result.chips.push({ key: "date", label: "This week" });
    remaining = remaining.replace(/\bthis\s*week\b/, "").trim();
  }

  const ipMatch = remaining.match(/\b(?:ip[:\s]?)?((?:\d{1,3}\.){3}\d{1,3})\b/);
  if (ipMatch) {
    result.chips.push({ key: "ip", label: `IP: ${ipMatch[1]}` });
  }

  for (const [kw, action] of Object.entries(KEYWORD_ACTION)) {
    if (remaining.includes(kw) && !result.action) {
      result.action = action;
      result.chips.push({ key: "action", label: ACTION_META[action]?.labelKey ?? action });
      remaining = remaining.replace(kw, "").trim();
      break;
    }
  }

  const tokens = remaining.split(/\s+/).filter(Boolean);
  const remaining2: string[] = [];

  for (const token of tokens) {
    if (!result.entity && KEYWORD_ENTITY[token]) {
      result.entity = KEYWORD_ENTITY[token];
      result.chips.push({ key: "entity", label: result.entity.charAt(0).toUpperCase() + result.entity.slice(1) });
    } else if (!result.action && KEYWORD_VERB[token] && result.entity) {
      result.action = `${result.entity}_${KEYWORD_VERB[token]}`;
      const existingEntityChip = result.chips.find((c) => c.key === "entity");
      if (existingEntityChip) {
        result.chips = result.chips.filter((c) => c.key !== "entity");
        result.chips.push({ key: "action", label: ACTION_META[result.action]?.labelKey ?? result.action });
        result.entity = "";
      }
    } else if (!result.action && KEYWORD_VERB[token]) {
      remaining2.push(token);
    } else {
      const matchedUser = users.find((u) =>
        u.name.toLowerCase().includes(token) || u.email.toLowerCase().includes(token)
      );
      if (matchedUser) {
        result.chips.push({ key: "userName", label: matchedUser.name });
      } else {
        remaining2.push(token);
      }
    }
  }

  result.text = remaining2.join(" ").trim();
  return result;
}

function fmtFields(fields: unknown): string {
  if (!Array.isArray(fields) || !fields.length) return "";
  const LABELS: Record<string, string> = {
    status: "status", stage: "stage", priority: "priority", title: "title",
    name: "name", email: "email", role: "role", isActive: "active status",
    value: "value", dueDate: "due date", assignee: "assignee",
    description: "description", subject: "subject", notes: "notes",
    scheduledAt: "schedule", durationMinutes: "duration",
  };
  return ` · changed ${fields.map((f) => LABELS[f as string] ?? f).join(", ")}`;
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

function LogRow({ log }: { log: ActivityLogEntry }) {
  const { t } = useLanguage();
  const meta        = ACTION_META[log.action];
  const Icon        = meta?.icon ?? Activity;
  const colour      = meta?.colour ?? "text-zinc-400 bg-zinc-100 border-zinc-200";
  const description = meta?.describe(log, t) ?? log.action;

  return (
    <div className="flex items-start gap-4 px-5 py-3.5 hover:bg-zinc-50/80 transition-colors border-b border-zinc-50 last:border-0">
      <div className={`mt-0.5 w-7 h-7 rounded-lg border flex items-center justify-center flex-shrink-0 ${colour}`}>
        <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-zinc-800 leading-snug">{description}</p>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          {log.userEmail && (
            <span className="flex items-center gap-1.5">
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0 ${avatarColour(log.userEmail)}`}>
                {getInitials(log.userName)}
              </span>
              <span className="text-[11px] text-zinc-500">{log.userName ?? log.userEmail}</span>
            </span>
          )}
          {log.ip && log.ip !== "unknown" && (
            <span className="text-[11px] text-zinc-400 font-mono">{log.ip}</span>
          )}
          <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${colour}`}>
            <Icon className="w-2.5 h-2.5" strokeWidth={2} />
            {meta?.labelKey ?? log.action}
          </span>
        </div>
      </div>
      <div className="flex-shrink-0 text-right">
        <span className="text-xs text-zinc-400 whitespace-nowrap" title={new Date(log.createdAt).toLocaleString()}>
          {timeAgo(log.createdAt)}
        </span>
        <p className="text-[10px] text-zinc-300 mt-0.5">
          {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
}

interface SmartSearchProps {
  value: string;
  onChange: (v: string) => void;
  chips: { key: string; label: string }[];
  onRemoveChip: (key: string) => void;
  placeholder?: string;
}

function SmartSearchInput({ value, onChange, chips, onRemoveChip, placeholder }: SmartSearchProps) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [local, setLocal] = useState(value);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(local), 350);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [local]);

  useEffect(() => { setLocal(value); }, [value]);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" strokeWidth={1.75} />
        <Sparkles className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-300" strokeWidth={1.75} />
        <input
          type="text"
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-9 pr-9 py-2 text-sm bg-white border border-zinc-200 rounded-lg text-zinc-700 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors"
        />
        {local && (
          <button onClick={() => { setLocal(""); onChange(""); }}
            className="absolute right-8 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <span key={chip.key}
              className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {chip.label}
              <button onClick={() => onRemoveChip(chip.key)} className="hover:text-red-500 transition-colors ml-0.5">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <button onClick={() => { setLocal(""); onChange(""); onRemoveChip("all"); }}
            className="text-[11px] text-zinc-400 hover:text-zinc-600 transition-colors px-1">
            {t("activityLog.clearAll")}
          </button>
        </div>
      )}
    </div>
  );
}

export default function ActivityLogPage() {
  const { token } = useAuth();
  const { t } = useLanguage();
  const [logs, setLogs]     = useState<ActivityLogEntry[]>([]);
  const [total, setTotal]   = useState(0);
  const [page, setPage]     = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState("");
  const [users, setUsers]   = useState<AdminUser[]>([]);

  const [rawSearch, setRawSearch] = useState("");
  const [smartText,   setSmartText]   = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [userFilter,   setUserFilter]   = useState("");
  const [dateFrom,     setDateFrom]     = useState("");
  const [dateTo,       setDateTo]       = useState("");
  const [chips,        setChips]        = useState<{ key: string; label: string }[]>([]);

  useEffect(() => {
    if (!token) return;
    listUsers(token).then(setUsers).catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!rawSearch.trim()) {
      setSmartText(""); setChips([]);
      setActionFilter(""); setEntityFilter("");
      setDateFrom(""); setDateTo("");
      return;
    }
    const parsed = parseQuery(rawSearch, users);
    setSmartText(parsed.text);
    setChips(parsed.chips);
    if (parsed.action)   setActionFilter(parsed.action);
    if (parsed.entity)   setEntityFilter(parsed.entity);
    if (parsed.dateFrom) setDateFrom(parsed.dateFrom);
    if (parsed.dateTo)   setDateTo(parsed.dateTo);
  }, [rawSearch, users]);

  useEffect(() => { setPage(1); }, [smartText, actionFilter, entityFilter, userFilter, dateFrom, dateTo]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    listActivity(token, {
      page, limit: LIMIT,
      search:   smartText   || rawSearch || undefined,
      action:   actionFilter || undefined,
      entity:   entityFilter || undefined,
      user:     userFilter   || undefined,
      dateFrom: dateFrom     || undefined,
      dateTo:   dateTo       || undefined,
    })
      .then((r) => { setLogs(r.logs); setTotal(r.total); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token, page, smartText, rawSearch, actionFilter, entityFilter, userFilter, dateFrom, dateTo]);

  const handleRemoveChip = (key: string) => {
    if (key === "all") {
      setRawSearch(""); setSmartText(""); setChips([]);
      setActionFilter(""); setEntityFilter("");
      setDateFrom(""); setDateTo(""); setUserFilter("");
      return;
    }
    setChips((prev) => prev.filter((c) => c.key !== key));
    if (key === "action")   setActionFilter("");
    if (key === "entity")   setEntityFilter("");
    if (key === "date")     { setDateFrom(""); setDateTo(""); }
    if (key === "userName") setRawSearch((prev) => prev.replace(/\b\w+\b/g, (w) => {
      const matched = users.find((u) => u.name.toLowerCase().includes(w.toLowerCase()));
      return matched ? "" : w;
    }).trim());
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">{t("pages.activityLog.title")}</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{total.toLocaleString()} {t("pages.activityLog.countLabel")}</p>
        </div>
        <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center">
          <Activity className="w-4 h-4 text-zinc-500" strokeWidth={1.75} />
        </div>
      </div>

      <div className="space-y-1.5">
        <SmartSearchInput
          value={rawSearch}
          onChange={setRawSearch}
          chips={chips}
          onRemoveChip={handleRemoveChip}
          placeholder={t("pages.activityLog.searchPlaceholder")}
        />
        <p className="text-[11px] text-zinc-400 px-1">
          {t("activityLog.hint")}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" strokeWidth={1.75} />
          <select value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setChips((p) => p.filter((c) => c.key !== "action")); }}
            className="appearance-none pl-3 pr-9 py-2 text-sm bg-white border border-zinc-200 rounded-lg text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors">
            <option value="">{t("activityLog.allActions")}</option>
            {ACTION_GROUPS.map((g) => (
              <optgroup key={g.label} label={t(g.label)}>
                {g.values.map((v) => <option key={v} value={v}>{t(ACTION_META[v]?.labelKey ?? v)}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
        <div className="relative">
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" strokeWidth={1.75} />
          <select value={entityFilter} onChange={(e) => { setEntityFilter(e.target.value); setChips((p) => p.filter((c) => c.key !== "entity")); }}
            className="appearance-none pl-3 pr-9 py-2 text-sm bg-white border border-zinc-200 rounded-lg text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors">
            <option value="">{t("activityLog.allEntities")}</option>
            {ENTITY_OPTIONS.map((e) => <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>)}
          </select>
        </div>
        <div className="relative">
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" strokeWidth={1.75} />
          <select value={userFilter} onChange={(e) => setUserFilter(e.target.value)}
            className="appearance-none pl-3 pr-9 py-2 text-sm bg-white border border-zinc-200 rounded-lg text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors">
            <option value="">{t("activityLog.allUsers")}</option>
            {users.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
          </select>
        </div>
        {(dateFrom || dateTo) && (
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 font-medium">
            {dateFrom ? new Date(dateFrom).toLocaleDateString() : "…"}
            {" – "}
            {dateTo ? new Date(dateTo).toLocaleDateString() : "…"}
            <button onClick={() => { setDateFrom(""); setDateTo(""); setChips((p) => p.filter((c) => c.key !== "date")); }}
              className="hover:text-red-500 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <span className="w-6 h-6 border-2 border-zinc-300 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Activity className="w-10 h-10 text-zinc-300" strokeWidth={1.25} />
            <p className="text-sm text-zinc-400">{t("activityLog.noResults")}</p>
            {rawSearch && <p className="text-xs text-zinc-400">{t("activityLog.tryThese")}: <code className="bg-zinc-100 px-1 rounded">login today</code>, <code className="bg-zinc-100 px-1 rounded">sophie deleted</code>, <code className="bg-zinc-100 px-1 rounded">deals this week</code></p>}
          </div>
        ) : (
          <div>{logs.map((log) => <LogRow key={log._id} log={log} />)}</div>
        )}
      </div>

      <Pagination page={page} total={total} limit={LIMIT} onChange={setPage} />
    </div>
  );
}
