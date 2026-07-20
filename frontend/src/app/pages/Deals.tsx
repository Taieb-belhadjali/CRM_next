import { useEffect, useRef, useState } from "react";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  closestCorners, type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  Plus, Pencil, Trash2, Kanban, List, Handshake,
  GripVertical, Calendar,
} from "lucide-react";
import {
  listDeals, createDeal, updateDeal, deleteDeal, reorderDeals,
  listAccounts,
  type Deal, type DealPayload, type DealStage,
  type Account,
} from "../api";
import { useAuth } from "../hooks/useAuth";
import { SlideOver } from "../components/shared/SlideOver";
import { ConfirmDelete } from "../components/shared/ConfirmDelete";
import { SearchBar } from "../components/shared/SearchBar";
import { FormField, inputCls, selectCls } from "../components/shared/FormField";

// ── Stage config ──────────────────────────────────────────────────────────────

const STAGES: { key: DealStage; label: string; colour: string; dot: string }[] = [
  { key: "prospection",  label: "Prospection",  colour: "bg-blue-50 border-blue-200",    dot: "bg-blue-400" },
  { key: "proposition",  label: "Proposition",  colour: "bg-violet-50 border-violet-200", dot: "bg-violet-400" },
  { key: "negociation",  label: "Négociation",  colour: "bg-amber-50 border-amber-200",  dot: "bg-amber-400" },
  { key: "gagne",        label: "Gagné",        colour: "bg-emerald-50 border-emerald-200", dot: "bg-emerald-500" },
  { key: "perdu",        label: "Perdu",        colour: "bg-red-50 border-red-200",      dot: "bg-red-400" },
];

function fmt(v: number) {
  if (v >= 1_000_000) return `€${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `€${(v / 1_000).toFixed(0)}k`;
  return `€${v}`;
}

// ── Stage badge ───────────────────────────────────────────────────────────────

function StageBadge({ stage }: { stage: string }) {
  const s = STAGES.find((x) => x.key === stage);
  if (!s) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full border ${s.colour}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

// ── Form ──────────────────────────────────────────────────────────────────────

interface FormProps {
  initial?: Deal | null;
  accounts: Account[];
  onSave: (d: Deal) => void;
  onCancel: () => void;
  token: string;
}

function DealForm({ initial, accounts, onSave, onCancel, token }: FormProps) {
  const [form, setForm] = useState<DealPayload>({
    title: initial?.title ?? "",
    stage: initial?.stage ?? "prospection",
    value: initial?.value ?? 0,
    account: (initial?.account as { _id: string } | null | undefined)?._id ?? "",
    expectedCloseDate: initial?.expectedCloseDate ? initial.expectedCloseDate.slice(0, 10) : "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof DealPayload) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title?.trim()) { setError("Title is required."); return; }
    setError(""); setLoading(true);
    try {
      const payload = {
        ...form,
        value: Number(form.value) || 0,
        account: form.account || null,
        expectedCloseDate: form.expectedCloseDate || null,
      };
      const res = initial
        ? await updateDeal(token, initial._id, payload)
        : await createDeal(token, payload);
      onSave(res.deal);
    } catch (err) { setError(err instanceof Error ? err.message : "Something went wrong."); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Title" required>
        <input className={inputCls} value={form.title} onChange={set("title")} placeholder="Deal with Acme Corp" />
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Stage">
          <select className={selectCls} value={form.stage} onChange={set("stage")}>
            {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </FormField>
        <FormField label="Value (€)">
          <input className={inputCls} type="number" min={0} value={form.value ?? 0}
            onChange={(e) => setForm((p) => ({ ...p, value: Number(e.target.value) }))} />
        </FormField>
      </div>
      <FormField label="Account">
        <select className={selectCls} value={form.account ?? ""} onChange={set("account")}>
          <option value="">— No account —</option>
          {accounts.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
        </select>
      </FormField>
      <FormField label="Expected close date">
        <input className={inputCls} type="date" value={form.expectedCloseDate ?? ""} onChange={set("expectedCloseDate")} />
      </FormField>
      {error && <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 py-2.5 text-sm font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors">Cancel</button>
        <button type="submit" disabled={loading} className="flex-1 flex items-center justify-center py-2.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-60 rounded-lg transition-colors">
          {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : initial ? "Save changes" : "Create deal"}
        </button>
      </div>
    </form>
  );
}

// ── Sortable Kanban card ──────────────────────────────────────────────────────

function KanbanCard({
  deal, onEdit, onDelete, isDragging,
}: { deal: Deal; onEdit: () => void; onDelete: () => void; isDragging?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: deal._id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

  return (
    <div
      ref={setNodeRef} style={style}
      className="bg-white rounded-xl border border-zinc-200 shadow-sm p-3.5 group cursor-default select-none"
    >
      <div className="flex items-start gap-2">
        <button {...attributes} {...listeners} className="mt-0.5 p-0.5 rounded text-zinc-300 hover:text-zinc-500 cursor-grab active:cursor-grabbing flex-shrink-0">
          <GripVertical className="w-3.5 h-3.5" strokeWidth={1.75} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-800 leading-snug line-clamp-2">{deal.title}</p>
          {deal.account && (
            <p className="text-xs text-zinc-400 mt-0.5 truncate">{(deal.account as { name: string }).name}</p>
          )}
          <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-zinc-100">
            <span className="text-xs font-semibold text-zinc-700">{fmt(deal.value)}</span>
            {deal.expectedCloseDate && (
              <span className="flex items-center gap-1 text-[10px] text-zinc-400">
                <Calendar className="w-3 h-3" strokeWidth={1.75} />
                {new Date(deal.expectedCloseDate).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
        <div className="flex-shrink-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="p-1 rounded hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors">
            <Pencil className="w-3.5 h-3.5" strokeWidth={1.75} />
          </button>
          <button onClick={onDelete} className="p-1 rounded hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors">
            <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Kanban column ─────────────────────────────────────────────────────────────

function KanbanColumn({
  stage, deals, onEdit, onDelete, activeId,
}: { stage: typeof STAGES[0]; deals: Deal[]; onEdit: (d: Deal) => void; onDelete: (d: Deal) => void; activeId: string | null }) {
  const total = deals.reduce((s, d) => s + d.value, 0);
  const { setNodeRef, isOver } = useDroppable({ id: stage.key });
  return (
    <div className="flex flex-col min-w-[220px] max-w-[260px] w-[240px] flex-shrink-0">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${stage.dot}`} />
          <span className="text-xs font-semibold text-zinc-700">{stage.label}</span>
          <span className="text-[10px] text-zinc-400 bg-zinc-100 rounded-full px-1.5 py-0.5">{deals.length}</span>
        </div>
        <span className="text-[11px] text-zinc-400 font-medium">{fmt(total)}</span>
      </div>
      <SortableContext items={deals.map((d) => d._id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`flex flex-col gap-2.5 min-h-[60px] rounded-xl p-2 transition-colors ${isOver ? "bg-blue-50/60 ring-1 ring-blue-200" : ""}`}
        >
          {deals.map((d) => (
            <KanbanCard
              key={d._id} deal={d}
              onEdit={() => onEdit(d)} onDelete={() => onDelete(d)}
              isDragging={activeId === d._id}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Deals() {
  const { token } = useAuth();
  const [deals, setDeals]     = useState<Deal[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [search, setSearch]   = useState("");
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");

  const [editing, setEditing]   = useState<Deal | null | "new">(null);
  const [deleting, setDeleting] = useState<Deal | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const refLoaded = useRef(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Load reference data once
  useEffect(() => {
    if (!token || refLoaded.current) return;
    refLoaded.current = true;
    Promise.all([
      listAccounts(token, { limit: 100 }).then((r) => setAccounts(r.accounts)),
    ]).catch(() => {});
  }, [token]);

  const load = () => {
    if (!token) return;
    setLoading(true);
    listDeals(token, { search, limit: 200 })
      .then((r) => { setDeals(r.deals); setTotal(r.total); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [token, search]); // eslint-disable-line

  // Group by stage for Kanban
  const byStage = (stage: DealStage) =>
    deals.filter((d) => d.stage === stage).sort((a, b) => a.order - b.order);

  const handleSaved = (d: Deal) => {
    setDeals((prev) => {
      const idx = prev.findIndex((x) => x._id === d._id);
      if (idx >= 0) return prev.map((x) => (x._id === d._id ? d : x));
      setTotal((t) => t + 1);
      return [d, ...prev];
    });
    setEditing(null);
  };

  const handleDelete = async () => {
    if (!token || !deleting) return;
    setDeleteLoading(true);
    try {
      await deleteDeal(token, deleting._id);
      setDeals((prev) => prev.filter((x) => x._id !== deleting._id));
      setTotal((t) => t - 1);
      setDeleting(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Delete failed."); }
    finally { setDeleteLoading(false); }
  };

  // DnD handlers
  const handleDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over || !token) return;
    const draggedDeal = deals.find((d) => d._id === active.id);
    if (!draggedDeal) return;

    // over.id is either a stage key (dropped on empty column) or a card id
    let targetStage: DealStage = draggedDeal.stage;
    const stageMatch = STAGES.find((s) => s.key === over.id);
    if (stageMatch) {
      targetStage = stageMatch.key;
    } else {
      const overDeal = deals.find((d) => d._id === over.id);
      if (overDeal) targetStage = overDeal.stage;
    }

    if (targetStage === draggedDeal.stage) return;

    // Optimistic update
    setDeals((prev) =>
      prev.map((d) => d._id === draggedDeal._id ? { ...d, stage: targetStage, order: 0 } : d)
    );

    try {
      await reorderDeals(token, [{ id: draggedDeal._id, stage: targetStage, order: 0 }]);
    } catch {
      load(); // rollback
    }
  };

  const activeDeal = deals.find((d) => d._id === activeId);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">Deals</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{total} deal{total !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center bg-zinc-100 rounded-lg p-0.5">
            <button onClick={() => setViewMode("kanban")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === "kanban" ? "bg-white text-zinc-800 shadow-sm" : "text-zinc-500 hover:text-zinc-700"}`}>
              <Kanban className="w-3.5 h-3.5" strokeWidth={1.75} /> Kanban
            </button>
            <button onClick={() => setViewMode("list")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === "list" ? "bg-white text-zinc-800 shadow-sm" : "text-zinc-500 hover:text-zinc-700"}`}>
              <List className="w-3.5 h-3.5" strokeWidth={1.75} /> List
            </button>
          </div>
          <button onClick={() => setEditing("new")} className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors">
            <Plus className="w-4 h-4" strokeWidth={1.75} /> New deal
          </button>
        </div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search deals…" />
      {error && <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="w-6 h-6 border-2 border-zinc-300 border-t-blue-500 rounded-full animate-spin" />
        </div>
      ) : viewMode === "kanban" ? (
        /* ── Kanban board ── */
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {STAGES.map((stage) => (
              <KanbanColumn
                key={stage.key} stage={stage}
                deals={byStage(stage.key)}
                onEdit={(d) => setEditing(d)} onDelete={(d) => setDeleting(d)}
                activeId={activeId}
              />
            ))}
          </div>
          <DragOverlay>
            {activeDeal ? (
              <div className="bg-white rounded-xl border border-blue-300 shadow-xl p-3.5 opacity-95 rotate-1 w-56">
                <p className="text-sm font-medium text-zinc-800">{activeDeal.title}</p>
                <p className="text-xs font-semibold text-zinc-500 mt-1">{fmt(activeDeal.value)}</p>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        /* ── Table view ── */
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
          {deals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Handshake className="w-10 h-10 text-zinc-300" strokeWidth={1.25} />
              <p className="text-sm text-zinc-400">No deals yet.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100">
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-widest text-zinc-400 font-medium">Title</th>
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-widest text-zinc-400 font-medium border-l border-zinc-100">Stage</th>
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-widest text-zinc-400 font-medium border-l border-zinc-100 hidden md:table-cell">Value</th>
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-widest text-zinc-400 font-medium border-l border-zinc-100 hidden lg:table-cell">Account</th>
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-widest text-zinc-400 font-medium border-l border-zinc-100 hidden lg:table-cell">Close date</th>
                  <th className="px-5 py-3 border-l border-zinc-100" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {deals.map((d) => (
                  <tr key={d._id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-zinc-800">{d.title}</td>
                    <td className="px-5 py-3.5 border-l border-zinc-100"><StageBadge stage={d.stage} /></td>
                    <td className="px-5 py-3.5 text-zinc-600 border-l border-zinc-100 hidden md:table-cell">{fmt(d.value)}</td>
                    <td className="px-5 py-3.5 text-zinc-500 border-l border-zinc-100 hidden lg:table-cell">{d.account ? (d.account as { name: string }).name : "—"}</td>
                    <td className="px-5 py-3.5 text-zinc-500 border-l border-zinc-100 hidden lg:table-cell">{d.expectedCloseDate ? new Date(d.expectedCloseDate).toLocaleDateString() : "—"}</td>
                    <td className="px-5 py-3.5 text-right border-l border-zinc-100">
                      <button onClick={() => setEditing(d)} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors"><Pencil className="w-3.5 h-3.5" strokeWidth={1.75} /></button>
                      <button onClick={() => setDeleting(d)} className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors ml-1"><Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Form slide-over */}
      <SlideOver open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "New deal" : "Edit deal"}>
        {editing !== null && (
          <DealForm initial={editing === "new" ? null : editing} accounts={accounts} token={token!} onSave={handleSaved} onCancel={() => setEditing(null)} />
        )}
      </SlideOver>

      {deleting && (
        <ConfirmDelete name={deleting.title} onConfirm={handleDelete} onCancel={() => setDeleting(null)} loading={deleteLoading} />
      )}
    </div>
  );
}
