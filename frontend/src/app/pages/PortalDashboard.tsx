import { useEffect, useState } from "react";
import { Handshake, FileText, Receipt, Ticket, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router";
import { useAuth } from "../hooks/useAuth";
import { useLanguage } from "../context/LanguageContext";
import { listDeals, listQuotes, listInvoices, listTickets } from "../api";

export default function PortalDashboard() {
  const { token } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ deals: 0, quotes: 0, invoices: 0, tickets: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    Promise.all([
      listDeals(token).catch(() => ({ deals: [] })),
      listQuotes(token).catch(() => ({ quotes: [] })),
      listInvoices(token).catch(() => ({ invoices: [] })),
      listTickets(token).catch(() => ({ tickets: [] })),
    ]).then(([deals, quotes, invoices, tickets]) => {
      setStats({
        deals: deals.deals?.length || 0,
        quotes: quotes.quotes?.length || 0,
        invoices: invoices.invoices?.length || 0,
        tickets: tickets.tickets?.length || 0,
      });
      setLoading(false);
    });
  }, [token]);

  const cards = [
    { key: "deals", labelKey: "portal.deals", icon: Handshake, to: "/portal/deals", count: stats.deals, color: "bg-blue-50 text-blue-600 border-blue-100" },
    { key: "quotes", labelKey: "portal.quotes", icon: FileText, to: "/portal/quotes", count: stats.quotes, color: "bg-violet-50 text-violet-600 border-violet-100" },
    { key: "invoices", labelKey: "portal.invoices", icon: Receipt, to: "/portal/invoices", count: stats.invoices, color: "bg-emerald-50 text-emerald-600 border-emerald-100" },
    { key: "tickets", labelKey: "portal.tickets", icon: Ticket, to: "/portal/tickets", count: stats.tickets, color: "bg-amber-50 text-amber-600 border-amber-100" },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">{t("portal.dashboard")}</h1>
        <p className="text-sm text-zinc-500 mt-1">Welcome to your client portal</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="w-6 h-6 border-2 border-zinc-300 border-t-blue-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((card) => (
            <button
              key={card.key}
              onClick={() => navigate(card.to)}
              className={`flex items-center gap-4 p-5 rounded-xl border text-left transition-colors hover:shadow-md ${card.color}`}
            >
              <div className="w-10 h-10 rounded-lg bg-white/60 flex items-center justify-center flex-shrink-0">
                <card.icon className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium opacity-80">{t(card.labelKey)}</p>
                <p className="text-2xl font-bold mt-0.5">{card.count}</p>
              </div>
              <ArrowRight className="w-4 h-4 ml-auto opacity-60 flex-shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
