import { useEffect, useRef, useState } from "react";
import { Plus, CheckCircle2, Circle, Pencil, Trash2, Clock, CheckSquare } from "lucide-react";
import { listTasks, createTask, updateTask, deleteTask, listUsers, type Task, type TaskPayload, type TaskPriority, type TaskStatus, type AdminUser } from "../api";
import { useAuth } from "../hooks/useAuth";
import { SlideOver } from "../components/shared/SlideOver";
import { ConfirmDelete } from "../components/shared/ConfirmDelete";
import { Pagination } from "../components/shared/Pagination";
import { SearchBar } from "../components/shared/SearchBar";
import { FormField, inputCls, selectCls } from "../components/shared/FormField";

const LIMIT = 50;

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  high:   "bg-red-50 text-red-600 border border-red-200",
  medium: "bg-amber-50 text-amber-600 border border-amber-200",
  low:    "bg-zinc-100 text-zinc-500 border border-zinc-200",
};

const STATUS_OPTIONS: TaskStatus[]   = ["todo", "in_progress", "done"];
const PRIORITY_OPTIONS: TaskPriority[] = ["high", "medium", "low"];

// ── Form ──────────────────────────────────────────────────────────────────────

function TaskForm({ initial, users, onSave, onCancel, token }: { initial?: Task | null; users: AdminUser[]; onSave: (t: Task) => void; onCancel: () => void; token: string }) {
  const [form, setForm] = useState<TaskPayload>({
    title:       initial?.title       ?? "",
    description: initial?.description ?? "",
    dueDate:     initial?.dueDate ? initial.dueDate.slice(0, 10) : "",
    priority:    initial?.priority    ?? "medium",
    status:      initial?.status      ?? "todo",
    assignee:    (initial?.assignee as { _id: string } | null | undefined)?._id ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const set = (k: keyof TaskPayload) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title?.trim()) { setError("Title is required."); return; }
    setError(""); setLoading(true);
    try {
      const payload = { ...form, assignee: form.assignee || null, dueDate: form.dueDate || null };
      const res = initial ? await updateTask(token, initial._id, payload) : await createTask(token, payload);
      onSave(res.task);
    } catch (err) { setError(err instanceof Error ? err.message : "Something went wrong."); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Title" required>
        <input className={inputCls} value={form.title} onChange={set("title")} placeholder="Send proposal to Acme Corp" />
      </FormField>
      <FormField label="Description">
        <textarea className={inputCls} rows={3} value={form.description ?? ""} onChange={set("description")} placeholder="Details…" />
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Priority">
          <select className={selectCls} value={form.priority} onChange={set("priority")}>
            {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </select>
        </FormField>
        <FormField label="Status">
          <select className={selectCls} value={form.status} onChange={set("status")}>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s === "in_progress" ? "In progress" : s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </FormField>
      </div>
      <FormField label="Due date">
        <input className={inputCls} type="date" value={form.dueDate ?? ""} onChange={set("dueDate")} />
      </FormField>
      <FormField label="Assignee">
        <select className={selectCls} value={form.assignee ?? ""} onChange={set("assignee")}>
          <option value="">— Unassigned —</option>
          {users.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
        </select>
      </FormField>
      {error && <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 py-2.5 text-sm font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors">Cancel</button>
        <button type="submit" disabled={loading} className="flex-1 flex items-center justify-center py-2.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-60 rounded-lg transition-colors">
          {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : initial ? "Save changes" : "Create task"}
        </button>
      </div>
    </form>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Tasks() {
  const { token } = useAuth();
  const [tasks, setTasks]     = useState<Task[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState("");
  const [statusFilter, setStatusFilter]     = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [editing, setEditing] = useState<Task | null | "new">(null);
  const [deleting, setDeleting]     = useState<Task | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const usersLoaded = useRef(false);

  useEffect(() => {
    if (!token || usersLoaded.current) return;
    usersLoaded.current = true;
    listUsers(token).then(setUsers).catch(() => {});
  }, [token]);

  useEffect(() => { setPage(1); }, [search, statusFilter, priorityFilter]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    listTasks(token, { search, page, limit: LIMIT, status: statusFilter || undefined, priority: priorityFilter || undefined })
      .then((r) => { setTasks(r.tasks); setTotal(r.total); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token, search, page, statusFilter, priorityFilter]);

  const toggleDone = async (t: Task) => {
    if (!token) return;
    const newStatus: TaskStatus = t.status === "done" ? "todo" : "done";
    try {
      const { task } = await updateTask(token, t._id, { status: newStatus });
      setTasks((prev) => prev.map((x) => (x._id === t._id ? task : x)));
    } catch (e) { setError(e instanceof Error ? e.message : "Update failed."); }
  };

  const handleSaved = (t: Task) => {
    setTasks((prev) => {
      const idx = prev.findIndex((x) => x._id === t._id);
      if (idx >= 0) return prev.map((x) => (x._id === t._id ? t : x));
      setTotal((n) => n + 1);
      return [t, ...prev];
    });
    setEditing(null);
  };

  const handleDelete = async () => {
    if (!token || !deleting) return;
    setDeleteLoading(true);
    try {
      await deleteTask(token, deleting._id);
      setTasks((prev) => prev.filter((x) => x._id !== deleting._id));
      setTotal((n) => n - 1);
      setDeleting(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Delete failed."); }
    finally { setDeleteLoading(false); }
  };

  const isOverdue = (t: Task) => t.dueDate && t.status !== "done" && new Date(t.dueDate) < new Date();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">Tasks</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{total} task{total !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={() => setEditing("new")} className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus className="w-4 h-4" strokeWidth={1.75} /> New task
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px]"><SearchBar value={search} onChange={setSearch} placeholder="Search tasks…" /></div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors">
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s === "in_progress" ? "In progress" : s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="px-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors">
          <option value="">All priorities</option>
          {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
        </select>
      </div>

      {error && <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20"><span className="w-6 h-6 border-2 border-zinc-300 border-t-blue-500 rounded-full animate-spin" /></div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <CheckSquare className="w-10 h-10 text-zinc-300" strokeWidth={1.25} />
            <p className="text-sm text-zinc-400">No tasks found.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-50">
            {tasks.map((t) => (
              <div key={t._id} className={`flex items-start gap-3 px-5 py-4 hover:bg-zinc-50 transition-colors ${t.status === "done" ? "opacity-60" : ""}`}>
                <button onClick={() => toggleDone(t)} className="mt-0.5 flex-shrink-0">
                  {t.status === "done"
                    ? <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500" strokeWidth={1.75} />
                    : <Circle className="w-4.5 h-4.5 text-zinc-300 hover:text-zinc-500 transition-colors" strokeWidth={1.75} />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${t.status === "done" ? "line-through text-zinc-400" : "text-zinc-800"}`}>{t.title}</p>
                  {t.description && <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">{t.description}</p>}
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${PRIORITY_STYLES[t.priority]}`}>{t.priority}</span>
                    {t.dueDate && (
                      <span className={`flex items-center gap-1 text-[10px] ${isOverdue(t) ? "text-red-500" : "text-zinc-400"}`}>
                        <Clock className="w-3 h-3" strokeWidth={1.75} />
                        {new Date(t.dueDate).toLocaleDateString()}
                        {isOverdue(t) && " · Overdue"}
                      </span>
                    )}
                    {t.assignee && <span className="text-[10px] text-zinc-400">{(t.assignee as { name: string }).name}</span>}
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => setEditing(t)} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors"><Pencil className="w-3.5 h-3.5" strokeWidth={1.75} /></button>
                  <button onClick={() => setDeleting(t)} className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Pagination page={page} total={total} limit={LIMIT} onChange={setPage} />

      <SlideOver open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "New task" : "Edit task"}>
        {editing !== null && <TaskForm initial={editing === "new" ? null : editing} users={users} token={token!} onSave={handleSaved} onCancel={() => setEditing(null)} />}
      </SlideOver>

      {deleting && <ConfirmDelete name={deleting.title} onConfirm={handleDelete} onCancel={() => setDeleting(null)} loading={deleteLoading} />}
    </div>
  );
}
