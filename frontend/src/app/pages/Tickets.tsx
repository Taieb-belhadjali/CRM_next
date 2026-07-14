import { useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, Ticket } from "lucide-react";
import { listTickets, createTicket, updateTicket, deleteTicket, listContacts, listAccounts, listUsers, type Ticket as TicketType, type TicketPayload, type TicketStatus, type TicketPriority, type Contact, type Account, type AdminUser } from "../api";
import { useAuth } from "../hooks/useAuth";
import { SlideOver } from "../components/shared/SlideOver";
import { ConfirmDelete } from "../components/shared/ConfirmDelete";
import { Pagination } from "../components/shared/Pagination";
import { SearchBar } from "../components/shared/SearchBar";
import { FormField, inputCls, selectCls } from "../components/shared/FormField";

const LIMIT = 25;

const STATUS_STYLES: Record<TicketStatus, string> = {
  open:        "bg-blue-50 text-blue-700 border-blue-200",
  in_progress: "bg-amber-50 text-amber-700 border-amber-200",
  resolved:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  closed:      "bg-zinc-100 text-zinc-500 border-zinc-200",
};

const PRIORITY_STYLES: Record<TicketPriority, string> = {
  urgent: "bg-red-100 text-red-700 border-red-200",
  high:   "bg-orange-50 text-orange-600 border-orange-200",
  medium: "bg-amber-50 text-amber-600 border-amber-200",
  low:    "bg-zinc-100 text-zinc-500 border-zinc-200",
};

const STATUS_OPTIONS:   TicketStatus[]   = ["open", "in_progress", "resolved", "closed"];
const PRIORITY_OPTIONS: TicketPriority[] = ["urgent", "high", "medium", "low"];

function StatusBadge({ status }: { status: TicketStatus }) {
  const label = status === "in_progress" ? "In progress" : status.charAt(0).toUpperCase() + status.slice(1);
  return <span className={`inline-flex text-[11px] font-medium px-2 py-0.5 rounded-full border ${STATUS_STYLES[status]}`}>{label}</span>;
}
function PriorityBadge({ priority }: { priority: TicketPriority }) {
  return <span className={`inline-flex text-[11px] font-medium px-2 py-0.5 rounded-full border ${PRIORITY_STYLES[priority]}`}>{priority.charAt(0).toUpperCase() + priority.slice(1)}</span>;
}

function TicketForm({ initial, contacts, accounts, users, onSave, onCancel, token }: { initial?: TicketType | null; contacts: Contact[]; accounts: Account[]; users: AdminUser[]; onSave: (t: TicketType) => void; onCancel: () => void; token: string }) {
  const [form, setForm] = useState<TicketPayload>({
    subject:     initial?.subject     ?? "",
    description: initial?.description ?? "",
    status:      initial?.status      ?? "open",
    priority:    initial?.priority    ?? "medium",
    contact:     (initial?.contact  as { _id: string } | null | undefined)?._id ?? "",
    account:     (initial?.account  as { _id: string } | null | undefined)?._id ?? "",
    assignee:    (initial?.assignee as { _id: string } | null | undefined)?._id ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const set = (k: keyof TicketPayload) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject?.trim()) { setError("Subject is required."); return; }
    setError(""); setLoading(true);
    try {
      const payload = { ...form, contact: form.contact || null, account: form.account || null, assignee: form.assignee || null };
      const res = initial ? await updateTicket(token, initial._id, payload) : await createTicket(token, payload);
      onSave(res.ticket);
    } catch (err) { setError(err instanceof Error ? err.message : "Something went wrong."); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Subject" required>
        <input className={inputCls} value={form.subject} onChange={set("subject")} placeholder="Issue with invoice #1042" />
      </FormField>
      <FormField label="Description">
        <textarea className={inputCls} rows={3} value={form.description ?? ""} onChange={set("description")} placeholder="Describe the issue…" />
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Status">
          <select className={selectCls} value={form.status} onChange={set("status")}>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s === "in_progress" ? "In progress" : s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </FormField>
        <FormField label="Priority">
          <select className={selectCls} value={form.priority} onChange={set("priority")}>
            {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </select>
        </FormField>
      </div>
      <FormField label="Contact">
        <select className={selectCls} value={form.contact ?? ""} onChange={set("contact")}>
          <option value="">— No contact —</option>
          {contacts.map((c) => <option key={c._id} value={c._id}>{c.firstName} {c.lastName}</option>)}
        </select>
      </FormField>
      <FormField label="Account">
        <select className={selectCls} value={form.account ?? ""} onChange={set("account")}>
          <option value="">— No account —</option>
          {accounts.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
        </select>
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
          {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : initial ? "Save changes" : "Create ticket"}
        </button>
      </div>
    </form>
  );
}

export default function Tickets() {
  const { token } = useAuth();
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState("");
  const [statusFilter, setStatusFilter]     = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [editing, setEditing] = useState<TicketType | null | "new">(null);
  const [deleting, setDeleting]           = useState<TicketType | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [users, setUsers]       = useState<AdminUser[]>([]);
  const refLoaded = useRef(false);

  useEffect(() => {
    if (!token || refLoaded.current) return;
    refLoaded.current = true;
    Promise.all([
      listContacts(token, { limit: 100 }).then((r) => setContacts(r.contacts)),
      listAccounts(token, { limit: 100 }).then((r) => setAccounts(r.accounts)),
      listUsers(token).then(setUsers),
    ]).catch(() => {});
  }, [token]);

  useEffect(() => { setPage(1); }, [search, statusFilter, priorityFilter]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    listTickets(token, { search, page, limit: LIMIT, status: statusFilter || undefined, priority: priorityFilter || undefined })
      .then((r) => { setTickets(r.tickets); setTotal(r.total); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token, search, page, statusFilter, priorityFilter]);

  const handleSaved = (t: TicketType) => {
    setTickets((prev) => {
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
      await deleteTicket(token, deleting._id);
      setTickets((prev) => prev.filter((x) => x._id !== deleting._id));
      setTotal((n) => n - 1);
      setDeleting(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Delete failed."); }
    finally { setDeleteLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">Tickets</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{total} ticket{total !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={() => setEditing("new")} className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus className="w-4 h-4" strokeWidth={1.75} /> New ticket
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px]"><SearchBar value={search} onChange={setSearch} placeholder="Search tickets…" /></div>
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
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Ticket className="w-10 h-10 text-zinc-300" strokeWidth={1.25} />
            <p className="text-sm text-zinc-400">No tickets found.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100">
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-widest text-zinc-400 font-medium">Subject</th>
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-widest text-zinc-400 font-medium">Status</th>
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-widest text-zinc-400 font-medium hidden md:table-cell">Priority</th>
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-widest text-zinc-400 font-medium hidden lg:table-cell">Contact</th>
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-widest text-zinc-400 font-medium hidden lg:table-cell">Assignee</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {tickets.map((t) => {
                const contact = t.contact as { firstName: string; lastName: string } | null | undefined;
                const assignee = t.assignee as { name: string } | null | undefined;
                return (
                  <tr key={t._id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-zinc-800 truncate max-w-[220px]">{t.subject}</p>
                      {t.description && <p className="text-xs text-zinc-400 truncate max-w-[220px] mt-0.5">{t.description}</p>}
                    </td>
                    <td className="px-5 py-3.5"><StatusBadge status={t.status} /></td>
                    <td className="px-5 py-3.5 hidden md:table-cell"><PriorityBadge priority={t.priority} /></td>
                    <td className="px-5 py-3.5 text-zinc-500 hidden lg:table-cell">{contact ? `${contact.firstName} ${contact.lastName}` : "—"}</td>
                    <td className="px-5 py-3.5 text-zinc-500 hidden lg:table-cell">{assignee?.name ?? "—"}</td>
                    <td className="px-5 py-3.5 text-right">
                      <button onClick={() => setEditing(t)} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors"><Pencil className="w-3.5 h-3.5" strokeWidth={1.75} /></button>
                      <button onClick={() => setDeleting(t)} className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors ml-1"><Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Pagination page={page} total={total} limit={LIMIT} onChange={setPage} />

      <SlideOver open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "New ticket" : "Edit ticket"}>
        {editing !== null && <TicketForm initial={editing === "new" ? null : editing} contacts={contacts} accounts={accounts} users={users} token={token!} onSave={handleSaved} onCancel={() => setEditing(null)} />}
      </SlideOver>
      {deleting && <ConfirmDelete name={deleting.subject} onConfirm={handleDelete} onCancel={() => setDeleting(null)} loading={deleteLoading} />}
    </div>
  );
}
