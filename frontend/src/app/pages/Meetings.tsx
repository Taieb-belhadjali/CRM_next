import { useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, Video, Users, Link, CalendarDays } from "lucide-react";
import { listMeetings, createMeeting, updateMeeting, deleteMeeting, listUsers, type Meeting, type MeetingPayload, type AdminUser } from "../api";
import { useAuth } from "../hooks/useAuth";
import { SlideOver } from "../components/shared/SlideOver";
import { ConfirmDelete } from "../components/shared/ConfirmDelete";
import { Pagination } from "../components/shared/Pagination";
import { DetailRow } from "../components/shared/DetailRow";
import { FormField, inputCls, selectCls } from "../components/shared/FormField";

const LIMIT = 25;

function MeetingForm({ initial, users, onSave, onCancel, token }: { initial?: Meeting | null; users: AdminUser[]; onSave: (m: Meeting) => void; onCancel: () => void; token: string }) {
  const [form, setForm] = useState<MeetingPayload>({
    title:           initial?.title ?? "",
    scheduledAt:     initial?.scheduledAt ? initial.scheduledAt.slice(0, 16) : "",
    durationMinutes: initial?.durationMinutes ?? 60,
    location:        initial?.location    ?? "",
    meetingLink:     initial?.meetingLink ?? "",
    notes:           initial?.notes       ?? "",
    participants:    initial?.participants?.map((p) => (p as { _id: string })._id) ?? [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const set = (k: keyof MeetingPayload) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [k]: e.target.value }));

  const toggleParticipant = (id: string) =>
    setForm((p) => ({
      ...p,
      participants: p.participants?.includes(id)
        ? p.participants.filter((x) => x !== id)
        : [...(p.participants ?? []), id],
    }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title?.trim() || !form.scheduledAt) { setError("Title and date are required."); return; }
    setError(""); setLoading(true);
    try {
      const payload = { ...form, durationMinutes: Number(form.durationMinutes) || 60 };
      const res = initial ? await updateMeeting(token, initial._id, payload) : await createMeeting(token, payload);
      onSave(res.meeting);
    } catch (err) { setError(err instanceof Error ? err.message : "Something went wrong."); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Title" required>
        <input className={inputCls} value={form.title} onChange={set("title")} placeholder="Product demo — Acme Corp" />
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Date & time" required>
          <input className={inputCls} type="datetime-local" value={form.scheduledAt} onChange={set("scheduledAt")} />
        </FormField>
        <FormField label="Duration (min)">
          <input className={inputCls} type="number" min={5} step={5} value={form.durationMinutes ?? 60}
            onChange={(e) => setForm((p) => ({ ...p, durationMinutes: Number(e.target.value) }))} />
        </FormField>
      </div>
      <FormField label="Location">
        <input className={inputCls} value={form.location ?? ""} onChange={set("location")} placeholder="Conference room B / Paris" />
      </FormField>
      <FormField label="Meeting link">
        <input className={inputCls} type="url" value={form.meetingLink ?? ""} onChange={set("meetingLink")} placeholder="https://meet.google.com/…" />
      </FormField>
      <FormField label="Notes">
        <textarea className={inputCls} rows={3} value={form.notes ?? ""} onChange={set("notes")} placeholder="Agenda, objectives…" />
      </FormField>
      <div>
        <label className="block text-xs font-medium text-zinc-700 mb-2">Participants</label>
        <div className="space-y-1.5 max-h-40 overflow-y-auto">
          {users.map((u) => (
            <label key={u._id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-zinc-50 cursor-pointer transition-colors">
              <input type="checkbox" checked={form.participants?.includes(u._id) ?? false} onChange={() => toggleParticipant(u._id)}
                className="rounded border-zinc-300 text-blue-500 focus:ring-blue-500" />
              <span className="text-sm text-zinc-700">{u.name}</span>
              <span className="text-xs text-zinc-400 ml-auto">{u.email}</span>
            </label>
          ))}
        </div>
      </div>
      {error && <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 py-2.5 text-sm font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors">Cancel</button>
        <button type="submit" disabled={loading} className="flex-1 flex items-center justify-center py-2.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-60 rounded-lg transition-colors">
          {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : initial ? "Save changes" : "Schedule meeting"}
        </button>
      </div>
    </form>
  );
}

function MeetingDetail({ meeting, onEdit, onDelete }: { meeting: Meeting; onEdit: () => void; onDelete: () => void }) {
  const participants = (meeting.participants ?? []) as { name: string; email: string }[];
  return (
    <div className="space-y-4">
      <div className="pb-4 border-b border-zinc-100">
        <p className="text-base font-semibold text-zinc-900">{meeting.title}</p>
        <p className="text-xs text-zinc-500 mt-1">{new Date(meeting.scheduledAt).toLocaleString()} · {meeting.durationMinutes} min</p>
      </div>
      <div>
        <DetailRow label="Location" value={meeting.location} />
        <DetailRow label="Notes" value={meeting.notes} />
        {meeting.meetingLink && (
          <div className="flex flex-col gap-0.5 py-3 border-b border-zinc-100 last:border-0">
            <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-medium">Meeting link</span>
            <a href={meeting.meetingLink} target="_blank" rel="noreferrer" className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1.5 truncate">
              <Link className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.75} />
              <span className="truncate">{meeting.meetingLink}</span>
            </a>
          </div>
        )}
      </div>
      {participants.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-medium mb-2 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" strokeWidth={1.75} /> Participants ({participants.length})
          </p>
          <div className="space-y-1.5">
            {participants.map((p, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-zinc-700">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-semibold text-blue-600 flex-shrink-0">
                  {p.name?.[0]?.toUpperCase() ?? "?"}
                </div>
                <span>{p.name}</span>
                <span className="text-xs text-zinc-400 ml-auto">{p.email}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="flex gap-2 pt-2">
        <button onClick={onEdit} className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors">
          <Pencil className="w-3.5 h-3.5" strokeWidth={1.75} /> Edit
        </button>
        <button onClick={onDelete} className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
          <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} /> Delete
        </button>
      </div>
    </div>
  );
}

export default function Meetings() {
  const { token } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [selected, setSelected] = useState<Meeting | null>(null);
  const [editing, setEditing]   = useState<Meeting | null | "new">(null);
  const [deleting, setDeleting] = useState<Meeting | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const usersLoaded = useRef(false);

  useEffect(() => {
    if (!token || usersLoaded.current) return;
    usersLoaded.current = true;
    listUsers(token).then(setUsers).catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    listMeetings(token, { page, limit: LIMIT })
      .then((r) => { setMeetings(r.meetings); setTotal(r.total); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token, page]);

  const handleSaved = (m: Meeting) => {
    setMeetings((prev) => {
      const idx = prev.findIndex((x) => x._id === m._id);
      if (idx >= 0) return prev.map((x) => (x._id === m._id ? m : x));
      setTotal((n) => n + 1);
      return [m, ...prev];
    });
    setEditing(null);
    setSelected(m);
  };

  const handleDelete = async () => {
    if (!token || !deleting) return;
    setDeleteLoading(true);
    try {
      await deleteMeeting(token, deleting._id);
      setMeetings((prev) => prev.filter((x) => x._id !== deleting._id));
      setTotal((n) => n - 1);
      if (selected?._id === deleting._id) setSelected(null);
      setDeleting(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Delete failed."); }
    finally { setDeleteLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">Meetings</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{total} meeting{total !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={() => setEditing("new")} className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus className="w-4 h-4" strokeWidth={1.75} /> Schedule meeting
        </button>
      </div>

      {error && <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20"><span className="w-6 h-6 border-2 border-zinc-300 border-t-blue-500 rounded-full animate-spin" /></div>
        ) : meetings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Video className="w-10 h-10 text-zinc-300" strokeWidth={1.25} />
            <p className="text-sm text-zinc-400">No meetings scheduled yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-50">
            {meetings.map((m) => {
              const isPast = new Date(m.scheduledAt) < new Date();
              const parts = (m.participants ?? []) as { name: string }[];
              return (
                <div key={m._id} onClick={() => setSelected(m)} className="flex items-start gap-4 px-5 py-4 hover:bg-zinc-50 cursor-pointer transition-colors">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isPast ? "bg-zinc-100" : "bg-blue-50"}`}>
                    <CalendarDays className={`w-5 h-5 ${isPast ? "text-zinc-400" : "text-blue-500"}`} strokeWidth={1.75} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-800">{m.title}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{new Date(m.scheduledAt).toLocaleString()} · {m.durationMinutes} min</p>
                    {parts.length > 0 && <p className="text-xs text-zinc-400 mt-1">{parts.map((p) => p.name).join(", ")}</p>}
                  </div>
                  {m.meetingLink && (
                    <a href={m.meetingLink} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
                      className="flex-shrink-0 p-2 rounded-lg hover:bg-blue-50 text-zinc-400 hover:text-blue-500 transition-colors">
                      <Link className="w-4 h-4" strokeWidth={1.75} />
                    </a>
                  )}
                  <div className="flex-shrink-0 flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => setEditing(m)} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors"><Pencil className="w-3.5 h-3.5" strokeWidth={1.75} /></button>
                    <button onClick={() => setDeleting(m)} className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Pagination page={page} total={total} limit={LIMIT} onChange={setPage} />

      <SlideOver open={!!selected && !editing} onClose={() => setSelected(null)} title={selected?.title ?? ""}>
        {selected && <MeetingDetail meeting={selected} onEdit={() => setEditing(selected)} onDelete={() => { setDeleting(selected); setSelected(null); }} />}
      </SlideOver>

      <SlideOver open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "Schedule meeting" : "Edit meeting"}>
        {editing !== null && <MeetingForm initial={editing === "new" ? null : editing} users={users} token={token!} onSave={handleSaved} onCancel={() => setEditing(null)} />}
      </SlideOver>

      {deleting && <ConfirmDelete name={deleting.title} onConfirm={handleDelete} onCancel={() => setDeleting(null)} loading={deleteLoading} />}
    </div>
  );
}
