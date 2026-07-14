import { useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, Upload, Download, UserPlus, Map, List, ArrowRightCircle, X, Tag } from "lucide-react";
import Papa from "papaparse";
import {
  listProspects, createProspect, updateProspect, deleteProspect, convertProspect,
  importProspects, exportProspectsUrl, listAccounts,
  type Prospect, type ProspectPayload, type ProspectStatus,
} from "../api";
import { useAuth } from "../hooks/useAuth";
import { SlideOver } from "../components/shared/SlideOver";
import { ConfirmDelete } from "../components/shared/ConfirmDelete";
import { Pagination } from "../components/shared/Pagination";
import { SearchBar } from "../components/shared/SearchBar";
import { DetailRow } from "../components/shared/DetailRow";
import { StatusBadge } from "../components/shared/StatusBadge";
import { FormField, inputCls, selectCls } from "../components/shared/FormField";
import ProspectsMap from "./ProspectsMap";

const LIMIT = 25;
const STATUS_OPTIONS: ProspectStatus[] = ["new", "contacted", "qualified", "converted", "unqualified"];
const PRESET_TAGS = ["VIP", "chaud", "froid", "indesirable", "desabonne"];

// ── Tag input ─────────────────────────────────────────────────────────────────

function TagInput({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [input, setInput] = useState("");
  const add = () => {
    const v = input.trim();
    if (v && !tags.includes(v)) onChange([...tags, v]);
    setInput("");
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5">
            {t}
            <button type="button" onClick={() => onChange(tags.filter((x) => x !== t))} className="hover:text-red-500 transition-colors"><X className="w-3 h-3" /></button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className={`${inputCls} flex-1`} value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="Add tag…"
        />
        <button type="button" onClick={add} className="px-3 py-2 text-sm bg-zinc-100 hover:bg-zinc-200 rounded-lg text-zinc-600 transition-colors">Add</button>
      </div>
      <div className="flex flex-wrap gap-1">
        {PRESET_TAGS.filter((t) => !tags.includes(t)).map((t) => (
          <button type="button" key={t} onClick={() => onChange([...tags, t])}
            className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 transition-colors flex items-center gap-1">
            <Tag className="w-3 h-3" /> {t}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Form ──────────────────────────────────────────────────────────────────────

interface FormProps { initial?: Prospect | null; onSave: (p: Prospect) => void; onCancel: () => void; token: string; }

function ProspectForm({ initial, onSave, onCancel, token }: FormProps) {
  const [form, setForm] = useState<ProspectPayload>({
    firstName: initial?.firstName ?? "", lastName: initial?.lastName ?? "",
    company: initial?.company ?? "", jobTitle: initial?.jobTitle ?? "",
    email: initial?.email ?? "", phone: initial?.phone ?? "",
    address: initial?.address ?? "", status: initial?.status ?? "new",
    tags: initial?.tags ?? [], source: initial?.source ?? "manual",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const set = (k: keyof ProspectPayload) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName?.trim() || !form.lastName?.trim()) { setError("First and last name are required."); return; }
    setError(""); setLoading(true);
    try {
      const res = initial ? await updateProspect(token, initial._id, form) : await createProspect(token, form);
      onSave(res.prospect);
    } catch (err) { setError(err instanceof Error ? err.message : "Something went wrong."); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="First name" required><input className={inputCls} value={form.firstName} onChange={set("firstName")} placeholder="Thomas" /></FormField>
        <FormField label="Last name" required><input className={inputCls} value={form.lastName} onChange={set("lastName")} placeholder="Huber" /></FormField>
      </div>
      <FormField label="Company"><input className={inputCls} value={form.company ?? ""} onChange={set("company")} placeholder="Acme Corp" /></FormField>
      <FormField label="Job title"><input className={inputCls} value={form.jobTitle ?? ""} onChange={set("jobTitle")} placeholder="CTO" /></FormField>
      <FormField label="Email"><input className={inputCls} type="email" value={form.email ?? ""} onChange={set("email")} placeholder="thomas@acme.com" /></FormField>
      <FormField label="Phone"><input className={inputCls} value={form.phone ?? ""} onChange={set("phone")} placeholder="+33 6 00 00 00 00" /></FormField>
      <FormField label="Address"><input className={inputCls} value={form.address ?? ""} onChange={set("address")} placeholder="Berlin, Germany" /></FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Status">
          <select className={selectCls} value={form.status} onChange={set("status")}>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </FormField>
        <FormField label="Source">
          <select className={selectCls} value={form.source ?? "manual"} onChange={set("source")}>
            <option value="manual">Manual</option>
            <option value="import">Import</option>
            <option value="web_form">Web form</option>
          </select>
        </FormField>
      </div>
      <FormField label="Tags"><TagInput tags={form.tags ?? []} onChange={(t) => setForm((p) => ({ ...p, tags: t }))} /></FormField>
      {error && <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 py-2.5 text-sm font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors">Cancel</button>
        <button type="submit" disabled={loading} className="flex-1 flex items-center justify-center py-2.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-60 rounded-lg transition-colors">
          {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : initial ? "Save changes" : "Create prospect"}
        </button>
      </div>
    </form>
  );
}

// ── Convert modal ─────────────────────────────────────────────────────────────

function ConvertModal({ prospect, token, onDone, onCancel }: { prospect: Prospect; token: string; onDone: (p: Prospect) => void; onCancel: () => void; }) {
  const [createAcc, setCreateAcc] = useState(!!prospect.company);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleConvert = async () => {
    setError(""); setLoading(true);
    try {
      const res = await convertProspect(token, prospect._id, createAcc);
      onDone(res.prospect);
    } catch (err) { setError(err instanceof Error ? err.message : "Conversion failed."); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
        <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
          <ArrowRightCircle className="w-5 h-5 text-emerald-500" strokeWidth={1.75} />
        </div>
        <h3 className="text-base font-semibold text-zinc-900">Convert to contact?</h3>
        <p className="text-sm text-zinc-500 mt-1.5">
          <span className="font-medium text-zinc-700">{prospect.firstName} {prospect.lastName}</span> will be created as a contact and marked as converted.
        </p>
        {prospect.company && (
          <label className="flex items-center gap-2 mt-4 cursor-pointer">
            <input type="checkbox" checked={createAcc} onChange={(e) => setCreateAcc(e.target.checked)} className="rounded border-zinc-300 text-blue-500 focus:ring-blue-500" />
            <span className="text-sm text-zinc-700">Also create account <strong>{prospect.company}</strong></span>
          </label>
        )}
        {error && <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-3">{error}</p>}
        <div className="flex gap-3 mt-5">
          <button onClick={onCancel} className="flex-1 py-2.5 text-sm font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors">Cancel</button>
          <button onClick={handleConvert} disabled={loading} className="flex-1 flex items-center justify-center py-2.5 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 rounded-lg transition-colors">
            {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Convert"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Detail panel ──────────────────────────────────────────────────────────────

function ProspectDetail({ prospect, onEdit, onDelete, onConvert }: { prospect: Prospect; onEdit: () => void; onDelete: () => void; onConvert: () => void; }) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between pb-4 border-b border-zinc-100">
        <div>
          <p className="text-base font-semibold text-zinc-900">{prospect.firstName} {prospect.lastName}</p>
          {prospect.jobTitle && <p className="text-xs text-zinc-500">{prospect.jobTitle}{prospect.company ? ` · ${prospect.company}` : ""}</p>}
        </div>
        <StatusBadge status={prospect.status} />
      </div>
      <div>
        <DetailRow label="Email" value={prospect.email} />
        <DetailRow label="Phone" value={prospect.phone} />
        <DetailRow label="Address" value={prospect.address} />
        <DetailRow label="Source" value={prospect.source} />
        <DetailRow label="Owner" value={prospect.owner?.name} />
        <DetailRow label="Added" value={new Date(prospect.createdAt).toLocaleDateString()} />
      </div>
      {prospect.tags.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-medium mb-2">Tags</p>
          <div className="flex flex-wrap gap-1.5">
            {prospect.tags.map((t) => (
              <span key={t} className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5">{t}</span>
            ))}
          </div>
        </div>
      )}
      <div className="flex gap-2 pt-2 flex-wrap">
        <button onClick={onEdit} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors">
          <Pencil className="w-3.5 h-3.5" strokeWidth={1.75} /> Edit
        </button>
        {prospect.status !== "converted" && (
          <button onClick={onConvert} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors">
            <ArrowRightCircle className="w-3.5 h-3.5" strokeWidth={1.75} /> Convert
          </button>
        )}
        <button onClick={onDelete} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
          <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} /> Delete
        </button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Prospects() {
  const { token } = useAuth();
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [importMsg, setImportMsg] = useState("");

  const [selected, setSelected] = useState<Prospect | null>(null);
  const [editing, setEditing] = useState<Prospect | null | "new">(null);
  const [deleting, setDeleting] = useState<Prospect | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [converting, setConverting] = useState<Prospect | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setPage(1); }, [search, statusFilter, tagFilter]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    listProspects(token, { search, page, limit: LIMIT, status: statusFilter || undefined, tag: tagFilter || undefined })
      .then((r) => { setProspects(r.prospects); setTotal(r.total); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token, search, page, statusFilter, tagFilter]);

  const handleSaved = (p: Prospect) => {
    setProspects((prev) => {
      const idx = prev.findIndex((x) => x._id === p._id);
      if (idx >= 0) return prev.map((x) => (x._id === p._id ? p : x));
      setTotal((t) => t + 1);
      return [p, ...prev];
    });
    setEditing(null);
    setSelected(p);
  };

  const handleDelete = async () => {
    if (!token || !deleting) return;
    setDeleteLoading(true);
    try {
      await deleteProspect(token, deleting._id);
      setProspects((prev) => prev.filter((x) => x._id !== deleting._id));
      setTotal((t) => t - 1);
      if (selected?._id === deleting._id) setSelected(null);
      setDeleting(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Delete failed."); }
    finally { setDeleteLoading(false); }
  };

  const handleConvertDone = (p: Prospect) => {
    setProspects((prev) => prev.map((x) => (x._id === p._id ? p : x)));
    setConverting(null);
    setSelected(p);
  };

  // ── CSV import ────────────────────────────────────────────────────────────

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data as Record<string, string>[];
          const res = await importProspects(token, rows);
          setImportMsg(`Imported ${res.inserted} prospect${res.inserted !== 1 ? "s" : ""}${res.skipped ? ` (${res.skipped} skipped)` : ""}.`);
          // Refresh list
          const r = await listProspects(token, { search, page, limit: LIMIT, status: statusFilter || undefined, tag: tagFilter || undefined });
          setProspects(r.prospects); setTotal(r.total);
        } catch (err) { setError(err instanceof Error ? err.message : "Import failed."); }
        finally { if (fileRef.current) fileRef.current.value = ""; }
      },
    });
  };

  // ── CSV export ────────────────────────────────────────────────────────────

  const handleExport = () => {
    const url = exportProspectsUrl({ status: statusFilter || undefined, tag: tagFilter || undefined });
    // Fetch with auth header, create blob download
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `prospects-${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch(() => setError("Export failed."));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">Prospects</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{total} prospect{total !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center bg-zinc-100 rounded-lg p-0.5">
            <button onClick={() => setViewMode("list")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === "list" ? "bg-white text-zinc-800 shadow-sm" : "text-zinc-500 hover:text-zinc-700"}`}>
              <List className="w-3.5 h-3.5" strokeWidth={1.75} /> List
            </button>
            <button onClick={() => setViewMode("map")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === "map" ? "bg-white text-zinc-800 shadow-sm" : "text-zinc-500 hover:text-zinc-700"}`}>
              <Map className="w-3.5 h-3.5" strokeWidth={1.75} /> Map
            </button>
          </div>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
          <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-zinc-600 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-lg transition-colors">
            <Upload className="w-3.5 h-3.5" strokeWidth={1.75} /> Import
          </button>
          <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-zinc-600 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-lg transition-colors">
            <Download className="w-3.5 h-3.5" strokeWidth={1.75} /> Export
          </button>
          <button onClick={() => setEditing("new")} className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors">
            <Plus className="w-4 h-4" strokeWidth={1.75} /> New prospect
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px]"><SearchBar value={search} onChange={setSearch} placeholder="Search prospects…" /></div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors">
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} className="px-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors">
          <option value="">All tags</option>
          {PRESET_TAGS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {(error || importMsg) && (
        <div className="space-y-1">
          {error && <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          {importMsg && <p className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{importMsg}</p>}
        </div>
      )}

      {/* Map view */}
      {viewMode === "map" ? (
        <ProspectsMap prospects={prospects} onSelect={setSelected} />
      ) : (
        <>
          <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <span className="w-6 h-6 border-2 border-zinc-300 border-t-blue-500 rounded-full animate-spin" />
              </div>
            ) : prospects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <UserPlus className="w-10 h-10 text-zinc-300" strokeWidth={1.25} />
                <p className="text-sm text-zinc-400">{search || statusFilter || tagFilter ? "No prospects match your filters." : "No prospects yet."}</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100">
                    <th className="px-5 py-3 text-left text-[10px] uppercase tracking-widest text-zinc-400 font-medium">Name</th>
                    <th className="px-5 py-3 text-left text-[10px] uppercase tracking-widest text-zinc-400 font-medium hidden md:table-cell">Company</th>
                    <th className="px-5 py-3 text-left text-[10px] uppercase tracking-widest text-zinc-400 font-medium">Status</th>
                    <th className="px-5 py-3 text-left text-[10px] uppercase tracking-widest text-zinc-400 font-medium hidden lg:table-cell">Tags</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {prospects.map((p) => (
                    <tr key={p._id} onClick={() => setSelected(p)} className="hover:bg-zinc-50 cursor-pointer transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-zinc-800">{p.firstName} {p.lastName}</p>
                        {p.jobTitle && <p className="text-xs text-zinc-400">{p.jobTitle}</p>}
                      </td>
                      <td className="px-5 py-3.5 text-zinc-500 hidden md:table-cell">{p.company || "—"}</td>
                      <td className="px-5 py-3.5"><StatusBadge status={p.status} /></td>
                      <td className="px-5 py-3.5 hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {p.tags.slice(0, 3).map((t) => <span key={t} className="text-[10px] bg-zinc-100 text-zinc-500 rounded-full px-1.5 py-0.5">{t}</span>)}
                          {p.tags.length > 3 && <span className="text-[10px] text-zinc-400">+{p.tags.length - 3}</span>}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button onClick={(e) => { e.stopPropagation(); setEditing(p); }} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors">
                          <Pencil className="w-3.5 h-3.5" strokeWidth={1.75} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setDeleting(p); }} className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors ml-1">
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
        </>
      )}

      {/* Detail */}
      <SlideOver open={!!selected && !editing} onClose={() => setSelected(null)} title={selected ? `${selected.firstName} ${selected.lastName}` : ""} subtitle={selected?.company}>
        {selected && <ProspectDetail prospect={selected} onEdit={() => setEditing(selected)} onDelete={() => { setDeleting(selected); setSelected(null); }} onConvert={() => setConverting(selected)} />}
      </SlideOver>

      {/* Form */}
      <SlideOver open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "New prospect" : "Edit prospect"}>
        {editing !== null && <ProspectForm initial={editing === "new" ? null : editing} token={token!} onSave={handleSaved} onCancel={() => setEditing(null)} />}
      </SlideOver>

      {deleting && <ConfirmDelete name={`${deleting.firstName} ${deleting.lastName}`} onConfirm={handleDelete} onCancel={() => setDeleting(null)} loading={deleteLoading} />}
      {converting && <ConvertModal prospect={converting} token={token!} onDone={handleConvertDone} onCancel={() => setConverting(null)} />}
    </div>
  );
}
