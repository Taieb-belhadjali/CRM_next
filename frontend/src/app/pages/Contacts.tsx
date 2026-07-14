import { useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, Building2, Mail, Phone, UserCircle2 } from "lucide-react";
import {
  listContacts,
  createContact,
  updateContact,
  deleteContact,
  listAccounts,
  type Contact,
  type ContactPayload,
  type Account,
} from "../api";
import { useAuth } from "../hooks/useAuth";
import { SlideOver } from "../components/shared/SlideOver";
import { ConfirmDelete } from "../components/shared/ConfirmDelete";
import { Pagination } from "../components/shared/Pagination";
import { SearchBar } from "../components/shared/SearchBar";
import { DetailRow } from "../components/shared/DetailRow";
import { FormField, inputCls, selectCls } from "../components/shared/FormField";

const LIMIT = 25;

function getInitials(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

const AVATAR_COLORS = [
  "bg-blue-500", "bg-violet-500", "bg-emerald-500",
  "bg-amber-500", "bg-rose-500", "bg-teal-500",
];
function avatarColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

// ── Form ──────────────────────────────────────────────────────────────────────

interface FormProps {
  initial?: Contact | null;
  accounts: Account[];
  onSave: (c: Contact) => void;
  onCancel: () => void;
  token: string;
}

function ContactForm({ initial, accounts, onSave, onCancel, token }: FormProps) {
  const [form, setForm] = useState<ContactPayload>({
    firstName: initial?.firstName ?? "",
    lastName: initial?.lastName ?? "",
    jobTitle: initial?.jobTitle ?? "",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    address: initial?.address ?? "",
    account: (initial?.account as { _id: string } | null | undefined)?._id ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof ContactPayload) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("First name and last name are required.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const payload = { ...form, account: form.account || null };
      const res = initial
        ? await updateContact(token, initial._id, payload)
        : await createContact(token, payload);
      onSave(res.contact);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="First name" required>
          <input className={inputCls} value={form.firstName} onChange={set("firstName")} placeholder="Sophie" />
        </FormField>
        <FormField label="Last name" required>
          <input className={inputCls} value={form.lastName} onChange={set("lastName")} placeholder="Martin" />
        </FormField>
      </div>
      <FormField label="Job title">
        <input className={inputCls} value={form.jobTitle} onChange={set("jobTitle")} placeholder="Sales Manager" />
      </FormField>
      <FormField label="Email">
        <input className={inputCls} type="email" value={form.email} onChange={set("email")} placeholder="sophie@acme.com" />
      </FormField>
      <FormField label="Phone">
        <input className={inputCls} value={form.phone} onChange={set("phone")} placeholder="+33 6 00 00 00 00" />
      </FormField>
      <FormField label="Address">
        <input className={inputCls} value={form.address} onChange={set("address")} placeholder="12 Rue de la Paix, Paris" />
      </FormField>
      <FormField label="Account">
        <select className={selectCls} value={form.account ?? ""} onChange={set("account")}>
          <option value="">— No account —</option>
          {accounts.map((a) => (
            <option key={a._id} value={a._id}>{a.name}</option>
          ))}
        </select>
      </FormField>
      {error && <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 py-2.5 text-sm font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={loading} className="flex-1 flex items-center justify-center py-2.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-60 rounded-lg transition-colors">
          {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : initial ? "Save changes" : "Create contact"}
        </button>
      </div>
    </form>
  );
}

// ── Detail panel ──────────────────────────────────────────────────────────────

function ContactDetail({ contact, onEdit, onDelete }: { contact: Contact; onEdit: () => void; onDelete: () => void }) {
  const accountName = contact.account
    ? (contact.account as { name: string }).name
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 pb-4 border-b border-zinc-100">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-base flex-shrink-0 ${avatarColor(contact._id)}`}>
          {getInitials(contact.firstName, contact.lastName)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-zinc-900">{contact.firstName} {contact.lastName}</p>
          {contact.jobTitle && <p className="text-xs text-zinc-500">{contact.jobTitle}</p>}
        </div>
      </div>

      <div>
        <DetailRow label="Email" value={contact.email} />
        <DetailRow label="Phone" value={contact.phone} />
        <DetailRow label="Address" value={contact.address} />
        <DetailRow label="Account" value={accountName} />
        <DetailRow label="Owner" value={contact.owner?.name} />
        <DetailRow label="Added" value={new Date(contact.createdAt).toLocaleDateString()} />
      </div>

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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Contacts() {
  const { token } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selected, setSelected] = useState<Contact | null>(null);
  const [editing, setEditing] = useState<Contact | null | "new">(null);
  const [deleting, setDeleting] = useState<Contact | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const accountsLoaded = useRef(false);

  // Load accounts for form select
  useEffect(() => {
    if (!token || accountsLoaded.current) return;
    accountsLoaded.current = true;
    listAccounts(token, { limit: 100 }).then((r) => setAccounts(r.accounts)).catch(() => {});
  }, [token]);

  const load = () => {
    if (!token) return;
    setLoading(true);
    listContacts(token, { search, page, limit: LIMIT })
      .then((r) => { setContacts(r.contacts); setTotal(r.total); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { setPage(1); }, [search]);
  useEffect(() => { load(); }, [token, search, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSavedFixed = (c: Contact) => {
    setContacts((prev) => {
      const idx = prev.findIndex((x) => x._id === c._id);
      if (idx >= 0) return prev.map((x) => (x._id === c._id ? c : x));
      setTotal((t) => t + 1);
      return [c, ...prev];
    });
    setEditing(null);
    setSelected(c);
  };

  const handleDelete = async () => {
    if (!token || !deleting) return;
    setDeleteLoading(true);
    try {
      await deleteContact(token, deleting._id);
      setContacts((prev) => prev.filter((x) => x._id !== deleting._id));
      setTotal((t) => t - 1);
      if (selected?._id === deleting._id) setSelected(null);
      setDeleting(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">Contacts</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{total} contact{total !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => setEditing("new")}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" strokeWidth={1.75} /> New contact
        </button>
      </div>

      <SearchBar value={search} onChange={(v) => setSearch(v)} placeholder="Search contacts…" />

      {error && <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      {/* Table */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <span className="w-6 h-6 border-2 border-zinc-300 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <UserCircle2 className="w-10 h-10 text-zinc-300" strokeWidth={1.25} />
            <p className="text-sm text-zinc-400">{search ? "No contacts match your search." : "No contacts yet. Add your first one."}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100">
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-widest text-zinc-400 font-medium">Name</th>
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-widest text-zinc-400 font-medium hidden md:table-cell">Email</th>
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-widest text-zinc-400 font-medium hidden lg:table-cell">Phone</th>
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-widest text-zinc-400 font-medium hidden lg:table-cell">Account</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {contacts.map((c) => (
                <tr
                  key={c._id}
                  onClick={() => setSelected(c)}
                  className="hover:bg-zinc-50 cursor-pointer transition-colors"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 ${avatarColor(c._id)}`}>
                        {getInitials(c.firstName, c.lastName)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-zinc-800 truncate">{c.firstName} {c.lastName}</p>
                        {c.jobTitle && <p className="text-xs text-zinc-400 truncate">{c.jobTitle}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 hidden md:table-cell">
                    {c.email ? (
                      <a href={`mailto:${c.email}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-1.5 text-zinc-500 hover:text-blue-500 transition-colors">
                        <Mail className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.75} />
                        <span className="truncate max-w-[180px]">{c.email}</span>
                      </a>
                    ) : <span className="text-zinc-300">—</span>}
                  </td>
                  <td className="px-5 py-3.5 hidden lg:table-cell">
                    {c.phone ? (
                      <span className="flex items-center gap-1.5 text-zinc-500">
                        <Phone className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.75} />
                        {c.phone}
                      </span>
                    ) : <span className="text-zinc-300">—</span>}
                  </td>
                  <td className="px-5 py-3.5 hidden lg:table-cell">
                    {c.account ? (
                      <span className="flex items-center gap-1.5 text-zinc-500">
                        <Building2 className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.75} />
                        {(c.account as { name: string }).name}
                      </span>
                    ) : <span className="text-zinc-300">—</span>}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditing(c); }}
                      className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" strokeWidth={1.75} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleting(c); }}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors ml-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Pagination page={page} total={total} limit={LIMIT} onChange={setPage} />

      {/* Detail slide-over */}
      <SlideOver
        open={!!selected && !editing}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.firstName} ${selected.lastName}` : ""}
        subtitle={selected?.jobTitle}
      >
        {selected && (
          <ContactDetail
            contact={selected}
            onEdit={() => setEditing(selected)}
            onDelete={() => { setDeleting(selected); setSelected(null); }}
          />
        )}
      </SlideOver>

      {/* Create / edit slide-over */}
      <SlideOver
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "New contact" : "Edit contact"}
      >
        {editing !== null && (
          <ContactForm
            initial={editing === "new" ? null : editing}
            accounts={accounts}
            token={token!}
            onSave={handleSavedFixed}
            onCancel={() => setEditing(null)}
          />
        )}
      </SlideOver>

      {deleting && (
        <ConfirmDelete
          name={`${deleting.firstName} ${deleting.lastName}`}
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
          loading={deleteLoading}
        />
      )}
    </div>
  );
}
