const STYLES: Record<string, string> = {
  // Prospect statuses
  new: "bg-blue-50 text-blue-700 border-blue-200",
  contacted: "bg-amber-50 text-amber-700 border-amber-200",
  qualified: "bg-violet-50 text-violet-700 border-violet-200",
  converted: "bg-emerald-50 text-emerald-700 border-emerald-200",
  unqualified: "bg-zinc-100 text-zinc-500 border-zinc-200",
  // Account statuses
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  inactive: "bg-zinc-100 text-zinc-500 border-zinc-200",
  disputed: "bg-red-50 text-red-600 border-red-200",
};

const LABELS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  converted: "Converted",
  unqualified: "Unqualified",
  active: "Active",
  inactive: "Inactive",
  disputed: "Disputed",
};

export function StatusBadge({ status }: { status: string }) {
  const cls = STYLES[status] ?? "bg-zinc-100 text-zinc-500 border-zinc-200";
  const label = LABELS[status] ?? status;
  return (
    <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full border ${cls}`}>
      {label}
    </span>
  );
}
