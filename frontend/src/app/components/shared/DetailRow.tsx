interface Props {
  label: string;
  value?: string | number | null;
  children?: React.ReactNode;
}

export function DetailRow({ label, value, children }: Props) {
  const content = children ?? (value != null && value !== "" ? value : "—");
  return (
    <div className="flex flex-col gap-0.5 py-3 border-b border-zinc-100 last:border-0">
      <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-medium">{label}</span>
      <span className="text-sm text-zinc-800">{content}</span>
    </div>
  );
}
