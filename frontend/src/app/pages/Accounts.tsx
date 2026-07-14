import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Building2, Users } from "lucide-react";
import {
  listAccounts,
  getAccount,
  createAccount,
  updateAccount,
  deleteAccount,
  type Account,
  type AccountPayload,
  type AccountSize,
  type AccountStatus,
  type Contact,
} from "../api";
import { useAuth } from "../hooks/useAuth";
import { SlideOver } from "../components/shared/SlideOver";
import { ConfirmDelete } from "../components/shared/ConfirmDelete";
import { Pagination } from "../components/shared/Pagination";
import { SearchBar } from "../components/shared/SearchBar";
import { DetailRow } from "../components/shared/DetailRow";
import { StatusBadge } from "../components/shared/StatusBadge";
import { FormField, inputCls, selectCls } from "../components/shared/FormField";

const LIMIT = 25;

const SIZE_OPTIONS: AccountSize[] = ["1-10", "11-50", "51-200", "201-500", "500+"];
const STATUS_OPTIONS: AccountStatus[] = ["active", "inactive", "disputed"];

// ── Form ──────────────────────────────────────────────────────────────────────

interface FormProps {
  initial?: Account | null;
  onSave: (a: Account) => void;
  onCancel: () => void;
  token: string;
}

function AccountForm({ initial, onSave, onCancel, token }: FormProps) {
  const [form, setForm] = useState<AccountPayload>({
    name: initial?.name ?? "",
    siret: initial?.siret ?? "",
    sector: initial?.sector ?? "",
    size: initial?.size,
    estimatedRevenue: initial?.estimatedRevenue,
    status: initial?.status ?? "active",
    address: initial?.address ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof AccountPayload) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((p) => ({ ...p, [k]: e.target.value || undefined }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name?.trim()) { setError("Name is required."); return; }
    setError(""); setLoading(true);
    try {
      const res = initial
        ? await updateAccount(token, initial._id, form)
        : await createAccount(token, form);
      onSave(res.account);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Company name" required>
        <input className={inputCls} value={form.name} onChange={set("name")} placeholder="Acme Corp" />
      </FormField>
      <FormField label="SIRET">
        <input className={inputCls} value={form.siret ?? ""} onChange={set("siret")} placeholder="12345678901234" />
      </FormField>
      <FormField label="Sector">
        <input className={inputCls} value={form.sector ?? ""} onChange={set("sector")} placeholder="Technology" />
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Size">
          <select className={selectCls} value={form.size ?? ""} onChange={set("size")}>
            <option value="">— Select —</option>
            {SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </FormField>
        <FormField label="Status">
          <select className={selectCls} value={form.status ?? "active"} onChange={set("status")}>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </FormField>
      </div>
      <FormField label="Est. revenue (€)">
        <input
          className={inputCls} type="number" min={0}
          value={form.estimatedRevenue ?? ""}
          onChange={(e) => setForm((p) => ({ ...p, estimatedRevenue: e.target.value ? Number(e.target.value) : undefined }))}
          placeholder="500000"
        />
      </FormField>
      <FormField label="Address">
        <input className={inputCls} value={form.address ?? ""} onChange={set("address")} placeholder="12 Rue de Rivoli, Paris" />
      </FormField>
      {error && <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 py-2.5 text-sm font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors">Cancel</button>
        <button type="submit" disabled={loading} className="flex-1 flex items-center justify-center py-2.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-60 rounded-lg transition-colors">
          {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : initial ? "Save changes" : "Create account"}
        </button>
      </div>
    </form>
  );
}

// ── Detail panel ──────────────────────────────────────────────────────────────

interface DetailProps {
  account: Account;
  contacts: Contact[];
  onEdit: () => void;
  onDelete: () => void;
}

function AccountDetail({ account, contacts, onEdit, onDelete }: DetailProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4 pb-4 border-b border-zinc-100">
        <div className="w-11 h-11 rounded-xl bg-zinc-100 flex items-center justify-center flex-shrink-0">
          <Building2 className="w-5 h-5 text-zinc-500" strokeWidth={1.75} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-zinc-900 truncate">{account.name}</p>
          {account.sector && <p className="text-xs text-zinc-500">{account.sector}</p>}
        </div>
        <StatusBadge status={account.status} />
      </div>

      <div>
        <DetailRow label="SIRET" value={account.siret} />
        <DetailRow label="Size" value={account.size} />
        <DetailRow label="Est. revenue" value={account.estimatedRevenue != null ? `€${account.estimatedRevenue.toLocaleString()}` : undefined} />
        <DetailRow label="Address" value={account.address} />
        <DetailRow label="Owner" value={account.owner?.name} />
        <DetailRow label="Added" value={new Date(account.createdAt).toLocaleDateString()} />
      </div>

      {/* Linked contacts */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-medium mb-2 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" strokeWidth={1.75} /> Contacts ({contacts.length})
        </p>
        {contacts.length === 0 ? (
          <p className="text-sm text-zinc-400">No contacts linked to this account.</p>
        ) : (
          <div className="space-y-1.5">
            {contacts.map((c) => (
              <div key={c._id} className="flex items-center gap-3 p-2.5 rounded-lg bg-zinc-50 border border-zinc-100">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-800 truncate">{c.firstName} {c.lastName}</p>
                  {c.jobTitle && <p className="text-xs text-zinc-400 truncate">{c.jobTitle}</p>}
                </div>
                {c.email && <p className="text-xs text-zinc-400 truncate max-w-[140px]">{c.email}</p>}
              </div>
            ))}
          </div>
        )}
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

export default function Accounts() {
  const { token } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selected, setSelected] = useState<Account | null>(null);
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editing, setEditing] = useState<Account | null | "new">(null);
  const [deleting, setDeleting] = useState<Account | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => { setPage(1); }, [search, statusFilter]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    listAccounts(token, { search, page, limit: LIMIT, status: statusFilter || undefined })
      .then((r) => { setAccounts(r.accounts); setTotal(r.total); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token, search, page, statusFilter]);

  const openDetail = async (a: Account) => {
    setSelected(a);
    setSelectedContacts([]);
    setDetailLoading(true);
    try {
      const r = await getAccount(token!, a._id);
      setSelected(r.account);
      setSelectedContacts(r.contacts);
    } catch { /* keep existing data */ }
    finally { setDetailLoading(false); }
  };

  const handleSaved = (a: Account) => {
    setAccounts((prev) => {
      const idx = prev.findIndex((x) => x._id === a._id);
      if (idx >= 0) return prev.map((x) => (x._id === a._id ? a : x));
      setTotal((t) => t + 1);
      return [a, ...prev];
    });
    setEditing(null);
    setSelected(a);
  };

  const handleDelete = async () => {
    if (!token || !deleting) return;
    setDeleteLoading(true);
    try {
      await deleteAccount(token, deleting._id);
      setAccounts((prev) => prev.filter((x) => x._id !== deleting._id));
      setTotal((t) => t - 1);
      if (selected?._id === deleting._id) setSelected(null);
      setDeleting(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    } finally { setDeleteLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">Accounts</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{total} account{total !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={() => setEditing("new")} className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus className="w-4 h-4" strokeWidth={1.75} /> New account
        </button>
      </div>

      <div className="flex gap-3">
        <div className="flex-1"><SearchBar value={search} onChange={setSearch} placeholder="Search accounts…" /></div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>

      {error && <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <span className="w-6 h-6 border-2 border-zinc-300 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Building2 className="w-10 h-10 text-zinc-300" strokeWidth={1.25} />
            <p className="text-sm text-zinc-400">{search ? "No accounts match your search." : "No accounts yet."}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100">
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-widest text-zinc-400 font-medium">Name</th>
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-widest text-zinc-400 font-medium hidden md:table-cell">Sector</th>
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-widest text-zinc-400 font-medium hidden lg:table-cell">Size</th>
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-widest text-zinc-400 font-medium">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {accounts.map((a) => (
                <tr key={a._id} onClick={() => openDetail(a)} className="hover:bg-zinc-50 cursor-pointer transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-4 h-4 text-zinc-500" strokeWidth={1.75} />
                      </div>
                      <span className="font-medium text-zinc-800 truncate">{a.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-zinc-500 hidden md:table-cell">{a.sector || "—"}</td>
                  <td className="px-5 py-3.5 text-zinc-500 hidden lg:table-cell">{a.size || "—"}</td>
                  <td className="px-5 py-3.5"><StatusBadge status={a.status} /></td>
                  <td className="px-5 py-3.5 text-right">
                    <button onClick={(e) => { e.stopPropagation(); setEditing(a); }} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors">
                      <Pencil className="w-3.5 h-3.5" strokeWidth={1.75} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setDeleting(a); }} className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors ml-1">
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

      {/* Detail */}
      <SlideOver open={!!selected && !editing} onClose={() => setSelected(null)} title={selected?.name ?? ""} subtitle={selected?.sector}>
        {selected && (
          detailLoading ? (
            <div className="flex items-center justify-center py-10">
              <span className="w-5 h-5 border-2 border-zinc-300 border-t-blue-500 rounded-full animate-spin" />
            </div>
          ) : (
            <AccountDetail
              account={selected}
              contacts={selectedContacts}
              onEdit={() => setEditing(selected)}
              onDelete={() => { setDeleting(selected); setSelected(null); }}
            />
          )
        )}
      </SlideOver>

      {/* Form */}
      <SlideOver open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "New account" : "Edit account"}>
        {editing !== null && (
          <AccountForm initial={editing === "new" ? null : editing} token={token!} onSave={handleSaved} onCancel={() => setEditing(null)} />
        )}
      </SlideOver>

      {deleting && (
        <ConfirmDelete name={deleting.name} onConfirm={handleDelete} onCancel={() => setDeleting(null)} loading={deleteLoading} />
      )}
    </div>
  );
}
