import { Plus, Trash2 } from "lucide-react";
import type { LineItem } from "../../api";

interface Props {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
  readOnly?: boolean;
}

function round2(n: number) { return Math.round(n * 100) / 100; }

function computeItem(item: LineItem): LineItem {
  const subtotal  = round2(item.quantity * item.unitPrice);
  const taxAmount = round2(subtotal * (item.taxRate / 100));
  return { ...item, subtotal, taxAmount, total: round2(subtotal + taxAmount) };
}

const EMPTY: LineItem = { description: "", quantity: 1, unitPrice: 0, taxRate: 20, subtotal: 0, taxAmount: 0, total: 0 };

export function LineItemEditor({ items, onChange, readOnly }: Props) {
  const update = (idx: number, patch: Partial<LineItem>) => {
    const updated = items.map((it, i) => i === idx ? computeItem({ ...it, ...patch }) : it);
    onChange(updated);
  };
  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));
  const add    = () => onChange([...items, { ...EMPTY }]);

  const subtotal  = round2(items.reduce((s, i) => s + (i.subtotal  ?? 0), 0));
  const taxTotal  = round2(items.reduce((s, i) => s + (i.taxAmount ?? 0), 0));
  const grandTotal = round2(subtotal + taxTotal);

  const inputCls = "w-full px-2 py-1.5 text-xs bg-zinc-50 border border-zinc-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 transition-colors disabled:opacity-60";

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="grid grid-cols-[1fr_60px_80px_60px_80px_32px] gap-1.5 px-1">
        {["Description", "Qté", "P.U. HT (€)", "TVA %", "Total TTC", ""].map((h) => (
          <span key={h} className="text-[10px] font-medium uppercase tracking-widest text-zinc-400">{h}</span>
        ))}
      </div>

      {/* Rows */}
      {items.map((item, idx) => (
        <div key={idx} className="grid grid-cols-[1fr_60px_80px_60px_80px_32px] gap-1.5 items-center">
          <input
            className={inputCls} value={item.description} disabled={readOnly}
            onChange={(e) => update(idx, { description: e.target.value })}
            placeholder="Description de la prestation"
          />
          <input
            className={`${inputCls} text-center`} type="number" min={0} step={0.01}
            value={item.quantity} disabled={readOnly}
            onChange={(e) => update(idx, { quantity: Number(e.target.value) })}
          />
          <input
            className={`${inputCls} text-right`} type="number" min={0} step={0.01}
            value={item.unitPrice} disabled={readOnly}
            onChange={(e) => update(idx, { unitPrice: Number(e.target.value) })}
          />
          <input
            className={`${inputCls} text-center`} type="number" min={0} max={100} step={0.5}
            value={item.taxRate} disabled={readOnly}
            onChange={(e) => update(idx, { taxRate: Number(e.target.value) })}
          />
          <span className="text-xs font-semibold text-zinc-700 text-right pr-1">
            {(item.total ?? 0).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €
          </span>
          {!readOnly ? (
            <button type="button" onClick={() => remove(idx)}
              className="p-1 rounded hover:bg-red-50 text-zinc-300 hover:text-red-400 transition-colors">
              <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
            </button>
          ) : <span />}
        </div>
      ))}

      {items.length === 0 && (
        <p className="text-xs text-zinc-400 text-center py-4 border border-dashed border-zinc-200 rounded-lg">
          No line items yet.{!readOnly && " Click \u201cAdd line\u201d to start."}
        </p>
      )}

      {!readOnly && (
        <button type="button" onClick={add}
          className="flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-600 font-medium transition-colors mt-1">
          <Plus className="w-3.5 h-3.5" strokeWidth={2} /> Add line
        </button>
      )}

      {/* Totals */}
      {items.length > 0 && (
        <div className="border-t border-zinc-100 pt-3 space-y-1 mt-2">
          <div className="flex justify-between text-xs text-zinc-500">
            <span>Sous-total HT</span>
            <span>{subtotal.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</span>
          </div>
          <div className="flex justify-between text-xs text-zinc-500">
            <span>TVA</span>
            <span>{taxTotal.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</span>
          </div>
          <div className="flex justify-between text-sm font-semibold text-zinc-900 pt-1 border-t border-zinc-100">
            <span>Total TTC</span>
            <span>{grandTotal.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</span>
          </div>
        </div>
      )}
    </div>
  );
}
