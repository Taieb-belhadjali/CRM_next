import { useEffect, useState, useMemo, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  CheckSquare,
  Users,
  Phone,
  Bell,
  ExternalLink,
  Trash2,
  RefreshCw,
  Lock,
  Globe,
  UserPlus,
} from "lucide-react";
import {
  listCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  syncCalendarEvent,
  listUsersPublic,
  listTasks,
  listMeetings,
  listCalls,
  type CalendarEvent,
  type CalendarEventPayload,
  type CalendarEventType,
  type CalendarEventVisibility,
  type AdminUser,
  type Task,
  type Meeting,
  type Call,
} from "../api";
import { useAuth } from "../hooks/useAuth";
import { SlideOver } from "../components/shared/SlideOver";

function startOfWeek(d: Date) {
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  const start = new Date(d);
  start.setDate(d.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const TYPE_ICONS: Record<CalendarEventType, React.ElementType> = {
  task: CheckSquare,
  meeting: Users,
  call: Phone,
  reminder: Bell,
  custom: Plus,
};

const TYPE_COLORS: Record<CalendarEventType, string> = {
  task: "border-l-amber-500 bg-amber-50/50 text-amber-700",
  meeting: "border-l-blue-500 bg-blue-50/50 text-blue-700",
  call: "border-l-violet-500 bg-violet-50/50 text-violet-700",
  reminder: "border-l-emerald-500 bg-emerald-50/50 text-emerald-700",
  custom: "border-l-zinc-400 bg-zinc-50/50 text-zinc-600",
};

const VISIBILITY_OPTIONS: { value: CalendarEventVisibility; label: string; icon: React.ElementType }[] = [
  { value: "private", label: "Private (owner only)", icon: Lock },
  { value: "team", label: "Team (everyone)", icon: Globe },
  { value: "shared", label: "Shared with specific people", icon: UserPlus },
];

const REMINDER_OPTIONS = [
  { value: 0, label: "None" },
  { value: 5, label: "5 minutes before" },
  { value: 15, label: "15 minutes before" },
  { value: 30, label: "30 minutes before" },
  { value: 60, label: "1 hour before" },
  { value: 1440, label: "1 day before" },
];

interface EventFormData {
  title: string;
  description: string;
  type: CalendarEventType;
  startAt: string;
  endAt: string;
  allDay: boolean;
  location: string;
  meetingLink: string;
  notes: string;
  status: CalendarEventStatus;
  visibility: CalendarEventVisibility;
  sharedWith: string[];
  reminderMinutes: number;
}

const emptyForm: EventFormData = {
  title: "",
  description: "",
  type: "custom",
  startAt: "",
  endAt: "",
  allDay: false,
  location: "",
  meetingLink: "",
  notes: "",
  status: "scheduled",
  visibility: "private",
  sharedWith: [],
  reminderMinutes: 15,
};

export default function CalendarPage() {
  const { token } = useAuth();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);

  const [slideOpen, setSlideOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [form, setForm] = useState<EventFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [syncing, setSyncing] = useState(false);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const today = new Date();

  const monthLabel = (() => {
    const months = new Set(days.map((d) => d.getMonth()));
    if (months.size === 1) return `${MONTH_NAMES[days[0].getMonth()]} ${days[0].getFullYear()}`;
    return `${MONTH_NAMES[days[0].getMonth()]} – ${MONTH_NAMES[days[6].getMonth()]} ${days[6].getFullYear()}`;
  })();

  function eventsForDay(day: Date): CalendarEvent[] {
    return events
      .filter((ev) => {
        if (!ev.startAt) return false;
        return sameDay(new Date(ev.startAt), day);
      })
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }

  function extraForDay(day: Date): (Task | Meeting | Call)[] {
    const result: (Task | Meeting | Call)[] = [];
    for (const t of tasks) {
      if (t.dueDate && sameDay(new Date(t.dueDate), day)) result.push(t);
    }
    for (const m of meetings) {
      if (m.scheduledAt && sameDay(new Date(m.scheduledAt), day)) result.push(m);
    }
    for (const c of calls) {
      if (c.scheduledAt && sameDay(new Date(c.scheduledAt), day)) result.push(c);
    }
    return result.sort((a, b) => {
      const ta = new Date((a as any).dueDate || (a as any).scheduledAt).getTime();
      const tb = new Date((b as any).dueDate || (b as any).scheduledAt).getTime();
      return ta - tb;
    });
  }

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    const currentDays = days;
    try {
      const [calRes, taskRes, meetingRes, callRes] = await Promise.all([
        listCalendarEvents(token, {
          from: currentDays[0].toISOString().slice(0, 10),
          to: currentDays[6].toISOString().slice(0, 10),
        }),
        listTasks(token, { limit: 200 }),
        listMeetings(token, { limit: 200 }),
        listCalls(token, { limit: 200 }),
      ]);
      setEvents(calRes.events);
      setTasks(taskRes.tasks);
      setMeetings(meetingRes.meetings);
      setCalls(callRes.calls);
    } catch {}
    setLoading(false);
  }, [token, days]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!token) return;
    listUsersPublic(token).then((u) => setUsers(Array.isArray(u) ? u : [])).catch(() => {});
  }, [token]);

  function openCreate(day?: Date) {
    setEditing(null);
    const base = day ? new Date(day) : new Date();
    base.setHours(9, 0, 0, 0);
    const end = new Date(base);
    end.setHours(end.getHours() + 1);

    const fmt = (d: Date) => {
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    setForm({
      ...emptyForm,
      startAt: fmt(base),
      endAt: fmt(end),
      reminderMinutes: 15,
    });
    setError("");
    setSlideOpen(true);
  }

  function openEdit(ev: CalendarEvent) {
    setEditing(ev);
    const fmt = (iso: string) => {
      const d = new Date(iso);
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    setForm({
      title: ev.title,
      description: ev.description || "",
      type: ev.type,
      startAt: ev.startAt ? fmt(ev.startAt) : "",
      endAt: ev.endAt ? fmt(ev.endAt) : "",
      allDay: ev.allDay,
      location: ev.location || "",
      meetingLink: ev.meetingLink || "",
      notes: ev.notes || "",
      status: ev.status,
      visibility: ev.visibility,
      sharedWith: ev.sharedWith?.map((u) => (typeof u === "string" ? u : u._id)) || [],
      reminderMinutes: ev.reminderMinutes || 15,
    });
    setError("");
    setSlideOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError("");
    try {
      const payload: CalendarEventPayload = {
        title: form.title.trim(),
        description: form.description || undefined,
        type: form.type,
        startAt: form.startAt,
        endAt: form.endAt || undefined,
        allDay: form.allDay,
        location: form.location || undefined,
        meetingLink: form.meetingLink || undefined,
        notes: form.notes || undefined,
        status: form.status,
        visibility: form.visibility,
        sharedWith: form.sharedWith,
        relatedTo: undefined,
        relatedToModel: undefined,
        reminderMinutes: form.reminderMinutes,
      };

      if (editing?._id) {
        await updateCalendarEvent(token, editing._id, payload);
      } else {
        await createCalendarEvent(token, payload);
      }
      setSlideOpen(false);
      setEditing(null);
      refresh();
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editing?._id || !token) return;
    if (!confirm("Delete this event?")) return;
    setSaving(true);
    setError("");
    try {
      await deleteCalendarEvent(token, editing._id);
      setSlideOpen(false);
      setEditing(null);
      refresh();
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSync() {
    if (!editing?._id || !token) return;
    setSyncing(true);
    setError("");
    try {
      await syncCalendarEvent(token, editing._id);
      refresh();
    } catch (err: any) {
      setError(err.message || "Sync failed.");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">Calendar</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{monthLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekStart((w) => addDays(w, -7))} className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700 transition-colors">
            <ChevronLeft className="w-4 h-4" strokeWidth={1.75} />
          </button>
          <button onClick={() => setWeekStart(startOfWeek(new Date()))} className="px-3 py-1.5 text-xs font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors">
            Today
          </button>
          <button onClick={() => setWeekStart((w) => addDays(w, 7))} className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700 transition-colors">
            <ChevronRight className="w-4 h-4" strokeWidth={1.75} />
          </button>
          <div className="w-px h-6 bg-zinc-200 mx-1" />
          <button onClick={() => openCreate()} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors">
            <Plus className="w-3.5 h-3.5" strokeWidth={2} /> New Event
          </button>
        </div>
      </div>

      {/* Week grid */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
        {/* Day header row */}
        <div className="grid grid-cols-7 border-b border-zinc-100">
          {days.map((day, i) => {
            const isToday = sameDay(day, today);
            return (
              <div key={i} className="px-3 py-3 text-center border-r border-zinc-100 last:border-r-0">
                <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-medium">{DAY_NAMES[i]}</p>
                <div className={`mx-auto mt-1 w-7 h-7 flex items-center justify-center rounded-full text-sm font-semibold ${isToday ? "bg-blue-500 text-white" : "text-zinc-700"}`}>
                  {day.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Events row */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <span className="w-5 h-5 border-2 border-zinc-300 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-7 min-h-[300px]">
            {days.map((day, i) => {
              const calItems = eventsForDay(day);
              const extraItems = extraForDay(day);
              const isToday = sameDay(day, today);
              return (
                <div key={i} className={`border-r border-zinc-100 last:border-r-0 p-2 space-y-1.5 ${isToday ? "bg-blue-50/30" : ""}`}>
                  {calItems.length === 0 && extraItems.length === 0 && (
                    <p className="text-[10px] text-zinc-200 text-center pt-4">—</p>
                  )}
                  {calItems.map((item) => {
                    const Icon = TYPE_ICONS[item.type] || Plus;
                    const colorClass = TYPE_COLORS[item.type] || TYPE_COLORS.custom;
                    return (
                      <div key={item._id} onClick={() => openEdit(item)} className={`rounded-lg border border-l-4 px-2 py-1.5 text-[11px] leading-snug cursor-pointer hover:shadow-sm transition-shadow ${colorClass}`}>
                        <div className="flex items-center gap-1">
                          <Icon className="w-3 h-3 flex-shrink-0" strokeWidth={1.75} />
                          <span className="truncate font-medium">{item.title}</span>
                        </div>
                        {!item.allDay && item.startAt && (
                          <p className="text-[10px] mt-0.5 opacity-80 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {formatTime(item.startAt)}
                            {item.endAt && ` – ${formatTime(item.endAt)}`}
                          </p>
                        )}
                        {item.allDay && <p className="text-[10px] mt-0.5 opacity-80">All day</p>}
                        {item.status === "completed" && (
                          <div className="mt-1 text-[10px] line-through opacity-70">Completed</div>
                        )}
                      </div>
                    );
                  })}
                  {extraItems.map((item) => {
                    const isTask = "status" in item && "priority" in item && !("scheduledAt" in item);
                    const isMeeting = "scheduledAt" in item && "durationMinutes" in item && !("direction" in item);
                    const Icon = isTask ? CheckSquare : isMeeting ? Users : Phone;
                    const colorClass = isTask ? TYPE_COLORS.task : isMeeting ? TYPE_COLORS.meeting : TYPE_COLORS.call;
                    const time = (item as any).dueDate || (item as any).scheduledAt;
                    return (
                      <div key={(item as any)._id} className={`rounded-lg border border-l-4 px-2 py-1.5 text-[11px] leading-snug ${colorClass}`}>
                        <div className="flex items-center gap-1">
                          <Icon className="w-3 h-3 flex-shrink-0" strokeWidth={1.75} />
                          <span className="truncate font-medium">{(item as any).title || (item as any).subject}</span>
                        </div>
                        {time && (
                          <p className="text-[10px] mt-0.5 opacity-80 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {formatTime(time)}
                          </p>
                        )}
                      </div>
                    );
                  })}
                  <button
                    onClick={() => openCreate(day)}
                    className="w-full py-1 rounded text-[10px] text-zinc-400 hover:text-blue-600 hover:bg-blue-50/50 transition-colors flex items-center justify-center gap-1 mt-1"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-zinc-400">
        {Object.entries(TYPE_COLORS).map(([type, color]) => {
          const Icon = TYPE_ICONS[type as CalendarEventType];
          return (
            <span key={type} className={`flex items-center gap-1.5 ${color.split(" ")[0]} px-2 py-0.5 rounded bg-white border border-zinc-200`}>
              <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </span>
          );
        })}
      </div>

      {/* Event Form SlideOver */}
      <SlideOver
        open={slideOpen}
        onClose={() => { setSlideOpen(false); setEditing(null); }}
        title={editing ? "Edit Event" : "New Event"}
        subtitle={editing ? `Event from ${new Date(editing.startAt).toLocaleString()}` : "Add a task, meeting, call, or reminder"}
        width="w-[480px]"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {error && <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              placeholder="Event title"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as CalendarEventType })}
                className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              >
                <option value="custom">Custom</option>
                <option value="task">Task</option>
                <option value="meeting">Meeting</option>
                <option value="call">Call</option>
                <option value="reminder">Reminder</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as CalendarEventStatus })}
                className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              >
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Start</label>
              <input
                type="datetime-local"
                value={form.startAt}
                onChange={(e) => setForm({ ...form, startAt: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">End</label>
              <input
                type="datetime-local"
                value={form.endAt}
                onChange={(e) => setForm({ ...form, endAt: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={form.allDay}
              onChange={(e) => setForm({ ...form, allDay: e.target.checked })}
              className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
            />
            All day
          </label>

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              placeholder="Brief description"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              placeholder="Internal notes"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Location</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                placeholder="Office / link / address"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Meeting link</label>
              <input
                type="text"
                value={form.meetingLink}
                onChange={(e) => setForm({ ...form, meetingLink: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                placeholder="https://..."
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">Visibility</label>
            <div className="flex gap-2">
              {VISIBILITY_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = form.visibility === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm({ ...form, visibility: opt.value, sharedWith: opt.value === "shared" ? form.sharedWith : [] })}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 text-xs rounded-lg border transition-colors ${
                      active
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
                    {opt.label.split("(")[0].trim()}
                  </button>
                );
              })}
            </div>
          </div>

          {form.visibility === "shared" && (
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Share with</label>
              <div className="max-h-32 overflow-y-auto border border-zinc-200 rounded-lg p-1">
                {users.map((u) => {
                  const selected = form.sharedWith.includes(u._id);
                  return (
                    <label
                      key={u._id}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-sm ${selected ? "bg-blue-50 text-blue-700" : "text-zinc-700 hover:bg-zinc-50"}`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() =>
                          setForm({
                            ...form,
                            sharedWith: selected
                              ? form.sharedWith.filter((id) => id !== u._id)
                              : [...form.sharedWith, u._id],
                          })
                        }
                        className="rounded border-zinc-300 text-blue-600"
                      />
                      <span className="truncate">{u.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">Reminder</label>
            <select
              value={form.reminderMinutes}
              onChange={(e) => setForm({ ...form, reminderMinutes: Number(e.target.value) })}
              className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            >
              {REMINDER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {editing && (
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleSync}
                disabled={syncing}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} strokeWidth={1.75} />
                {syncing ? "Syncing..." : editing.googleEventId ? "Sync again" : "Sync to Google Calendar"}
              </button>
              {editing.googleEventId && (
                <a
                  href={editing.googleCalendarId || `https://calendar.google.com/calendar/r/web#eventid=${editing.googleEventId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.75} />
                  Open in Google
                </a>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <div>
              {editing && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="inline-flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                  Delete
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { setSlideOpen(false); setEditing(null); }}
                className="px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : editing ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </form>
      </SlideOver>
    </div>
  );
}
