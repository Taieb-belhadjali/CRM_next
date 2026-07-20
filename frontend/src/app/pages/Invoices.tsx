import { useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, Receipt, Download, CheckCircle, Clock, XCircle, Send, CreditCard } from "lucide-react";
import {
  listInvoices, createInvoice, updateInvoice, deleteInvoice, downloadPdf,
  listAccounts, listContacts,
  type Invoice, type InvoicePayload, type InvoiceStatus, type LineItem,
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

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  draft:     "bg-zinc-100 text-zinc-600 border-zinc-200",
  sent:      "bg-blue-50 text-blue-700 border-blue-200",
  unpaid:    "bg-amber-50 text-amber-700 border-amber-200",
  partial:   "bg-violet-50 text-violet-700 border-violet-200",
  paid:      "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-red-50 text-red-600 border-red-200",
};

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: "Brouillon", sent: "Envoyée", unpaid: "Impayée",
  partial: "Partielle", paid: "Payée", cancelled: "Annulée",
};

function StatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <span className={`inline-flex text-[11px] font-medium px-2 py-0.5 rounded-full border ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

function fmt(n: number) {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function isOverdue(inv: Invoice) {
  return inv.dueDate && !["paid","cancelled"].includes(inv.status) && new Date(inv.dueDate) < new Date();
}

// Status workflow
const TRANSITIONS: Record<InvoiceStatus, { label: string; next: InvoiceStatus; icon: React.ElementType; cls: string }[]> = {
  draft:     [{ label: "Marquer envoyée",  next: "sent",      icon: Send,        cls: "bg-blue-50 text-blue-600 hover:bg-blue-100" }],
  sent:      [{ label: "Marquer impayée",  next: "unpaid",    icon: Clock,       cls: "bg-amber-50 text-amber-600 hover:bg-amber-100" }],
  unpaid:    [{ label: "Paiement partiel", next: "partial",   icon: CreditCard,  cls: "bg-violet-50 text-violet-600 hover:bg-violet-100" },
              { label: "Marquer payée",    next: "paid",      icon: CheckCircle, cls: "bg-emerald-50 text-emerald-600 hover:bg-emerald-100" },
              { label: "Annuler",          next: "cancelled", icon: XCircle,     cls: "bg-red-50 text-red-600 hover:bg-red-100" }],
  partial:   [{ label: "Marquer payée",    next: "paid",      icon: CheckCircle, cls: "bg-emerald-50 text-emerald-600 hover:bg-emerald-100" }],
  paid:      [],
  cancelled: [{ label: "Remettre en brouillon", next: "draft", icon: Pencil,    cls: "bg-zinc-100 text-zinc-600 hover:bg-zinc-200" }],
};

// ── Form ──────────────────────────────────────────────────────────────────────

function InvoiceForm({ initial, accounts, contacts, onSave, onCancel, token }: {
  initial?: Invoice | null; accounts: Account[]; contacts: Contact[];
  onSave: (inv: Invoice) => void; onCancel: () => void; token: string;
}) {
  const [form, setForm] = useState<InvoicePayload>({
    title:       initial?.title       ?? "",
    status:      initial?.status      ?? "draft",
    issueDate:   initial?.issueDate   ? initial.issueDate.slice(0, 10)   : new Date().toISOString().slice(0, 10),
    dueDate:     initial?.dueDate     ? initial.dueDate.slice(0, 10)     : "",
    account:     (initial?.account  as { _id: string } | null | undefined)?._id ?? "",
    contact:     (initial?.contact  as { _id: string } | null | undefined)?._id ?? "",
    paidAmount:  initial?.paidAmount  ?? 0,
    lineItems:   initial?.lineItems   ?? [],
    notes:       initial?.notes       ?? "",
    terms:       initial?.terms       ?? "",
    paymentInfo: initial?.paymentInfo ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const set = (k: keyof InvoicePayload) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title?.trim()) { setError("Le titre est requis."); return; }
    setError(""); setLoading(true);
    try {
      const payload = { ...form, account: form.account || null, contact: form.contact || null, dueDate: form.dueDate || null };
      const res = initial ? await updateInvoice(token, initial._id, payload) : await createInvoice(token, payload);
      onSave(res.invoice);
    } catch (err) { setError(err instanceof Error ? err.message : "Une erreur est survenue."); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <FormField label="Titre" required>
        <input className={inputCls} value={form.title} onChange={set("title")} placeholder="Facture développement sprint 1" />
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Date d'émission">
          <input className={inputCls} type="date" value={form.issueDate ?? ""} onChange={set("issueDate")} />
        </FormField>
        <FormField label="Date d'échéance">
          <input className={inputCls} type="date" value={form.dueDate ?? ""} onChange={set("dueDate")} />
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
        <p className="text-xs font-medium text-zinc-700 mb-2">Lignes de prestation</p>
        <LineItemEditor items={form.lineItems ?? []} onChange={(li: LineItem[]) => setForm((p) => ({ ...p, lineItems: li }))} />
      </div>
      <FormField label="Montant payé (€)">
        <input className={inputCls} type="number" min={0} step={0.01}
          value={form.paidAmount ?? 0}
          onChange={(e) => setForm((p) => ({ ...p, paidAmount: Number(e.target.value) }))} />
      </FormField>
      <FormField label="Coordonnées bancaires">
        <textarea className={inputCls} rows={2} value={form.paymentInfo ?? ""} onChange={set("paymentInfo")} placeholder="IBAN, BIC, virement…" />
      </FormField>
      <FormField label="Notes">
        <textarea className={inputCls} rows={2} value={form.notes ?? ""} onChange={set("notes")} placeholder="Remarques…" />
      </FormField>
      <FormField label="Conditions">
        <textarea className={inputCls} rows={2} value={form.terms ?? ""} onChange={set("terms")} placeholder="Conditions de paiement…" />
      </FormField>
      {error && <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 py-2.5 text-sm font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors">Annuler</button>
        <button type="submit" disabled={loading} className="flex-1 flex items-center justify-center py-2.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-60 rounded-lg transition-colors">
          {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : initial ? "Enregistrer" : "Créer la facture"}
        </button>
      </div>
    </form>
  );
}

// ── Detail panel ──────────────────────────────────────────────────────────────

function InvoiceDetail({ invoice, token, onEdit, onDelete, onUpdated }: {
  invoice: Invoice; token: string;
  onEdit: () => void; onDelete: () => void; onUpdated: (inv: Invoice) => void;
}) {
  const [dlLoading, setDlLoading]         = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [error, setError]                 = useState("");

  const handleDownload = async () => {
    setDlLoading(true);
    try {
      const blob = await downloadPdf(token, "invoice", invoice._id);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${invoice.number}.pdf`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch { setError("PDF download failed."); }
    finally { setDlLoading(false); }
  };

  const handleStatus = async (next: InvoiceStatus) => {
    setStatusLoading(true); setError("");
    try {
      const res = await updateInvoice(token, invoice._id, { status: next });
      onUpdated(res.invoice);
    } catch { setError("Status update failed."); }
    finally { setStatusLoading(false); }
  };

  const overdue = isOverdue(invoice);
  const remaining = invoice.grandTotal - invoice.paidAmount;
  const accountName = (invoice.account as { name: string } | null | undefined)?.name;
  const contactName = invoice.contact
    ? `${(invoice.contact as { firstName: string; lastName: string }).firstName} ${(invoice.contact as { firstName: string; lastName: string }).lastName}`
    : null;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between pb-4 border-b border-zinc-100">
        <div>
          <p className="text-[11px] text-zinc-400 font-mono">{invoice.number}</p>
          <p className="text-base font-semibold text-zinc-900 mt-0.5">{invoice.title}</p>
          {overdue && <p className="text-xs text-red-500 font-medium mt-1">⚠ Échéance dépassée</p>}
        </div>
        <StatusBadge status={invoice.status} />
      </div>

      <div>
        <DetailRow label="Client" value={accountName ?? contactName} />
        <DetailRow label="Date d'émission" value={invoice.issueDate ? new Date(invoice.issueDate).toLocaleDateString("fr-FR") : undefined} />
        <DetailRow label="Échéance" value={invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("fr-FR") : undefined} />
        {invoice.paidDate && <DetailRow label="Payée le" value={new Date(invoice.paidDate).toLocaleDateString("fr-FR")} />}
        {invoice.quoteId && <DetailRow label="Devis source" value="Convertie depuis devis" />}
        <DetailRow label="Propriétaire" value={invoice.owner?.name} />
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-medium mb-3">Prestations</p>
        <LineItemEditor items={invoice.lineItems} onChange={() => {}} readOnly />
      </div>

      {/* Payment summary */}
      {invoice.status === "partial" && (
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-600">Total TTC</span>
            <span className="font-semibold">{fmt(invoice.grandTotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-emerald-600">Payé</span>
            <span className="font-semibold text-emerald-600">{fmt(invoice.paidAmount)}</span>
          </div>
          <div className="flex justify-between text-sm border-t border-violet-200 pt-1">
            <span className="text-red-600 font-medium">Reste dû</span>
            <span className="font-bold text-red-600">{fmt(remaining)}</span>
          </div>
        </div>
      )}

      {invoice.paymentInfo && <DetailRow label="Coordonnées bancaires" value={invoice.paymentInfo} />}
      {invoice.notes && <DetailRow label="Notes" value={invoice.notes} />}
      {invoice.terms && <DetailRow label="Conditions" value={invoice.terms} />}

      {error && <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      {TRANSITIONS[invoice.status]?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {TRANSITIONS[invoice.status].map((t) => {
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
        <button onClick={handleDownload} disabled={dlLoading}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors disabled:opacity-60">
          {dlLoading ? <span className="w-3.5 h-3.5 border-2 border-zinc-400 border-t-zinc-700 rounded-full animate-spin" /> : <Download className="w-3.5 h-3.5" strokeWidth={1.75} />}
          Télécharger PDF
        </button>
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Invoices() {
  const { token } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [editing, setEditing]   = useState<Invoice | null | "new">(null);
  const [deleting, setDeleting] = useState<Invoice | null>(null);
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
    listInvoices(token, { search, page, limit: LIMIT, status: statusFilter || undefined })
      .then((r) => { setInvoices(r.invoices); setTotal(r.total); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token, search, page, statusFilter]);

  const handleSaved = (inv: Invoice) => {
    setInvoices((prev) => {
      const idx = prev.findIndex((x) => x._id === inv._id);
      if (idx >= 0) return prev.map((x) => (x._id === inv._id ? inv : x));
      setTotal((n) => n + 1);
      return [inv, ...prev];
    });
    setEditing(null);
    setSelected(inv);
  };

  const handleDelete = async () => {
    if (!token || !deleting) return;
    setDeleteLoading(true);
    try {
      await deleteInvoice(token, deleting._id);
      setInvoices((prev) => prev.filter((x) => x._id !== deleting._id));
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
          <h1 className="text-lg font-semibold text-zinc-900">Factures</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{total} facture{total !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={() => setEditing("new")}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus className="w-4 h-4" strokeWidth={1.75} /> Nouvelle facture
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px]"><SearchBar value={search} onChange={setSearch} placeholder="Rechercher une facture…" /></div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors">
          <option value="">Tous les statuts</option>
          {(["draft","sent","unpaid","partial","paid","cancelled"] as InvoiceStatus[]).map((s) =>
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
      </div>

      {error && <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20"><span className="w-6 h-6 border-2 border-zinc-300 border-t-blue-500 rounded-full animate-spin" /></div>
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Receipt className="w-10 h-10 text-zinc-300" strokeWidth={1.25} />
            <p className="text-sm text-zinc-400">Aucune facture.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100">
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-widest text-zinc-400 font-medium">Référence</th>
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-widest text-zinc-400 font-medium hidden md:table-cell">Client</th>
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-widest text-zinc-400 font-medium">Statut</th>
                <th className="px-5 py-3 text-right text-[10px] uppercase tracking-widest text-zinc-400 font-medium hidden lg:table-cell">Total TTC</th>
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-widest text-zinc-400 font-medium hidden lg:table-cell">Échéance</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {invoices.map((inv) => {
                const overdue = isOverdue(inv);
                const accountName = (inv.account as { name: string } | null | undefined)?.name;
                const contactName = inv.contact
                  ? `${(inv.contact as { firstName: string; lastName: string }).firstName} ${(inv.contact as { firstName: string; lastName: string }).lastName}`
                  : null;
                return (
                  <tr key={inv._id} onClick={() => setSelected(inv)} className={`hover:bg-zinc-50 cursor-pointer transition-colors ${overdue ? "bg-red-50/30" : ""}`}>
                    <td className="px-5 py-3.5">
                      <p className="font-mono text-xs text-zinc-400">{inv.number}</p>
                      <p className="font-medium text-zinc-800 truncate max-w-[200px]">{inv.title}</p>
                    </td>
                    <td className="px-5 py-3.5 text-zinc-500 hidden md:table-cell">{accountName ?? contactName ?? "—"}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <StatusBadge status={inv.status} />
                        {overdue && <span className="text-[10px] text-red-500 font-medium">Retard</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold text-zinc-700 hidden lg:table-cell">{fmt(inv.grandTotal)}</td>
                    <td className={`px-5 py-3.5 hidden lg:table-cell ${overdue ? "text-red-500 font-medium" : "text-zinc-500"}`}>
                      {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("fr-FR") : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => setEditing(inv)} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors"><Pencil className="w-3.5 h-3.5" strokeWidth={1.75} /></button>
                      <button onClick={() => setDeleting(inv)} className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors ml-1"><Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} /></button>
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
          <InvoiceDetail
            invoice={selected} token={token}
            onEdit={() => setEditing(selected)}
            onDelete={() => { setDeleting(selected); setSelected(null); }}
            onUpdated={(inv) => { setInvoices((prev) => prev.map((x) => (x._id === inv._id ? inv : x))); setSelected(inv); }}
          />
        )}
      </SlideOver>

      <SlideOver open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "Nouvelle facture" : "Modifier la facture"} width="w-[600px]">
        {editing !== null && (
          <InvoiceForm initial={editing === "new" ? null : editing} accounts={accounts} contacts={contacts} token={token!} onSave={handleSaved} onCancel={() => setEditing(null)} />
        )}
      </SlideOver>

      {deleting && <ConfirmDelete name={`${deleting.number} – ${deleting.title}`} onConfirm={handleDelete} onCancel={() => setDeleting(null)} loading={deleteLoading} />}
    </div>
  );
}
