import { useEffect, useRef, useState } from "react";
import {
  Plus, Pencil, Trash2, ShoppingCart, Send, CheckCircle, XCircle, RefreshCw,
} from "lucide-react";
import {
  listPurchaseOrders, createPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder,
  listAccounts, listContacts,
  type PurchaseOrder, type PurchaseOrderPayload, type PurchaseOrderStatus,
  type Account, type Contact,
} from "../api";
import { useAuth } from "../hooks/useAuth";
import { SlideOver } from "../components/shared/SlideOver";
import { ConfirmDelete } from "../components/shared/ConfirmDelete";
import { Pagination } from "../components/shared/Pagination";
import { SearchBar } from "../components/shared/SearchBar";
import { DetailRow } from "../components/shared/DetailRow";
import { FormField, inputCls, selectCls } from "../components/shared/FormField";
import { LineItemEditor } from "../components/shared/LineItemEditor";

const LIMIT = 25;

const STATUS_STYLES: Record<PurchaseOrderStatus, string> = {
  pending:  "bg-zinc-100 text-zinc-600 border-zinc-200",
  ordered:  "bg-blue-50 text-blue-700 border-blue-200",
  received: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled:"bg-red-50 text-red-600 border-red-200",
};

const STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  pending: "En attente", ordered: "Commandé", received: "Reçu", cancelled: "Annulé",
};

function StatusBadge({ status }: { status: PurchaseOrderStatus }) {
  return (
    <span className={`inline-flex text-[11px] font-medium px-2 py-0.5 rounded-full border ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

function fmt(n: number) {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

const TRANSITIONS: Record<PurchaseOrderStatus, { label: string; next: PurchaseOrderStatus; icon: React.ElementType; cls: string }[]> = {
  pending:  [{ label: "Commander", next: "ordered", icon: Send, cls: "bg-blue-50 text-blue-600 hover:bg-blue-100" }],
  ordered:  [{ label: "Marquer reçu", next: "received", icon: CheckCircle, cls: "bg-emerald-50 text-emerald-600 hover:bg-emerald-100" },
             { label: "Annuler", next: "cancelled", icon: XCircle, cls: "bg-red-50 text-red-600 hover:bg-red-100" }],
  received: [{ label: "Remettre en attente", next: "pending", icon: RefreshCw, cls: "bg-zinc-100 text-zinc-600 hover:bg-zinc-200" }],
  cancelled:[{ label: "Remettre en attente", next: "pending", icon: RefreshCw, cls: "bg-zinc-100 text-zinc-600 hover:bg-zinc-200" }],
};

function PurchaseOrderForm({ initial, accounts, contacts, onSave, onCancel, token }: {
  initial?: PurchaseOrder | null; accounts: Account[]; contacts: Contact[];
  onSave: (po: PurchaseOrder) => void; onCancel: () => void; token: string;
}) {
  const [form, setForm] = useState<PurchaseOrderPayload>({
    title:      initial?.title      ?? "",
    status:     initial?.status     ?? "pending",
    supplier:   initial?.supplier   ?? "",
    account:    (initial?.account  as { _id: string } | null | undefined)?._id ?? "",
    contact:    (initial?.contact  as { _id: string } | null | undefined)?._id ?? "",
    lineItems:  initial?.lineItems  ?? [],
    notes:      initial?.notes      ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const set = (k: keyof PurchaseOrderPayload) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title?.trim()) { setError("Le titre est requis."); return; }
    if (!form.supplier?.trim()) { setError("Le fournisseur est requis."); return; }
    setError(""); setLoading(true);
    try {
      const payload = { ...form, account: form.account || null, contact: form.contact || null };
      const res = initial ? await updatePurchaseOrder(token, initial._id, payload) : await createPurchaseOrder(token, payload);
      onSave(res.purchaseOrder);
    } catch (err) { setError(err instanceof Error ? err.message : "Une erreur est survenue."); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <FormField label="Titre" required>
        <input className={inputCls} value={form.title} onChange={set("title")} placeholder="Bon de commande fournisseur" />
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Statut">
          <select className={selectCls} value={form.status} onChange={set("status")}>
            {(["pending","ordered","received","cancelled"] as PurchaseOrderStatus[]).map((s) =>
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
        </FormField>
        <FormField label="Fournisseur" required>
          <input className={inputCls} value={form.supplier} onChange={set("supplier")} placeholder="Nom du fournisseur" />
        </FormField>
      </div>
      <FormField label="Client (compte)">
        <select className={selectCls} value={form.account ?? ""} onChange={set("account")}>
          <option value="">— Aucun —</option>
          {accounts.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
        </select>
      </FormField>
      <FormField label="Contact">
        <select className={selectCls} value={form.contact ?? ""} onChange={set("contact")}>
          <option value="">— Aucun —</option>
          {contacts.map((c) => <option key={c._id} value={c._id}>{c.firstName} {c.lastName}</option>)}
        </select>
      </FormField>
      <div>
        <p className="text-xs font-medium text-zinc-700 mb-2">Lignes de commande</p>
        <LineItemEditor items={form.lineItems ?? []} onChange={(li) => setForm((p) => ({ ...p, lineItems: li }))} />
      </div>
      <FormField label="Notes">
        <textarea className={inputCls} rows={2} value={form.notes ?? ""} onChange={set("notes")} placeholder="Remarques…" />
      </FormField>
      {error && <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 py-2.5 text-sm font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors">Annuler</button>
        <button type="submit" disabled={loading} className="flex-1 flex items-center justify-center py-2.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-60 rounded-lg transition-colors">
          {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : initial ? "Enregistrer" : "Créer le BC"}
        </button>
      </div>
    </form>
  );
}

function PurchaseOrderDetail({ po, token, onEdit, onDelete, onUpdated }: {
  po: PurchaseOrder; token: string;
  onEdit: () => void; onDelete: () => void;
  onUpdated: (po: PurchaseOrder) => void;
}) {
  const [statusLoading, setStatusLoading] = useState(false);
  const [error, setError] = useState("");

  const handleStatus = async (next: PurchaseOrderStatus) => {
    setStatusLoading(true); setError("");
    try {
      const res = await updatePurchaseOrder(token, po._id, { status: next });
      onUpdated(res.purchaseOrder);
    } catch { setError("Status update failed."); }
    finally { setStatusLoading(false); }
  };

  const accountName = (po.account as { name: string } | null | undefined)?.name;
  const contactName = po.contact
    ? `${(po.contact as { firstName: string; lastName: string }).firstName} ${(po.contact as { firstName: string; lastName: string }).lastName}`
    : null;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between pb-4 border-b border-zinc-100">
        <div>
          <p className="text-[11px] text-zinc-400 font-mono">{po.number}</p>
          <p className="text-base font-semibold text-zinc-900 mt-0.5">{po.title}</p>
          <p className="text-xs text-zinc-500 mt-0.5">Fournisseur : {po.supplier}</p>
        </div>
        <StatusBadge status={po.status} />
      </div>
      <div>
        <DetailRow label="Fournisseur" value={po.supplier} />
        <DetailRow label="Client" value={accountName ?? contactName} />
        <DetailRow label="Propriétaire" value={po.owner?.name} />
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-medium mb-3">Lignes de commande</p>
        <LineItemEditor items={po.lineItems} onChange={() => {}} readOnly />
      </div>
      {po.notes && <DetailRow label="Notes" value={po.notes} />}
      {error && <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      {TRANSITIONS[po.status]?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {TRANSITIONS[po.status].map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.next} onClick={() => handleStatus(t.next)} disabled={statusLoading}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${t.cls}`}>
                <Icon className="w-3.5 h-3.5" strokeWidth={1.75} /> {t.label}
              </button>
            );
          })}
        </div>
      )}
      <div className="flex flex-wrap gap-2 pt-1">
        <button onClick={onEdit}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors">
          <Pencil className="w-3.5 h-3.5" strokeWidth={1.75} /> Modifier
        </button>
        <button onClick={onDelete}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
          <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} /> Supprimer
        </button>
      </div>
    </div>
  );
}

export default function PurchaseOrders() {
  const { token } = useAuth();
  const [pos, setPOs]           = useState<PurchaseOrder[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [selected, setSelected] = useState<PurchaseOrder | null>(null);
  const [editing, setEditing]   = useState<PurchaseOrder | null | "new">(null);
  const [deleting, setDeleting] = useState<PurchaseOrder | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const refLoaded = useRef(false);

  useEffect(() => {
    if (!token || refLoaded.current) return;
    refLoaded.current = true;
    Promise.all([
      listAccounts(token, { limit: 100 }).then((r) => setAccounts(r.accounts)),
      listContacts(token, { limit: 100 }).then((r) => setContacts(r.contacts)),
    ]).catch(() => {});
  }, [token]);

  useEffect(() => { setPage(1); }, [search, statusFilter]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    listPurchaseOrders(token, { search, page, limit: LIMIT, status: statusFilter || undefined })
      .then((r) => { setPOs(r.purchaseOrders); setTotal(r.total); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token, search, page, statusFilter]);

  const handleSaved = (po: PurchaseOrder) => {
    setPOs((prev) => {
      const idx = prev.findIndex((x) => x._id === po._id);
      if (idx >= 0) return prev.map((x) => (x._id === po._id ? po : x));
      setTotal((n) => n + 1);
      return [po, ...prev];
    });
    setEditing(null);
    setSelected(po);
  };

  const handleDelete = async () => {
    if (!token || !deleting) return;
    setDeleteLoading(true);
    try {
      await deletePurchaseOrder(token, deleting._id);
      setPOs((prev) => prev.filter((x) => x._id !== deleting._id));
      setTotal((n) => n - 1);
      if (selected?._id === deleting._id) setSelected(null);
      setDeleting(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Delete failed."); }
    finally { setDeleteLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">Bons de commande</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{total} bon{total !== 1 ? "s" : ""} de commande</p>
        </div>
        <button onClick={() => setEditing("new")}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus className="w-4 h-4" strokeWidth={1.75} /> Nouveau BC
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px]"><SearchBar value={search} onChange={setSearch} placeholder="Rechercher un BC…" /></div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors">
          <option value="">Tous les statuts</option>
          {(["pending","ordered","received","cancelled"] as PurchaseOrderStatus[]).map((s) =>
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
      </div>

      {error && <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20"><span className="w-6 h-6 border-2 border-zinc-300 border-t-blue-500 rounded-full animate-spin" /></div>
        ) : pos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <ShoppingCart className="w-10 h-10 text-zinc-300" strokeWidth={1.25} />
            <p className="text-sm text-zinc-400">Aucun bon de commande.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100">
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-widest text-zinc-400 font-medium">Référence</th>
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-widest text-zinc-400 font-medium border-l border-zinc-100">Fournisseur</th>
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-widest text-zinc-400 font-medium border-l border-zinc-100">Statut</th>
                <th className="px-5 py-3 text-right text-[10px] uppercase tracking-widest text-zinc-400 font-medium border-l border-zinc-100 hidden lg:table-cell">Total TTC</th>
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-widest text-zinc-400 font-medium border-l border-zinc-100 hidden lg:table-cell">Date</th>
                <th className="px-5 py-3 border-l border-zinc-100" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {pos.map((po) => (
                <tr key={po._id} onClick={() => setSelected(po)} className="hover:bg-zinc-50 cursor-pointer transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-mono text-xs text-zinc-400">{po.number}</p>
                    <p className="font-medium text-zinc-800 truncate max-w-[200px]">{po.title}</p>
                  </td>
                  <td className="px-5 py-3.5 text-zinc-500 border-l border-zinc-100">{po.supplier}</td>
                  <td className="px-5 py-3.5 border-l border-zinc-100"><StatusBadge status={po.status} /></td>
                  <td className="px-5 py-3.5 text-right font-semibold text-zinc-700 border-l border-zinc-100 hidden lg:table-cell">{fmt(po.grandTotal)}</td>
                  <td className="px-5 py-3.5 text-zinc-500 border-l border-zinc-100 hidden lg:table-cell">{po.createdAt ? new Date(po.createdAt).toLocaleDateString("fr-FR") : "—"}</td>
                  <td className="px-5 py-3.5 text-right border-l border-zinc-100" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => setEditing(po)} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors"><Pencil className="w-3.5 h-3.5" strokeWidth={1.75} /></button>
                    <button onClick={() => setDeleting(po)} className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors ml-1"><Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Pagination page={page} total={total} limit={LIMIT} onChange={setPage} />

      <SlideOver open={!!selected && !editing} onClose={() => setSelected(null)} title={selected?.number ?? ""} subtitle={selected?.title} width="w-[600px]">
        {selected && token && (
          <PurchaseOrderDetail
            po={selected} token={token}
            onEdit={() => setEditing(selected)}
            onDelete={() => { setDeleting(selected); setSelected(null); }}
            onUpdated={(po) => { setPOs((prev) => prev.map((x) => (x._id === po._id ? po : x))); setSelected(po); }}
          />
        )}
      </SlideOver>

      <SlideOver open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "Nouveau BC" : "Modifier le BC"} width="w-[600px]">
        {editing !== null && (
          <PurchaseOrderForm initial={editing === "new" ? null : editing} accounts={accounts} contacts={contacts} token={token!} onSave={handleSaved} onCancel={() => setEditing(null)} />
        )}
      </SlideOver>

      {deleting && <ConfirmDelete name={`${deleting.number} – ${deleting.title}`} onConfirm={handleDelete} onCancel={() => setDeleting(null)} loading={deleteLoading} />}
    </div>
  );
}
