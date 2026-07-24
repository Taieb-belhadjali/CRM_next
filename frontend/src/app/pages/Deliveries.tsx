import { useEffect, useRef, useState } from "react";
import {
  Plus, Pencil, Trash2, Truck, CheckCircle, RefreshCw, Package,
} from "lucide-react";
import {
  listDeliveries, createDelivery, updateDelivery, deleteDelivery,
  listOrders, listInvoices,
  type Delivery, type DeliveryPayload, type DeliveryStatus,
  type Order, type Invoice,
} from "../api";
import { useAuth } from "../hooks/useAuth";
import { SlideOver } from "../components/shared/SlideOver";
import { ConfirmDelete } from "../components/shared/ConfirmDelete";
import { Pagination } from "../components/shared/Pagination";
import { SearchBar } from "../components/shared/SearchBar";
import { DetailRow } from "../components/shared/DetailRow";
import { FormField, inputCls, selectCls } from "../components/shared/FormField";

const LIMIT = 25;

const STATUS_STYLES: Record<DeliveryStatus, string> = {
  preparing: "bg-zinc-100 text-zinc-600 border-zinc-200",
  shipped:   "bg-blue-50 text-blue-700 border-blue-200",
  delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const STATUS_LABELS: Record<DeliveryStatus, string> = {
  preparing: "Préparation", shipped: "Expédiée", delivered: "Livrée",
};

function StatusBadge({ status }: { status: DeliveryStatus }) {
  return (
    <span className={`inline-flex text-[11px] font-medium px-2 py-0.5 rounded-full border ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR");
}

const TRANSITIONS: Record<DeliveryStatus, { label: string; next: DeliveryStatus; icon: React.ElementType; cls: string }[]> = {
  preparing: [{ label: "Expédier", next: "shipped", icon: Truck, cls: "bg-blue-50 text-blue-600 hover:bg-blue-100" }],
  shipped:   [{ label: "Marquer livrée", next: "delivered", icon: CheckCircle, cls: "bg-emerald-50 text-emerald-600 hover:bg-emerald-100" }],
  delivered: [{ label: "Remettre en préparation", next: "preparing", icon: RefreshCw, cls: "bg-zinc-100 text-zinc-600 hover:bg-zinc-200" }],
};

function DeliveryForm({ initial, orders, invoices, onSave, onCancel, token }: {
  initial?: Delivery | null; orders: Order[]; invoices: Invoice[];
  onSave: (d: Delivery) => void; onCancel: () => void; token: string;
}) {
  const [form, setForm] = useState<DeliveryPayload>({
    orderId:            initial?.orderId ?? "",
    invoiceId:          initial?.invoiceId ?? null,
    trackingNumber:     initial?.trackingNumber ?? "",
    status:             initial?.status ?? "preparing",
    carrier:            initial?.carrier ?? "",
    estimatedDelivery:  initial?.estimatedDelivery ? initial.estimatedDelivery.slice(0, 10) : "",
    notes:              initial?.notes ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const set = (k: keyof DeliveryPayload) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.orderId) { setError("La commande est requise."); return; }
    if (!form.trackingNumber?.trim()) { setError("Le numéro de suivi est requis."); return; }
    setError(""); setLoading(true);
    try {
      const payload = { ...form, estimatedDelivery: form.estimatedDelivery || null };
      const res = initial ? await updateDelivery(token, initial._id, payload) : await createDelivery(token, payload);
      onSave(res.delivery);
    } catch (err) { setError(err instanceof Error ? err.message : "Une erreur est survenue."); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <FormField label="Commande" required>
        <select className={selectCls} value={form.orderId} onChange={set("orderId")}>
          <option value="">— Sélectionner —</option>
          {orders.map((o) => <option key={o._id} value={o._id}>{o.number} – {o.title}</option>)}
        </select>
      </FormField>
      <FormField label="Facture liée (optionnel)">
        <select className={selectCls} value={form.invoiceId ?? ""} onChange={set("invoiceId")}>
          <option value="">— Aucune —</option>
          {invoices.map((inv) => <option key={inv._id} value={inv._id}>{inv.number} – {inv.title}</option>)}
        </select>
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="N° de suivi" required>
          <input className={inputCls} value={form.trackingNumber} onChange={set("trackingNumber")} placeholder="TRK123456" />
        </FormField>
        <FormField label="Statut">
          <select className={selectCls} value={form.status} onChange={set("status")}>
            {(["preparing","shipped","delivered"] as DeliveryStatus[]).map((s) =>
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Transporteur">
          <input className={inputCls} value={form.carrier} onChange={set("carrier")} placeholder="Colissimo, DHL…" />
        </FormField>
        <FormField label="Livraison estimée">
          <input className={inputCls} type="date" value={form.estimatedDelivery ?? ""} onChange={set("estimatedDelivery")} />
        </FormField>
      </div>
      <FormField label="Notes">
        <textarea className={inputCls} rows={2} value={form.notes ?? ""} onChange={set("notes")} placeholder="Remarques…" />
      </FormField>
      {error && <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 py-2.5 text-sm font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors">Annuler</button>
        <button type="submit" disabled={loading} className="flex-1 flex items-center justify-center py-2.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-60 rounded-lg transition-colors">
          {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : initial ? "Enregistrer" : "Créer la livraison"}
        </button>
      </div>
    </form>
  );
}

function DeliveryDetail({ delivery, token, onEdit, onDelete, onUpdated }: {
  delivery: Delivery; token: string;
  onEdit: () => void; onDelete: () => void;
  onUpdated: (d: Delivery) => void;
}) {
  const [statusLoading, setStatusLoading] = useState(false);
  const [error, setError] = useState("");

  const handleStatus = async (next: DeliveryStatus) => {
    setStatusLoading(true); setError("");
    try {
      const res = await updateDelivery(token, delivery._id, { status: next });
      onUpdated(res.delivery);
    } catch { setError("Status update failed."); }
    finally { setStatusLoading(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between pb-4 border-b border-zinc-100">
        <div>
          <p className="text-[11px] text-zinc-400 font-mono">{delivery.number}</p>
          <p className="text-base font-semibold text-zinc-900 mt-0.5">
            Livraison {delivery.orderId ? (delivery.orderId as { number: string }).number : "—"}
          </p>
        </div>
        <StatusBadge status={delivery.status} />
      </div>
      <div>
        <DetailRow label="N° de suivi" value={delivery.trackingNumber} />
        <DetailRow label="Transporteur" value={delivery.carrier} />
        <DetailRow label="Livraison estimée" value={fmtDate(delivery.estimatedDelivery)} />
        <DetailRow label="Livrée le" value={fmtDate(delivery.deliveredAt)} />
        {delivery.order && <DetailRow label="Commande" value={`${(delivery.order as { number: string }).number} – ${(delivery.order as { title: string }).title}`} />}
        {delivery.invoice && <DetailRow label="Facture" value={`${(delivery.invoice as { number: string }).number} – ${(delivery.invoice as { title: string }).title}`} />}
      </div>
      {delivery.notes && <DetailRow label="Notes" value={delivery.notes} />}
      {error && <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      {TRANSITIONS[delivery.status]?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {TRANSITIONS[delivery.status].map((t) => {
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

export default function Deliveries() {
  const { token } = useAuth();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [search, setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [selected, setSelected]   = useState<Delivery | null>(null);
  const [editing, setEditing]     = useState<Delivery | null | "new">(null);
  const [deleting, setDeleting]   = useState<Delivery | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [orders, setOrders]       = useState<Order[]>([]);
  const [invoices, setInvoices]   = useState<Invoice[]>([]);
  const refLoaded = useRef(false);

  useEffect(() => {
    if (!token || refLoaded.current) return;
    refLoaded.current = true;
    Promise.all([
      listOrders(token, { limit: 100 }).then((r) => setOrders(r.orders)),
      listInvoices(token, { limit: 100 }).then((r) => setInvoices(r.invoices)),
    ]).catch(() => {});
  }, [token]);

  useEffect(() => { setPage(1); }, [search, statusFilter]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    listDeliveries(token, { search, page, limit: LIMIT, status: statusFilter || undefined })
      .then((r) => { setDeliveries(r.deliveries); setTotal(r.total); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token, search, page, statusFilter]);

  const handleSaved = (d: Delivery) => {
    setDeliveries((prev) => {
      const idx = prev.findIndex((x) => x._id === d._id);
      if (idx >= 0) return prev.map((x) => (x._id === d._id ? d : x));
      setTotal((n) => n + 1);
      return [d, ...prev];
    });
    setEditing(null);
    setSelected(d);
  };

  const handleDelete = async () => {
    if (!token || !deleting) return;
    setDeleteLoading(true);
    try {
      await deleteDelivery(token, deleting._id);
      setDeliveries((prev) => prev.filter((x) => x._id !== deleting._id));
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
          <h1 className="text-lg font-semibold text-zinc-900">Livraisons</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{total} livraison{total !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={() => setEditing("new")}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus className="w-4 h-4" strokeWidth={1.75} /> Nouvelle livraison
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px]"><SearchBar value={search} onChange={setSearch} placeholder="Rechercher une livraison…" /></div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors">
          <option value="">Tous les statuts</option>
          {(["preparing","shipped","delivered"] as DeliveryStatus[]).map((s) =>
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
      </div>

      {error && <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20"><span className="w-6 h-6 border-2 border-zinc-300 border-t-blue-500 rounded-full animate-spin" /></div>
        ) : deliveries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Truck className="w-10 h-10 text-zinc-300" strokeWidth={1.25} />
            <p className="text-sm text-zinc-400">Aucune livraison.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100">
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-widest text-zinc-400 font-medium">Référence</th>
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-widest text-zinc-400 font-medium border-l border-zinc-100">Commande</th>
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-widest text-zinc-400 font-medium border-l border-zinc-100">N° de suivi</th>
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-widest text-zinc-400 font-medium border-l border-zinc-100">Statut</th>
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-widest text-zinc-400 font-medium border-l border-zinc-100 hidden lg:table-cell">Transporteur</th>
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-widest text-zinc-400 font-medium border-l border-zinc-100 hidden lg:table-cell">Livraison</th>
                <th className="px-5 py-3 border-l border-zinc-100" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {deliveries.map((d) => (
                <tr key={d._id} onClick={() => setSelected(d)} className="hover:bg-zinc-50 cursor-pointer transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-mono text-xs text-zinc-400">{d.number}</p>
                  </td>
                  <td className="px-5 py-3.5 text-zinc-500 border-l border-zinc-100">
                    {d.orderId ? `${(d.orderId as { number: string }).number}` : "—"}
                  </td>
                  <td className="px-5 py-3.5 text-zinc-700 border-l border-zinc-100">{d.trackingNumber}</td>
                  <td className="px-5 py-3.5 border-l border-zinc-100"><StatusBadge status={d.status} /></td>
                  <td className="px-5 py-3.5 text-zinc-500 border-l border-zinc-100 hidden lg:table-cell">{d.carrier ?? "—"}</td>
                  <td className="px-5 py-3.5 text-zinc-500 border-l border-zinc-100 hidden lg:table-cell">{fmtDate(d.estimatedDelivery)}</td>
                  <td className="px-5 py-3.5 text-right border-l border-zinc-100" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => setEditing(d)} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors"><Pencil className="w-3.5 h-3.5" strokeWidth={1.75} /></button>
                    <button onClick={() => setDeleting(d)} className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors ml-1"><Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Pagination page={page} total={total} limit={LIMIT} onChange={setPage} />

      <SlideOver open={!!selected && !editing} onClose={() => setSelected(null)} title={selected?.number ?? ""} subtitle="Détail de la livraison" width="w-[600px]">
        {selected && token && (
          <DeliveryDetail
            delivery={selected} token={token}
            onEdit={() => setEditing(selected)}
            onDelete={() => { setDeleting(selected); setSelected(null); }}
            onUpdated={(d) => { setDeliveries((prev) => prev.map((x) => (x._id === d._id ? d : x))); setSelected(d); }}
          />
        )}
      </SlideOver>

      <SlideOver open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "Nouvelle livraison" : "Modifier la livraison"} width="w-[600px]">
        {editing !== null && (
          <DeliveryForm initial={editing === "new" ? null : editing} orders={orders} invoices={invoices} token={token!} onSave={handleSaved} onCancel={() => setEditing(null)} />
        )}
      </SlideOver>

      {deleting && <ConfirmDelete name={`${deleting.number} – livraison`} onConfirm={handleDelete} onCancel={() => setDeleting(null)} loading={deleteLoading} />}
    </div>
  );
}
