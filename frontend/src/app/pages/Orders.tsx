import { useEffect, useRef, useState } from "react";
import {
  Plus, Pencil, Trash2, Package, Send, CheckCircle, XCircle, RefreshCw, ArrowRightCircle,
} from "lucide-react";
import {
  listOrders, createOrder, updateOrder, deleteOrder, convertToOrder,
  listAccounts, listContacts, listQuotes, listInvoices,
  type Order, type OrderPayload, type OrderStatus,
  type Account, type Contact, type Quote, type Invoice,
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

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending:    "bg-zinc-100 text-zinc-600 border-zinc-200",
  confirmed:  "bg-blue-50 text-blue-700 border-blue-200",
  fulfilled:  "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled:  "bg-red-50 text-red-600 border-red-200",
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "En attente", confirmed: "Confirmée", fulfilled: "Exécutée", cancelled: "Annulée",
};

function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-flex text-[11px] font-medium px-2 py-0.5 rounded-full border ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

function fmt(n: number) {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

const TRANSITIONS: Record<OrderStatus, { label: string; next: OrderStatus; icon: React.ElementType; cls: string }[]> = {
  pending:   [{ label: "Confirmer", next: "confirmed", icon: CheckCircle, cls: "bg-blue-50 text-blue-600 hover:bg-blue-100" }],
  confirmed: [{ label: "Marquer exécutée", next: "fulfilled", icon: Send, cls: "bg-emerald-50 text-emerald-600 hover:bg-emerald-100" },
              { label: "Annuler", next: "cancelled", icon: XCircle, cls: "bg-red-50 text-red-600 hover:bg-red-100" }],
  fulfilled: [{ label: "Remettre en attente", next: "pending", icon: RefreshCw, cls: "bg-zinc-100 text-zinc-600 hover:bg-zinc-200" }],
  cancelled: [{ label: "Remettre en attente", next: "pending", icon: RefreshCw, cls: "bg-zinc-100 text-zinc-600 hover:bg-zinc-200" }],
};

function OrderForm({ initial, accounts, contacts, onSave, onCancel, token }: {
  initial?: Order | null; accounts: Account[]; contacts: Contact[];
  onSave: (o: Order) => void; onCancel: () => void; token: string;
}) {
  const [form, setForm] = useState<OrderPayload>({
    title:      initial?.title      ?? "",
    status:     initial?.status     ?? "pending",
    sourceType: initial?.sourceType ?? null,
    sourceId:   initial?.sourceId   ?? null,
    account:    (initial?.account  as { _id: string } | null | undefined)?._id ?? "",
    contact:    (initial?.contact  as { _id: string } | null | undefined)?._id ?? "",
    lineItems:  initial?.lineItems  ?? [],
    notes:      initial?.notes      ?? "",
    terms:      initial?.terms      ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const set = (k: keyof OrderPayload) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title?.trim()) { setError("Le titre est requis."); return; }
    setError(""); setLoading(true);
    try {
      const payload = { ...form, account: form.account || null, contact: form.contact || null, sourceId: form.sourceId || null };
      const res = initial ? await updateOrder(token, initial._id, payload) : await createOrder(token, payload);
      onSave(res.order);
    } catch (err) { setError(err instanceof Error ? err.message : "Une erreur est survenue."); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <FormField label="Titre" required>
        <input className={inputCls} value={form.title} onChange={set("title")} placeholder="Commande client" />
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Statut">
          <select className={selectCls} value={form.status} onChange={set("status")}>
            {(["pending","confirmed","fulfilled","cancelled"] as OrderStatus[]).map((s) =>
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
        </FormField>
        <FormField label="Source">
          <select className={selectCls} value={form.sourceType ?? ""} onChange={set("sourceType")}>
            <option value="">— Aucune —</option>
            <option value="quote">Devis</option>
            <option value="invoice">Facture</option>
          </select>
        </FormField>
      </div>
      {form.sourceType === "quote" && (
        <FormField label="Devis source">
          <select className={selectCls} value={form.sourceId ?? ""} onChange={set("sourceId")}>
            <option value="">— Sélectionner —</option>
          </select>
        </FormField>
      )}
      {form.sourceType === "invoice" && (
        <FormField label="Facture source">
          <select className={selectCls} value={form.sourceId ?? ""} onChange={set("sourceId")}>
            <option value="">— Sélectionner —</option>
          </select>
        </FormField>
      )}
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
      <FormField label="Conditions">
        <textarea className={inputCls} rows={2} value={form.terms ?? ""} onChange={set("terms")} placeholder="Conditions de livraison…" />
      </FormField>
      {error && <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 py-2.5 text-sm font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors">Annuler</button>
        <button type="submit" disabled={loading} className="flex-1 flex items-center justify-center py-2.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-60 rounded-lg transition-colors">
          {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : initial ? "Enregistrer" : "Créer la commande"}
        </button>
      </div>
    </form>
  );
}

function OrderDetail({ order, token, onEdit, onDelete, onUpdated }: {
  order: Order; token: string;
  onEdit: () => void; onDelete: () => void;
  onUpdated: (o: Order) => void;
}) {
  const [statusLoading, setStatusLoading] = useState(false);
  const [error, setError] = useState("");

  const handleStatus = async (next: OrderStatus) => {
    setStatusLoading(true); setError("");
    try {
      const res = await updateOrder(token, order._id, { status: next });
      onUpdated(res.order);
    } catch { setError("Status update failed."); }
    finally { setStatusLoading(false); }
  };

  const accountName = (order.account as { name: string } | null | undefined)?.name;
  const contactName = order.contact
    ? `${(order.contact as { firstName: string; lastName: string }).firstName} ${(order.contact as { firstName: string; lastName: string }).lastName}`
    : null;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between pb-4 border-b border-zinc-100">
        <div>
          <p className="text-[11px] text-zinc-400 font-mono">{order.number}</p>
          <p className="text-base font-semibold text-zinc-900 mt-0.5">{order.title}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>
      <div>
        <DetailRow label="Client" value={accountName ?? contactName} />
        <DetailRow label="Source" value={order.sourceType ? (order.sourceType === "quote" ? "Devis" : "Facture") : undefined} />
        <DetailRow label="Propriétaire" value={order.owner?.name} />
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-medium mb-3">Lignes de commande</p>
        <LineItemEditor items={order.lineItems} onChange={() => {}} readOnly />
      </div>
      {order.notes && <DetailRow label="Notes" value={order.notes} />}
      {order.terms && <DetailRow label="Conditions" value={order.terms} />}
      {error && <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      {TRANSITIONS[order.status]?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {TRANSITIONS[order.status].map((t) => {
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

function SourcePicker({ sourceType, sources, token, onDone, onCancel }: {
  sourceType: "quote" | "invoice"; sources: Quote[] | Invoice[];
  token: string; onDone: (o: Order) => void; onCancel: () => void;
}) {
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handle = async () => {
    if (!selectedId) return;
    setError(""); setLoading(true);
    try {
      const res = await convertToOrder(token, sourceType, selectedId);
      onDone(res.order);
    } catch (err) { setError(err instanceof Error ? err.message : "Conversion failed."); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6 space-y-4">
        <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
          <ArrowRightCircle className="w-5 h-5 text-blue-500" strokeWidth={1.75} />
        </div>
        <div>
          <h3 className="text-base font-semibold text-zinc-900">Convertir en commande</h3>
          <p className="text-sm text-zinc-500 mt-1">Sélectionnez un {sourceType === "quote" ? "devis accepté" : "facture"} à convertir.</p>
        </div>
        <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}
          className="w-full px-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
          <option value="">— Sélectionner —</option>
          {sources.map((s) => <option key={s._id} value={s._id}>{s.number} – {s.title}</option>)}
        </select>
        {error && <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 text-sm font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors">Annuler</button>
          <button onClick={handle} disabled={!selectedId || loading} className="flex-1 flex items-center justify-center py-2.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-60 rounded-lg transition-colors">
            {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Convertir"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Orders() {
  const { token } = useAuth();
  const [orders, setOrders]     = useState<Order[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [selected, setSelected] = useState<Order | null>(null);
  const [editing, setEditing]   = useState<Order | null | "new">(null);
  const [deleting, setDeleting] = useState<Order | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [convertingSourceType, setConvertingSourceType] = useState<"quote" | "invoice" | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [quotes, setQuotes]     = useState<Quote[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const refLoaded = useRef(false);

  useEffect(() => {
    if (!token || refLoaded.current) return;
    refLoaded.current = true;
    Promise.all([
      listAccounts(token, { limit: 100 }).then((r) => setAccounts(r.accounts)),
      listContacts(token, { limit: 100 }).then((r) => setContacts(r.contacts)),
      listQuotes(token, { limit: 100, status: "accepted" }).then((r) => setQuotes(r.quotes)),
      listInvoices(token, { limit: 100 }).then((r) => setInvoices(r.invoices)),
    ]).catch(() => {});
  }, [token]);

  useEffect(() => { setPage(1); }, [search, statusFilter]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    listOrders(token, { search, page, limit: LIMIT, status: statusFilter || undefined })
      .then((r) => { setOrders(r.orders); setTotal(r.total); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token, search, page, statusFilter]);

  const handleSaved = (o: Order) => {
    setOrders((prev) => {
      const idx = prev.findIndex((x) => x._id === o._id);
      if (idx >= 0) return prev.map((x) => (x._id === o._id ? o : x));
      setTotal((n) => n + 1);
      return [o, ...prev];
    });
    setEditing(null);
    setSelected(o);
  };

  const handleDelete = async () => {
    if (!token || !deleting) return;
    setDeleteLoading(true);
    try {
      await deleteOrder(token, deleting._id);
      setOrders((prev) => prev.filter((x) => x._id !== deleting._id));
      setTotal((n) => n - 1);
      if (selected?._id === deleting._id) setSelected(null);
      setDeleting(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Delete failed."); }
    finally { setDeleteLoading(false); }
  };

  const handleConvertDone = (o: Order) => {
    setOrders((prev) => prev.map((x) => (x._id === o._id ? o : x)));
    setConvertingSourceType(null);
    setSelected(o);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">Commandes</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{total} commande{total !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setConvertingSourceType("quote")}
            className="flex items-center gap-2 px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium rounded-lg transition-colors">
            <ArrowRightCircle className="w-4 h-4" strokeWidth={1.75} /> Depuis devis
          </button>
          <button onClick={() => setConvertingSourceType("invoice")}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors">
            <ArrowRightCircle className="w-4 h-4" strokeWidth={1.75} /> Depuis facture
          </button>
          <button onClick={() => setEditing("new")}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors">
            <Plus className="w-4 h-4" strokeWidth={1.75} /> Nouvelle commande
          </button>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px]"><SearchBar value={search} onChange={setSearch} placeholder="Rechercher une commande…" /></div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors">
          <option value="">Tous les statuts</option>
          {(["pending","confirmed","fulfilled","cancelled"] as OrderStatus[]).map((s) =>
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
      </div>

      {error && <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20"><span className="w-6 h-6 border-2 border-zinc-300 border-t-blue-500 rounded-full animate-spin" /></div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Package className="w-10 h-10 text-zinc-300" strokeWidth={1.25} />
            <p className="text-sm text-zinc-400">Aucune commande.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100">
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-widest text-zinc-400 font-medium">Référence</th>
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-widest text-zinc-400 font-medium border-l border-zinc-100 hidden md:table-cell">Client</th>
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-widest text-zinc-400 font-medium border-l border-zinc-100">Statut</th>
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-widest text-zinc-400 font-medium border-l border-zinc-100 hidden lg:table-cell">Source</th>
                <th className="px-5 py-3 text-right text-[10px] uppercase tracking-widest text-zinc-400 font-medium border-l border-zinc-100 hidden lg:table-cell">Total TTC</th>
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-widest text-zinc-400 font-medium border-l border-zinc-100 hidden lg:table-cell">Date</th>
                <th className="px-5 py-3 border-l border-zinc-100" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {orders.map((o) => {
                const accountName = (o.account as { name: string } | null | undefined)?.name;
                const contactName = o.contact
                  ? `${(o.contact as { firstName: string; lastName: string }).firstName} ${(o.contact as { firstName: string; lastName: string }).lastName}`
                  : null;
                return (
                  <tr key={o._id} onClick={() => setSelected(o)} className="hover:bg-zinc-50 cursor-pointer transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-mono text-xs text-zinc-400">{o.number}</p>
                      <p className="font-medium text-zinc-800 truncate max-w-[200px]">{o.title}</p>
                    </td>
                    <td className="px-5 py-3.5 text-zinc-500 border-l border-zinc-100 hidden md:table-cell">{accountName ?? contactName ?? "—"}</td>
                    <td className="px-5 py-3.5 border-l border-zinc-100"><StatusBadge status={o.status} /></td>
                    <td className="px-5 py-3.5 text-zinc-500 border-l border-zinc-100 hidden lg:table-cell">{o.sourceType ? (o.sourceType === "quote" ? "Devis" : "Facture") : "—"}</td>
                    <td className="px-5 py-3.5 text-right font-semibold text-zinc-700 border-l border-zinc-100 hidden lg:table-cell">{fmt(o.grandTotal)}</td>
                    <td className="px-5 py-3.5 text-zinc-500 border-l border-zinc-100 hidden lg:table-cell">{o.createdAt ? new Date(o.createdAt).toLocaleDateString("fr-FR") : "—"}</td>
                    <td className="px-5 py-3.5 text-right border-l border-zinc-100" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => setEditing(o)} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors"><Pencil className="w-3.5 h-3.5" strokeWidth={1.75} /></button>
                      <button onClick={() => setDeleting(o)} className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors ml-1"><Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Pagination page={page} total={total} limit={LIMIT} onChange={setPage} />

      <SlideOver open={!!selected && !editing} onClose={() => setSelected(null)} title={selected?.number ?? ""} subtitle={selected?.title} width="w-[600px]">
        {selected && token && (
          <OrderDetail
            order={selected} token={token}
            onEdit={() => setEditing(selected)}
            onDelete={() => { setDeleting(selected); setSelected(null); }}
            onUpdated={(o) => { setOrders((prev) => prev.map((x) => (x._id === o._id ? o : x))); setSelected(o); }}
          />
        )}
      </SlideOver>

      <SlideOver open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "Nouvelle commande" : "Modifier la commande"} width="w-[600px]">
        {editing !== null && (
          <OrderForm initial={editing === "new" ? null : editing} accounts={accounts} contacts={contacts} token={token!} onSave={handleSaved} onCancel={() => setEditing(null)} />
        )}
      </SlideOver>

      {deleting && <ConfirmDelete name={`${deleting.number} – ${deleting.title}`} onConfirm={handleDelete} onCancel={() => setDeleting(null)} loading={deleteLoading} />}
      {convertingSourceType && token && (
        <SourcePicker
          sourceType={convertingSourceType}
          sources={convertingSourceType === "quote" ? quotes : invoices}
          token={token}
          onDone={handleConvertDone}
          onCancel={() => setConvertingSourceType(null)}
        />
      )}
    </div>
  );
}
