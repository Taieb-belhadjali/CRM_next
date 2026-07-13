import { Construction } from "lucide-react";

export default function StubPage({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-96 text-center">
      <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center mb-4">
        <Construction className="w-6 h-6 text-zinc-400" strokeWidth={1.5} />
      </div>
      <h2 className="text-lg font-semibold text-zinc-800 mb-1">{title}</h2>
      <p className="text-sm text-zinc-400 max-w-xs">{description}</p>
    </div>
  );
}
