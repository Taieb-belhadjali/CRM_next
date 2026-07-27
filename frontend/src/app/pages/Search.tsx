import { useEffect, useRef, useState } from "react";
import { Search, Clock, Trash2, ArrowRight, User, Building2, UserPlus, Handshake, Ticket } from "lucide-react";
import { searchGlobal, listSavedSearches, createSavedSearch, deleteSavedSearch, type SearchResult, type SavedSearch } from "../api";
import { useAuth } from "../hooks/useAuth";
import { SearchBar } from "../components/shared/SearchBar";
import { Pagination } from "../components/shared/Pagination";

const LIMIT = 20;

const TYPE_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  contact:  { label: "Contact",  icon: User,       color: "text-blue-500 bg-blue-50" },
  account:  { label: "Account",  icon: Building2,  color: "text-emerald-500 bg-emerald-50" },
  prospect: { label: "Prospect", icon: UserPlus,   color: "text-violet-500 bg-violet-50" },
  deal:     { label: "Deal",     icon: Handshake,  color: "text-amber-500 bg-amber-50" },
  ticket:   { label: "Ticket",   icon: Ticket,     color: "text-red-500 bg-red-50" },
};

const ROUTES: Record<string, string> = {
  contact: "/contacts",
  account: "/accounts",
  prospect: "/prospects",
  deal: "/deals",
  ticket: "/tickets",
};

export default function SearchPage() {
  const { token } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState<SavedSearch[]>([]);
  const [saving, setSaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!token) return;
    listSavedSearches(token).then((r) => setSaved(r.searches)).catch(() => {});
  }, [token]);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (!token || !query.trim()) { setResults([]); setTotal(0); return; }
      setLoading(true);
      searchGlobal(token, query.trim())
        .then((r) => { setResults(r.results); setTotal(r.results.length); })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 300);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [token, query]);

  const handleSave = async () => {
    if (!token || !query.trim()) return;
    setSaving(true);
    try {
      await createSavedSearch(token, query.trim());
      listSavedSearches(token).then((r) => setSaved(r.searches));
    } catch {}
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    try {
      await deleteSavedSearch(token, id);
      setSaved((prev) => prev.filter((s) => s._id !== id));
    } catch {}
  };

  const startIdx = (page - 1) * LIMIT;
  const pageResults = results.slice(startIdx, startIdx + LIMIT);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-zinc-900">Global Search</h1>

      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <SearchBar value={query} onChange={setQuery} placeholder="Search contacts, accounts, prospects, deals, tickets…" />
        </div>
      </div>

      {saved.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-zinc-500 mr-1">Saved:</span>
          {saved.map((s) => (
            <div key={s._id} className="flex items-center gap-1 bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5">
              <button onClick={() => setQuery(s.query)} className="flex items-center gap-1.5 text-xs text-zinc-700 hover:text-zinc-900">
                <Clock className="w-3 h-3 text-zinc-400" strokeWidth={1.75} />
                {s.query}
              </button>
              <button onClick={() => handleDelete(s._id)} className="text-zinc-400 hover:text-red-500 transition-colors">
                <Trash2 className="w-3 h-3" strokeWidth={1.75} />
              </button>
            </div>
          ))}
        </div>
      )}

      {query.trim() && !loading && results.length > 0 && (
        <div className="flex justify-end">
          <button onClick={handleSave} disabled={saving} className="text-xs text-blue-500 hover:text-blue-600 font-medium">
            {saving ? "Saving…" : "Save this search"}
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="w-6 h-6 border-2 border-zinc-300 border-t-blue-500 rounded-full animate-spin" />
        </div>
      ) : results.length === 0 && query ? (
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-10 text-center">
          <Search className="w-10 h-10 text-zinc-300 mx-auto" strokeWidth={1.25} />
          <p className="text-sm text-zinc-400 mt-3">No results found for "{query}".</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100">
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-widest text-zinc-400 font-medium">Type</th>
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-widest text-zinc-400 font-medium border-l border-zinc-100">Name / Title</th>
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-widest text-zinc-400 font-medium border-l border-zinc-100 hidden md:table-cell">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {pageResults.map((r) => {
                const meta = TYPE_META[r.type] || { label: r.type, icon: Search, color: "text-zinc-400 bg-zinc-50" };
                const Icon = meta.icon;
                const route = ROUTES[r.type];
                return (
                  <tr key={`${r.type}-${r._id}`} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full border ${meta.color}`}>
                        <Icon className="w-3 h-3" strokeWidth={1.75} />
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 border-l border-zinc-100">
                      {route ? (
                        <a href={route} className="text-sm font-medium text-zinc-800 hover:text-blue-600 transition-colors">
                          {r.title || r.name || `${r.firstName || ""} ${r.lastName || ""}`.trim() || r.subject || r._id}
                        </a>
                      ) : (
                        <span className="text-sm font-medium text-zinc-800">{r.title || r.name || r._id}</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-zinc-500 border-l border-zinc-100 hidden md:table-cell">
                      {r.email || r.company || r.sector || r.description || r.status || ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {total > LIMIT && (
            <div className="px-5 py-3 border-t border-zinc-100">
              <Pagination page={page} total={total} limit={LIMIT} onChange={setPage} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
