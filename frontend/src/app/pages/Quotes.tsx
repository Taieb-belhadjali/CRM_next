import { useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, FileText, Download, ArrowRightCircle, Send, CheckCircle, XCircle } from "lucide-react";
import {
  listQuotes, createQuote, updateQuote, deleteQuote, convertQuote, downloadPdf,
  listAccounts, listContacts,
  type Quote, type QuotePayload, type QuoteStatus, type LineItem,
  type Account, type Contact,
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

const STATUS_STYLES: Record<QuoteStatus, string> = {
  draft:    "bg-zinc-100 text-zinc-600 border-zinc-200",
  sent:     "bg-blue-50 text-blue-700 border-blue-200",
  accepted: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-600 border-red-200",
};

function StatusBadge({ status }: { status: QuoteStatus }) {
  const { t } = useLanguage();
  return (
    <span className={`inline-flex text-[11px] font-medium px-2 py-0.5 rounded-full border ${STATUS_STYLES[status]}`}>
      {t("status." + status)}
    </span>
  );
}

function fmt(n: number) {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

const TRANSITIONS: Record<QuoteStatus, { labelKey: string; next: QuoteStatus; icon: React.ElementType; cls: string }[]> = {
  draft:    [{ labelKey: "quotes.statusMarkSent",     next: "sent",     icon: Send,        cls: "bg-blue-50 text-blue-600 hover:bg-blue-100" }],
  sent:     [{ labelKey: "quotes.statusMarkAccepted",  next: "accepted", icon: CheckCircle, cls: "bg-emerald-50 text-emerald-600 hover:bg-emerald-100" },
             { labelKey: "quotes.statusMarkRejected",  next: "rejected", icon: XCircle,     cls: "bg-red-50 text-red-600 hover:bg-red-100" }],
  accepted: [],
  rejected: [{ labelKey: "quotes.statusResetDraft",    next: "draft",    icon: Pencil,      cls: "bg-zinc-100 text-zinc-600 hover:bg-zinc-200" }],
};

function QuoteForm({ initial, accounts, contacts, onSave, onCancel, token }: {
  initial?: Quote | null; accounts: Account[]; contacts: Contact[];
  onSave: (q: Quote) => void; onCancel: () => void; token: string;
}) {
  const { t } = useLanguage();
  const [form, setForm] = useState<QuotePayload>({
    title:      initial?.title      ?? "",
    status:     initial?.status     ?? "draft",
    issueDate:  initial?.issueDate  ? initial.issueDate.slice(0, 10)  : new Date().toISOString().slice(0, 10),
    validUntil: initial?.validUntil ? initial.validUntil.slice(0, 10) : "",
    account:    (initial?.account  as { _id: string } | null | undefined)?._id ?? "",
    contact:    (initial?.contact  as { _id: string } | null | undefined)?._id ?? "",
    lineItems:  initial?.lineItems ?? [],
    notes:      initial?.notes  ?? "",
    terms:      initial?.terms  ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const set = (k: keyof QuotePayload) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title?.trim()) { setError(t("errors.titleRequired")); return; }
    setError(""); setLoading(true);
    try {
      const payload = { ...form, account: form.account || null, contact: form.contact || null };
      const res = initial ? await updateQuote(token, initial._id, payload) : await createQuote(token, payload);
      onSave(res.quote);
    } catch (err) { setError(err instanceof Error ? err.message : t("errors.saveFailed")); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <FormField label={t("forms.title")} required>
        <input className={inputCls} value={form.title} onChange={set("title")} placeholder={t("quotes.quotePlaceholder")} />
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField label={t("forms.issueDate")}>
          <input className={inputCls} type="date" value={form.issueDate ?? ""} onChange={set("issueDate")} />
        </FormField>
        <FormField label={t("forms.validUntil")}>
          <input className={inputCls} type="date" value={form.validUntil ?? ""} onChange={set("validUntil")} />
        </FormField>
      </div>
      <FormField label={t("forms.account")}>
        <select className={selectCls} value={form.account ?? ""} onChange={set("account")}>
          <option value="">— {t("forms.account")} —</option>
          {accounts.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
        </select>
      </FormField>
      <FormField label={t("forms.contact")}>
        <select className={selectCls} value={form.contact ?? ""} onChange={set("contact")}>
          <option value="">— {t("forms.contact")} —</option>
          {contacts.map((c) => <option key={c._id} value={c._id}>{c.firstName} {c.lastName}</option>)}
        </select>
      </FormField>

      <div>
        <p className="text-xs font-medium text-zinc-700 mb-2">{t("forms.lineItems")}</p>
        <LineItemEditor items={form.lineItems ?? []} onChange={(li: LineItem[]) => setForm((p) => ({ ...p, lineItems: li }))} />
      </div>

      <FormField label={t("forms.notes")}>
        <textarea className={inputCls} rows={2} value={form.notes ?? ""} onChange={set("notes")} placeholder={t("quotes.notesPlaceholder")} />
      </FormField>
      <FormField label={t("forms.terms")}>
        <textarea className={inputCls} rows={2} value={form.terms ?? ""} onChange={set("terms")} placeholder={t("quotes.termsPlaceholder")} />
      </FormField>

      {error && <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 py-2.5 text-sm font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors">{t("common.cancel")}</button>
        <button type="submit" disabled={loading} className="flex-1 flex items-center justify-center py-2.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-60 rounded-lg transition-colors">
          {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : initial ? t("common.save") : t("quotes.createQuote")}
        </button>
      </div>
    </form>
  );
}

function ConvertModal({ quote, token, onDone, onCancel }: {
  quote: Quote; token: string; onDone: (q: Quote) => void; onCancel: () => void;
}) {
  const { t } = useLanguage();
  const [dueDate, setDueDate]       = useState("");
  const [paymentInfo, setPaymentInfo] = useState("");
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");

  const handle = async () => {
    setError(""); setLoading(true);
    try {
      const res = await convertQuote(token, quote._id, { dueDate: dueDate || undefined, paymentInfo: paymentInfo || undefined });
      onDone(res.quote);
    } catch (err) { setError(err instanceof Error ? err.message : t("errors.conversionFailed")); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6 space-y-4">
        <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center">
          <ArrowRightCircle className="w-5 h-5 text-emerald-500" strokeWidth={1.75} />
        </div>
        <div>
          <h3 className="text-base font-semibold text-zinc-900">{t("quotes.convertToInvoice")}</h3>
          <p className="text-sm text-zinc-500 mt-1">{t("quotes.convertDescription", { number: quote.number })}</p>
        </div>
        <FormField label={t("forms.dueDate")}>
          <input className={inputCls} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </FormField>
        <FormField label={t("forms.paymentInfo")}>
          <textarea className={inputCls} rows={2} value={paymentInfo} onChange={(e) => setPaymentInfo(e.target.value)} placeholder={t("quotes.paymentPlaceholder")} />
        </FormField>
        {error && <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 text-sm font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors">{t("common.cancel")}</button>
          <button onClick={handle} disabled={loading} className="flex-1 flex items-center justify-center py-2.5 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 rounded-lg transition-colors">
            {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : t("quotes.convert")}
          </button>
        </div>
      </div>
    </div>
  );
}

function QuoteDetail({ quote, token, onEdit, onDelete, onUpdated, onConvert }: {
  quote: Quote; token: string;
  onEdit: () => void; onDelete: () => void;
  onUpdated: (q: Quote) => void; onConvert: () => void;
}) {
  const { t } = useLanguage();
  const [dlLoading, setDlLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDownload = async () => {
    setDlLoading(true);
    try {
      const blob = await downloadPdf(token, "quote", quote._id);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${quote.number}.pdf`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) { setError(t("errors.downloadFailed")); }
    finally { setDlLoading(false); }
  };

  const handleStatus = async (next: QuoteStatus) => {
    setStatusLoading(true); setError("");
    try {
      const res = await updateQuote(token, quote._id, { status: next });
      onUpdated(res.quote);
    } catch (e) { setError(t("errors.statusUpdateFailed")); }
    finally { setStatusLoading(false); }
  };

  const accountName = (quote.account as { name: string } | null | undefined)?.name;
  const contactName = quote.contact
    ? `${(quote.contact as { firstName: string; lastName: string }).firstName} ${(quote.contact as { firstName: string; lastName: string }).lastName}`
    : null;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between pb-4 border-b border-zinc-100">
        <div>
          <p className="text-[11px] text-zinc-400 font-mono">{quote.number}</p>
          <p className="text-base font-semibold text-zinc-900 mt-0.5">{quote.title}</p>
        </div>
        <StatusBadge status={quote.status} />
      </div>
      <div>
        <DetailRow label={t("forms.client")} value={accountName ?? contactName} />
        <DetailRow label={t("forms.issueDate")} value={quote.issueDate ? new Date(quote.issueDate).toLocaleDateString("fr-FR") : undefined} />
        <DetailRow label={t("forms.validUntil")} value={quote.validUntil ? new Date(quote.validUntil).toLocaleDateString("fr-FR") : undefined} />
        <DetailRow label={t("forms.deal")} value={(quote.deal as { title: string } | null | undefined)?.title} />
        <DetailRow label={t("forms.owner")} value={quote.owner?.name} />
        {quote.invoiceId && <DetailRow label={t("quotes.linkedInvoice")} value={t("quotes.converted")} />}
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-medium mb-3">{t("forms.lineItems")}</p>
        <LineItemEditor items={quote.lineItems} onChange={() => {}} readOnly />
      </div>
      {quote.notes && <DetailRow label={t("forms.notes")} value={quote.notes} />}
      {quote.terms && <DetailRow label={t("forms.terms")} value={quote.terms} />}
      {error && <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      {TRANSITIONS[quote.status]?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {TRANSITIONS[quote.status].map((tr) => {
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
        <button onClick={handleDownload} disabled={dlLoading}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors disabled:opacity-60">
          {dlLoading ? <span className="w-3.5 h-3.5 border-2 border-zinc-400 border-t-zinc-700 rounded-full animate-spin" /> : <Download className="w-3.5 h-3.5" strokeWidth={1.75} />}
          {t("quotes.downloadPdf")}
        </button>
        {!quote.invoiceId && quote.status !== "rejected" && (
          <button onClick={onConvert}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors">
            <ArrowRightCircle className="w-3.5 h-3.5" strokeWidth={1.75} /> {t("quotes.convertToInvoice")}
          </button>
        )}
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

export default function Quotes() {
  const { token } = useAuth();
  const { t } = useLanguage();
  const [quotes, setQuotes]   = useState<Quote[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [selected, setSelected]   = useState<Quote | null>(null);
  const [editing, setEditing]     = useState<Quote | null | "new">(null);
  const [deleting, setDeleting]   = useState<Quote | null>(null);
  const [converting, setConverting] = useState<Quote | null>(null);
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
    listQuotes(token, { search, page, limit: LIMIT, status: statusFilter || undefined })
      .then((r) => { setQuotes(r.quotes); setTotal(r.total); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token, search, page, statusFilter]);

  const handleSaved = (q: Quote) => {
    setQuotes((prev) => {
      const idx = prev.findIndex((x) => x._id === q._id);
      if (idx >= 0) return prev.map((x) => (x._id === q._id ? q : x));
      setTotal((n) => n + 1);
      return [q, ...prev];
    });
    setEditing(null);
    setSelected(q);
  };

  const handleDelete = async () => {
    if (!token || !deleting) return;
    setDeleteLoading(true);
    try {
      await deleteQuote(token, deleting._id);
      setQuotes((prev) => prev.filter((x) => x._id !== deleting._id));
      setTotal((n) => n - 1);
      if (selected?._id === deleting._id) setSelected(null);
      setDeleting(null);
    } catch (e) { setError(err instanceof Error ? err.message : t("errors.deleteFailed")); }
    finally { setDeleteLoading(false); }
  };

  const handleConvertDone = (q: Quote) => {
    setQuotes((prev) => prev.map((x) => (x._id === q._id ? q : x)));
    setConverting(null);
    setSelected(q);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">{t("pages.quotes.title")}</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{total} {t("pages.quotes.countLabel")}</p>
        </div>
        <button onClick={() => setEditing("new")}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus className="w-4 h-4" strokeWidth={1.75} /> {t("pages.quotes.newQuote")}
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px]"><SearchBar value={search} onChange={setSearch} placeholder={t("pages.quotes.searchPlaceholder")} /></div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors">
          <option value="">{t("quotes.allStatuses")}</option>
          {(["draft","sent","accepted","rejected"] as QuoteStatus[]).map((s) =>
            <option key={s} value={s}>{t("status." + s)}</option>)}
        </select>
      </div>

      {error && <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20"><span className="w-6 h-6 border-2 border-zinc-300 border-t-blue-500 rounded-full animate-spin" /></div>
        ) : quotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <FileText className="w-10 h-10 text-zinc-300" strokeWidth={1.25} />
            <p className="text-sm text-zinc-400">{t("pages.quotes.noQuotes")}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100">
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-widest text-zinc-400 font-medium">{t("quotes.reference")}</th>
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-widest text-zinc-400 font-medium hidden md:table-cell">{t("forms.client")}</th>
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-widest text-zinc-400 font-medium">{t("forms.status")}</th>
                <th className="px-5 py-3 text-right text-[10px] uppercase tracking-widest text-zinc-400 font-medium hidden lg:table-cell">{t("quotes.totalIncTax")}</th>
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-widest text-zinc-400 font-medium hidden lg:table-cell">{t("forms.issueDate")}</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {quotes.map((q) => {
                const accountName = (q.account as { name: string } | null | undefined)?.name;
                const contactName = q.contact
                  ? `${(q.contact as { firstName: string; lastName: string }).firstName} ${(q.contact as { firstName: string; lastName: string }).lastName}`
                  : null;
                return (
                  <tr key={q._id} onClick={() => setSelected(q)} className="hover:bg-zinc-50 cursor-pointer transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-mono text-xs text-zinc-400">{q.number}</p>
                      <p className="font-medium text-zinc-800 truncate max-w-[200px]">{q.title}</p>
                    </td>
                    <td className="px-5 py-3.5 text-zinc-500 hidden md:table-cell">{accountName ?? contactName ?? "—"}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={q.status} /></td>
                    <td className="px-5 py-3.5 text-right font-semibold text-zinc-700 hidden lg:table-cell">{fmt(q.grandTotal)}</td>
                    <td className="px-5 py-3.5 text-zinc-500 hidden lg:table-cell">{q.issueDate ? new Date(q.issueDate).toLocaleDateString("fr-FR") : "—"}</td>
                    <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => setEditing(q)} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors"><Pencil className="w-3.5 h-3.5" strokeWidth={1.75} /></button>
                      <button onClick={() => setDeleting(q)} className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors ml-1"><Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} /></button>
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
          <QuoteDetail
            quote={selected} token={token}
            onEdit={() => setEditing(selected)}
            onDelete={() => { setDeleting(selected); setSelected(null); }}
            onUpdated={(q) => { setQuotes((prev) => prev.map((x) => (x._id === q._id ? q : x))); setSelected(q); }}
            onConvert={() => setConverting(selected)}
          />
        )}
      </SlideOver>

      <SlideOver open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? t("quotes.createQuote") : t("quotes.editQuote")} width="w-[600px]">
        {editing !== null && (
          <QuoteForm initial={editing === "new" ? null : editing} accounts={accounts} contacts={contacts} token={token!} onSave={handleSaved} onCancel={() => setEditing(null)} />
        )}
      </SlideOver>

      {deleting && <ConfirmDelete name={`${deleting.number} – ${deleting.title}`} onConfirm={handleDelete} onCancel={() => setDeleting(null)} loading={deleteLoading} />}
      {converting && token && <ConvertModal quote={converting} token={token} onDone={handleConvertDone} onCancel={() => setConverting(null)} />}
    </div>
  );
}
