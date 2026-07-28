import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useLanguage } from "../context/LanguageContext";
import { listInvoices, type Invoice } from "../api";

export default function PortalInvoices() {
  const { token } = useAuth();
  const { t } = useLanguage();
  const [items, setItems] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    listInvoices(token)
      .then((r) => { setItems(r.invoices || []); setLoading(false); })
      .catch((e) => { setError(e instanceof Error ? e.message : "Failed to load invoices"); setLoading(false); });
  }, [token]);

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-zinc-900">{t("portal.invoices")}</h1>
      {error && <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="w-6 h-6 border-2 border-zinc-300 border-t-blue-500 rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-zinc-400 text-sm">No invoices found</div>
      ) : (
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100">
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-widest text-zinc-400 font-medium">Invoice</th>
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-widest text-zinc-400 font-medium">Status</th>
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-widest text-zinc-400 font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {items.map((inv) => (
                <tr key={inv._id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-zinc-800">{inv.title}</td>
                  <td className="px-5 py-3.5 text-zinc-500 capitalize">{inv.status}</td>
                  <td className="px-5 py-3.5 text-zinc-700 font-semibold">€{inv.grandTotal?.toLocaleString?.() || inv.grandTotal || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
