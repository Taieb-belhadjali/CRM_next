import { useEffect, useRef, useState } from "react";
import {
  Plus, Pencil, Trash2, Truck, CheckCircle, RefreshCw, Package,
} from "lucide-react";
import {
  listDeliveries, createDelivery, updateDelivery, deleteDelivery,
  listOrders, listInvoices, listAccounts, listContacts,
  type Delivery, type DeliveryPayload, type DeliveryStatus,
  type Order, type Invoice, type Account, type Contact,
} from "../api";
import { useAuth } from "../hooks/useAuth";
import { useLanguage } from "../context/LanguageContext";
import { SlideOver } from "../components/shared/SlideOver";
import { ConfirmDelete } from "../components/shared/ConfirmDelete";
import { Pagination } from "../components/shared/Pagination";
import { SearchBar } from "../components/shared/SearchBar";
import { DetailRow } from "../components/shared/DetailRow";
import { FormField, inputCls, selectCls } from "../components/shared/FormField";
import { LineItemEditor } from "../components/shared/LineItemEditor";

const LIMIT = 25;

const STATUS_STYLES: Record<DeliveryStatus, string> = {
  preparing: "bg-zinc-100 text-zinc-600 border-zinc-200",
  shipped:   "bg-blue-50 text-blue-700 border-blue-200",
  delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

function StatusBadge({ status }: { status: DeliveryStatus }) {
  const { t } = useLanguage();
  return (
    <span className={`inline-flex text-[11px] font-medium px-2 py-0.5 rounded-full border ${STATUS_STYLES[status]}`}>
      {t("status." + status)}
    </span>
  );
}

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR");
}

const TRANSITIONS: Record<DeliveryStatus, { labelKey: string; next: DeliveryStatus; icon: React.ElementType; cls: string }[]> = {
  preparing: [{ labelKey: "pages.deliveries.transitionShip", next: "shipped", icon: Truck, cls: "bg-blue-50 text-blue-600 hover:bg-blue-100" }],
  shipped:   [{ labelKey: "pages.deliveries.transitionDelivered", next: "delivered", icon: CheckCircle, cls: "bg-emerald-50 text-emerald-600 hover:bg-emerald-100" }],
  delivered: [{ labelKey: "pages.deliveries.transitionReopen", next: "preparing", icon: RefreshCw, cls: "bg-zinc-100 text-zinc-600 hover:bg-zinc-200" }],
};

function DeliveryForm({ initial, orders, invoices, accounts, contacts, onSave, onCancel, token }: {
  initial?: Delivery | null; orders: Order[]; invoices: Invoice[]; accounts: Account[]; contacts: Contact[];
  onSave: (d: Delivery) => void; onCancel: () => void; token: string;
}) {
  const { t } = useLanguage();
  const [form, setForm] = useState<DeliveryPayload>({
    orderId:            initial?.orderId ?? "",
    invoiceId:          initial?.invoiceId ?? null,
    contact:            (initial?.contact as { _id: string } | null | undefined)?._id ?? "",
    account:            (initial?.account as { _id: string } | null | undefined)?._id ?? "",
    trackingNumber:     initial?.trackingNumber ?? "",
    deliveryAddress:    initial?.deliveryAddress ?? "",
    status:             initial?.status ?? "preparing",
    carrier:            initial?.carrier ?? "",
    estimatedDelivery:  initial?.estimatedDelivery ? initial.estimatedDelivery.slice(0, 10) : "",
    lineItems:          initial?.lineItems ?? [],
    notes:              initial?.notes ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const set = (k: keyof DeliveryPayload) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.orderId) { setError(t("errors.orderRequired")); return; }
    if (!form.trackingNumber?.trim()) { setError(t("errors.trackingNumberRequired")); return; }
    setError(""); setLoading(true);
    try {
      const payload = {
        ...form,
        account: form.account || null,
        contact: form.contact || null,
        estimatedDelivery: form.estimatedDelivery || null,
      };
      const res = initial ? await updateDelivery(token, initial._id, payload) : await createDelivery(token, payload);
      onSave(res.delivery);
    } catch (err) { setError(err instanceof Error ? err.message : t("errors.genericError")); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <FormField label={t("forms.order")} required>
          <select className={selectCls} value={form.orderId} onChange={set("orderId")}>
            <option value="">{t("pages.orders.selectSource")}</option>
            {orders.map((o) => <option key={o._id} value={o._id}>{o.number} – {o.title}</option>)}
          </select>
        </FormField>
        <FormField label={t("forms.invoiceLinked")}>
          <select className={selectCls} value={form.invoiceId ?? ""} onChange={set("invoiceId")}>
            <option value="">{t("pages.orders.noSource")}</option>
            {invoices.map((inv) => <option key={inv._id} value={inv._id}>{inv.number} – {inv.title}</option>)}
          </select>
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField label={t("forms.clientAccount")}>
          <select className={selectCls} value={form.account ?? ""} onChange={set("account")}>
            <option value="">{t("pages.orders.noSource")}</option>
            {accounts.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
          </select>
        </FormField>
        <FormField label={t("forms.contact")}>
          <select className={selectCls} value={form.contact ?? ""} onChange={set("contact")}>
            <option value="">{t("pages.orders.noSource")}</option>
            {contacts.map((c) => <option key={c._id} value={c._id}>{c.firstName} {c.lastName}</option>)}
          </select>
        </FormField>
      </div>
      <FormField label={t("forms.deliveryAddress")}>
        <textarea className={inputCls} rows={2} value={form.deliveryAddress ?? ""} onChange={set("deliveryAddress")} placeholder={t("forms.deliveryAddressPlaceholder")} />
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField label={t("forms.trackingNumber")} required>
          <input className={inputCls} value={form.trackingNumber} onChange={set("trackingNumber")} placeholder={t("forms.trackingNumberPlaceholder")} />
        </FormField>
        <FormField label={t("forms.status")}>
          <select className={selectCls} value={form.status} onChange={set("status")}>
            {(["preparing","shipped","delivered"] as DeliveryStatus[]).map((s) =>
              <option key={s} value={s}>{t("status." + s)}</option>)}
          </select>
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField label={t("forms.carrier")}>
          <input className={inputCls} value={form.carrier} onChange={set("carrier")} placeholder={t("forms.carrierPlaceholder")} />
        </FormField>
        <FormField label={t("forms.estimatedDelivery")}>
          <input className={inputCls} type="date" value={form.estimatedDelivery ?? ""} onChange={set("estimatedDelivery")} />
        </FormField>
      </div>
      <div>
        <p className="text-xs font-medium text-zinc-700 mb-2">{t("forms.productsToDeliver")}</p>
        <LineItemEditor items={form.lineItems ?? []} onChange={(li) => setForm((p) => ({ ...p, lineItems: li }))} />
      </div>
      <FormField label={t("forms.notes")}>
        <textarea className={inputCls} rows={2} value={form.notes ?? ""} onChange={set("notes")} placeholder={t("forms.notesPlaceholder")} />
      </FormField>
      {error && <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 py-2.5 text-sm font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors">{t("common.cancel")}</button>
        <button type="submit" disabled={loading} className="flex-1 flex items-center justify-center py-2.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-60 rounded-lg transition-colors">
          {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : initial ? t("common.save") : t("pages.deliveries.createDelivery")}
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
  const { t } = useLanguage();
  const [statusLoading, setStatusLoading] = useState(false);
  const [error, setError] = useState("");

  const handleStatus = async (next: DeliveryStatus) => {
    setStatusLoading(true); setError("");
    try {
      const res = await updateDelivery(token, delivery._id, { status: next });
      onUpdated(res.delivery);
    } catch { setError(t("errors.statusUpdateFailed")); }
    finally { setStatusLoading(false); }
  };

  const accountName = (delivery.account as { name: string } | null | undefined)?.name;
  const contactName = delivery.contact
    ? `${(delivery.contact as { firstName: string; lastName: string }).firstName} ${(delivery.contact as { firstName: string; lastName: string }).lastName}`
    : null;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between pb-4 border-b border-zinc-100">
        <div>
          <p className="text-[11px] text-zinc-400 font-mono">{delivery.number}</p>
          <p className="text-base font-semibold text-zinc-900 mt-0.5">
            {t("pages.deliveries.deliveryTitle", { number: delivery.orderId ? (delivery.orderId as { number: string }).number : "—" })}
          </p>
        </div>
        <StatusBadge status={delivery.status} />
      </div>
      <div>
        <DetailRow label={t("forms.client")} value={accountName ?? contactName} />
        <DetailRow label={t("pages.deliveries.address")} value={delivery.deliveryAddress} />
        <DetailRow label={t("forms.trackingNumber")} value={delivery.trackingNumber} />
        <DetailRow label={t("forms.carrier")} value={delivery.carrier} />
        <DetailRow label={t("forms.estimatedDelivery")} value={fmtDate(delivery.estimatedDelivery)} />
        <DetailRow label={t("pages.deliveries.deliveredOn")} value={fmtDate(delivery.deliveredAt)} />
        {delivery.order && <DetailRow label={t("pages.deliveries.order")} value={`${(delivery.order as { number: string }).number} – ${(delivery.order as { title: string }).title}`} />}
        {delivery.invoice && <DetailRow label={t("forms.invoice")} value={`${(delivery.invoice as { number: string }).number} – ${(delivery.invoice as { title: string }).title}`} />}
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-medium mb-3">{t("forms.productsToDeliver")}</p>
        <LineItemEditor items={delivery.lineItems ?? []} onChange={() => {}} readOnly />
      </div>
      {delivery.notes && <DetailRow label={t("forms.notes")} value={delivery.notes} />}
      {error && <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      {TRANSITIONS[delivery.status]?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {TRANSITIONS[delivery.status].map((tr) => {
            const Icon = tr.icon;
            return (
              <button key={tr.next} onClick={() => handleStatus(tr.next)} disabled={statusLoading}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${tr.cls}`}>
                <Icon className="w-3.5 h-3.5" strokeWidth={1.75} /> {t(tr.labelKey)}
              </button>
            );
          })}
        </div>
      )}
      <div className="flex flex-wrap gap-2 pt-1">
        <button onClick={onEdit}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors">
          <Pencil className="w-3.5 h-3.5" strokeWidth={1.75} /> {t("common.edit")}
        </button>
        <button onClick={onDelete}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
          <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} /> {t("common.delete")}
        </button>
      </div>
    </div>
  );
}

export default function Deliveries() {
  const { token } = useAuth();
  const { t } = useLanguage();
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
  const [accounts, setAccounts]   = useState<Account[]>([]);
  const [contacts, setContacts]   = useState<Contact[]>([]);
  const refLoaded = useRef(false);

  useEffect(() => {
    if (!token || refLoaded.current) return;
    refLoaded.current = true;
    Promise.all([
      listOrders(token, { limit: 100 }).then((r) => setOrders(r.orders)),
      listInvoices(token, { limit: 100 }).then((r) => setInvoices(r.invoices)),
      listAccounts(token, { limit: 100 }).then((r) => setAccounts(r.accounts)),
      listContacts(token, { limit: 100 }).then((r) => setContacts(r.contacts)),
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
    } catch (e) { setError(e instanceof Error ? e.message : t("errors.deleteFailed")); }
    finally { setDeleteLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">{t("pages.deliveries.title")}</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{total} {total === 1 ? t("pages.deliveries.deliverySingular") : t("pages.deliveries.deliveryPlural")}</p>
        </div>
        <button onClick={() => setEditing("new")}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus className="w-4 h-4" strokeWidth={1.75} /> {t("pages.deliveries.newDelivery")}
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px]"><SearchBar value={search} onChange={setSearch} placeholder={t("pages.deliveries.searchPlaceholder")} /></div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors">
          <option value="">{t("pages.deliveries.allStatuses")}</option>
          {(["preparing","shipped","delivered"] as DeliveryStatus[]).map((s) =>
            <option key={s} value={s}>{t("status." + s)}</option>)}
        </select>
      </div>

      {error && <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20"><span className="w-6 h-6 border-2 border-zinc-300 border-t-blue-500 rounded-full animate-spin" /></div>
        ) : deliveries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Truck className="w-10 h-10 text-zinc-300" strokeWidth={1.25} />
            <p className="text-sm text-zinc-400">{t("pages.deliveries.noDeliveries")}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100">
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-widest text-zinc-400 font-medium">{t("pages.deliveries.reference")}</th>
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-widest text-zinc-400 font-medium border-l border-zinc-100">{t("pages.deliveries.order")}</th>
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-widest text-zinc-400 font-medium border-l border-zinc-100">{t("forms.trackingNumber")}</th>
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-widest text-zinc-400 font-medium border-l border-zinc-100">{t("forms.status")}</th>
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-widest text-zinc-400 font-medium border-l border-zinc-100 hidden lg:table-cell">{t("forms.client")}</th>
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-widest text-zinc-400 font-medium border-l border-zinc-100 hidden lg:table-cell">{t("pages.deliveries.deliveryColumn")}</th>
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
                  <td className="px-5 py-3.5 text-zinc-500 border-l border-zinc-100 hidden lg:table-cell">
                    {d.account ? (d.account as { name: string }).name : d.contact ? `${(d.contact as { firstName: string }).firstName} ${(d.contact as { lastName: string }).lastName}` : "—"}
                  </td>
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

      <SlideOver open={!!selected && !editing} onClose={() => setSelected(null)} title={selected?.number ?? ""} subtitle={t("pages.deliveries.detailSubtitle")} width="w-[600px]">
        {selected && token && (
          <DeliveryDetail
            delivery={selected} token={token}
            onEdit={() => setEditing(selected)}
            onDelete={() => { setDeleting(selected); setSelected(null); }}
            onUpdated={(d) => { setDeliveries((prev) => prev.map((x) => (x._id === d._id ? d : x))); setSelected(d); }}
          />
        )}
      </SlideOver>

      <SlideOver open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? t("pages.deliveries.newDelivery") : t("pages.deliveries.editDelivery")} width="w-[600px]">
        {editing !== null && (
          <DeliveryForm initial={editing === "new" ? null : editing} orders={orders} invoices={invoices} accounts={accounts} contacts={contacts} token={token!} onSave={handleSaved} onCancel={() => setEditing(null)} />
        )}
      </SlideOver>

      {deleting && <ConfirmDelete name={`${deleting.number} – ${t("pages.deliveries.deliverySingular")}`} onConfirm={handleDelete} onCancel={() => setDeleting(null)} loading={deleteLoading} />}
    </div>
  );
}
