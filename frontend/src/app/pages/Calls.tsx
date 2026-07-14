import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed } from "lucide-react";
import { listCalls, createCall, updateCall, deleteCall, type Call, type CallPayload, type CallStatus, type CallDirection } from "../api";
import { useAuth } from "../hooks/useAuth";
import { SlideOver } from "../components/shared/SlideOver";
import { ConfirmDelete } from "../components/shared/ConfirmDelete";
import { Pagination } from "../components/shared/Pagination";
import { SearchBar } from "../components/shared/SearchBar";
import { FormField, inputCls, selectCls } from "../components/shared/FormField";

const LIMIT = 25;

const STATUS_STYLES: Record<CallStatus, string> = {
  scheduled:  "bg-blue-50 text-blue-700 border-blue-200",
  completed:  "bg-emerald-50 text-emerald-700 border-emerald-200",
  missed:     "bg-red-50 text-red-600 border-red-200",
  cancelled:  "bg-zinc-100 text-zinc-500 border-zinc-200",
};

function DirectionIcon({ direction }: { direction: CallDirection }) {
  if (direction === "inbound") return <PhoneIncoming className="w-3.5 h-3.5 text-emerald-500" strokeWidth={1.75} />;
  return <PhoneOutgoing className="w-3.5 h-3.5 text-blue-500" strokeWidth={1.75} />;
}

function StatusBadge({ status }: { status: CallStatus }) {
  return (
    <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full border ${STATUS_STYLES[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ── Form ──────────────────────────────────────────────────────────────────────

function CallForm({ initial, onSave, onCancel, token }: { initial?: Call | null; onSave: (c: Call) => void; onCancel: () => void; token: string }) {
  const [form, setForm] = useState<CallPayload>({
    subject:         initial?.subject         ?? "",
    direction:       initial?.direction       ?? "outbound",
    status:          initial?.status          ?? "completed",
    durationMinutes: initial?.durationMinutes ?? 0,
    scheduledAt:     initial?.scheduledAt ? initial.scheduledAt.slice(0, 16) : "",
    notes:           initial?.notes           ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const set = (k: keyof CallPayload) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject?.trim()) { setError("Subject is required."); return; }
    setError(""); setLoading(true);
    try {
      const payload = { ...form, durationMinutes: Number(form.durationMinutes) || 0, scheduledAt: form.scheduledAt || null };
      const res = initial ? await updateCall(token, initial._id, payload) : await createCall(token, payload);
      onSave(res.call);
    } catch (err) { setError(err instanceof Error ? err.message : "Something went wrong."); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Subject" required>
        <input className={inputCls} value={form.subject} onChange={set("subject")} placeholder="Call with Acme Corp" />
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Direction">
          <select className={selectCls} value={form.direction} onChange={set("direction")}>
            <option value="outbound">Outbound</option>
            <option value="inbound">Inbound</option>
          </select>
        </FormField>
        <FormField label="Status">
          <select className={selectCls} value={form.status} onChange={set("status")}>
            {(["scheduled","completed","missed","cancelled"] as CallStatus[]).map((s) =>
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Duration (min)">
          <input className={inputCls} type="number" min={0} value={form.durationMinutes ?? 0}
            onChange={(e) => setForm((p) => ({ ...p, durationMinutes: Number(e.target.value) }))} />
        </FormField>
        <FormField label="Date & time">
          <input className={inputCls} type="datetime-local" value={form.scheduledAt ?? ""} onChange={set("scheduledAt")} />
        </FormField>
      </div>
      <FormField label="Notes">
        <textarea className={inputCls} rows={3} value={form.notes ?? ""} onChange={set("notes")} placeholder="Call notes…" />
      </FormField>
      {error && <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 py-2.5 text-sm font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors">Cancel</button>
        <button type="submit" disabled={loading} className="flex-1 flex items-center justify-center py-2.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-60 rounded-lg transition-colors">
          {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : initial ? "Save changes" : "Log call"}
        </button>
      </div>
    </form>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Calls() {
  const { token } = useAuth();
  const [calls, setCalls]     = useState<Call[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState("");
  const [statusFilter, setStatusFilter]       = useState("");
  const [directionFilter, setDirectionFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [editing, setEditing] = useState<Call | null | "new">(null);
  const [deleting, setDeleting]           = useState<Call | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => { setPage(1); }, [search, statusFilter, directionFilter]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    listCalls(token, { page, limit: LIMIT, status: statusFilter || undefined, direction: (directionFilter as CallDirection) || undefined })
      .then((r) => { setCalls(r.calls); setTotal(r.total); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token, page, statusFilter, directionFilter]);

  const handleSaved = (c: Call) => {
    setCalls((prev) => {
      const idx = prev.findIndex((x) => x._id === c._id);
      if (idx >= 0) return prev.map((x) => (x._id === c._id ? c : x));
      setTotal((n) => n + 1);
      return [c, ...prev];
    });
    setEditing(null);
  };

  const handleDelete = async () => {
    if (!token || !deleting) return;
    setDeleteLoading(true);
    try {
      await deleteCall(token, deleting._id);
      setCalls((prev) => prev.filter((x) => x._id !== deleting._id));
      setTotal((n) => n - 1);
      setDeleting(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Delete failed."); }
    finally { setDeleteLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">Calls</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{total} call{total !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={() => setEditing("new")} className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus className="w-4 h-4" strokeWidth={1.75} /> Log call
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px]"><SearchBar value={search} onChange={setSearch} placeholder="Search calls…" /></div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors">
          <option value="">All statuses</option>
          {(["scheduled","completed","missed","cancelled"] as CallStatus[]).map((s) =>
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        <select value={directionFilter} onChange={(e) => setDirectionFilter(e.target.value)} className="px-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors">
          <option value="">Both directions</option>
          <option value="inbound">Inbound</option>
          <option value="outbound">Outbound</option>
        </select>
      </div>

      {error && <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20"><span className="w-6 h-6 border-2 border-zinc-300 border-t-blue-500 rounded-full animate-spin" /></div>
        ) : calls.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Phone className="w-10 h-10 text-zinc-300" strokeWidth={1.25} />
            <p className="text-sm text-zinc-400">No calls logged yet.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100">
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-widest text-zinc-400 font-medium">Subject</th>
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-widest text-zinc-400 font-medium hidden md:table-cell">Direction</th>
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-widest text-zinc-400 font-medium">Status</th>
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-widest text-zinc-400 font-medium hidden lg:table-cell">Duration</th>
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-widest text-zinc-400 font-medium hidden lg:table-cell">Date</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {calls.map((c) => (
                <tr key={c._id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-zinc-800 truncate max-w-[200px]">{c.subject}</p>
                    {c.notes && <p className="text-xs text-zinc-400 truncate max-w-[200px] mt-0.5">{c.notes}</p>}
                  </td>
                  <td className="px-5 py-3.5 hidden md:table-cell">
                    <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                      <DirectionIcon direction={c.direction} />
                      {c.direction.charAt(0).toUpperCase() + c.direction.slice(1)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5"><StatusBadge status={c.status} /></td>
                  <td className="px-5 py-3.5 text-zinc-500 hidden lg:table-cell">{c.durationMinutes ? `${c.durationMinutes} min` : "—"}</td>
                  <td className="px-5 py-3.5 text-zinc-500 hidden lg:table-cell">{c.scheduledAt ? new Date(c.scheduledAt).toLocaleString() : "—"}</td>
                  <td className="px-5 py-3.5 text-right">
                    <button onClick={() => setEditing(c)} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors"><Pencil className="w-3.5 h-3.5" strokeWidth={1.75} /></button>
                    <button onClick={() => setDeleting(c)} className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors ml-1"><Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Pagination page={page} total={total} limit={LIMIT} onChange={setPage} />

      <SlideOver open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "Log call" : "Edit call"}>
        {editing !== null && <CallForm initial={editing === "new" ? null : editing} token={token!} onSave={handleSaved} onCancel={() => setEditing(null)} />}
      </SlideOver>
      {deleting && <ConfirmDelete name={deleting.subject} onConfirm={handleDelete} onCancel={() => setDeleting(null)} loading={deleteLoading} />}
    </div>
  );
}
