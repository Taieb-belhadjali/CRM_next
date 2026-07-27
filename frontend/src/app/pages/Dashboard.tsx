import { useEffect, useState } from "react";
import {
  TrendingUp, TrendingDown, Handshake, CheckSquare, Phone, UserPlus,
  ArrowUpRight, CheckCircle2, Circle, Clock, ChevronRight, MoreHorizontal,
  Video, Star, Search, Settings,
} from "lucide-react";
import { getDashboard, type DashboardData, type PipelineStage, type DashboardTask, type DashboardActivity } from "../api";
import { useAuth } from "../hooks/useAuth";
import { SearchBar } from "../components/shared/SearchBar";
import { DetailRow } from "../components/shared/DetailRow";

const STAGE_COLORS: Record<string, string> = {
  prospection: "#bfdbfe",
  proposition: "#93c5fd",
  negociation: "#60a5fa",
  gagne: "#22c55e",
  perdu: "#f87171",
};

const ACTION_META: Record<string, { icon: React.ElementType; color: string; describe: (a: DashboardActivity) => string }> = {
  login:            { icon: () => null, color: "text-emerald-500", describe: (a) => `${a.userName ?? a.userEmail ?? "Unknown"} signed in` },
  logout:           { icon: () => null, color: "text-zinc-400", describe: (a) => `${a.userName ?? a.userEmail ?? "Unknown"} signed out` },
  contact_create:   { icon: () => null, color: "text-blue-500", describe: (a) => `New contact ${a.entityLabel ?? ""}` },
  contact_update:   { icon: () => null, color: "text-amber-500", describe: (a) => `Contact updated ${a.entityLabel ?? ""}` },
  contact_delete:   { icon: () => null, color: "text-red-500", describe: (a) => `Contact deleted ${a.entityLabel ?? ""}` },
  account_create:   { icon: () => null, color: "text-blue-500", describe: (a) => `New account ${a.entityLabel ?? ""}` },
  account_update:   { icon: () => null, color: "text-amber-500", describe: (a) => `Account updated ${a.entityLabel ?? ""}` },
  account_delete:   { icon: () => null, color: "text-red-500", describe: (a) => `Account deleted ${a.entityLabel ?? ""}` },
  prospect_create:  { icon: () => null, color: "text-blue-500", describe: (a) => `New prospect ${a.entityLabel ?? ""}` },
  prospect_update:  { icon: () => null, color: "text-amber-500", describe: (a) => `Prospect updated ${a.entityLabel ?? ""}` },
  prospect_delete:  { icon: () => null, color: "text-red-500", describe: (a) => `Prospect deleted ${a.entityLabel ?? ""}` },
  deal_create:      { icon: () => null, color: "text-blue-500", describe: (a) => `New deal ${a.entityLabel ?? ""}` },
  deal_update:      { icon: () => null, color: "text-amber-500", describe: (a) => `Deal updated ${a.entityLabel ?? ""}` },
  deal_delete:      { icon: () => null, color: "text-red-500", describe: (a) => `Deal deleted ${a.entityLabel ?? ""}` },
  deal_stage_change:{ icon: () => null, color: "text-violet-500", describe: (a) => `Deal stage changed ${a.entityLabel ?? ""}` },
  task_create:      { icon: () => null, color: "text-blue-500", describe: (a) => `New task ${a.entityLabel ?? ""}` },
  task_update:      { icon: () => null, color: "text-amber-500", describe: (a) => `Task updated ${a.entityLabel ?? ""}` },
  task_delete:      { icon: () => null, color: "text-red-500", describe: (a) => `Task deleted ${a.entityLabel ?? ""}` },
  call_create:      { icon: () => null, color: "text-blue-500", describe: (a) => `Call logged ${a.entityLabel ?? ""}` },
  call_update:      { icon: () => null, color: "text-amber-500", describe: (a) => `Call updated ${a.entityLabel ?? ""}` },
  call_delete:      { icon: () => null, color: "text-red-500", describe: (a) => `Call deleted ${a.entityLabel ?? ""}` },
  meeting_create:   { icon: () => null, color: "text-blue-500", describe: (a) => `Meeting scheduled ${a.entityLabel ?? ""}` },
  meeting_update:   { icon: () => null, color: "text-amber-500", describe: (a) => `Meeting updated ${a.entityLabel ?? ""}` },
  meeting_delete:   { icon: () => null, color: "text-red-500", describe: (a) => `Meeting deleted ${a.entityLabel ?? ""}` },
  ticket_create:    { icon: () => null, color: "text-blue-500", describe: (a) => `Ticket opened ${a.entityLabel ?? ""}` },
  ticket_update:    { icon: () => null, color: "text-amber-500", describe: (a) => `Ticket updated ${a.entityLabel ?? ""}` },
  ticket_delete:    { icon: () => null, color: "text-red-500", describe: (a) => `Ticket deleted ${a.entityLabel ?? ""}` },
  order_create:     { icon: () => null, color: "text-blue-500", describe: (a) => `Order created ${a.entityLabel ?? ""}` },
  order_update:     { icon: () => null, color: "text-amber-500", describe: (a) => `Order updated ${a.entityLabel ?? ""}` },
  order_delete:     { icon: () => null, color: "text-red-500", describe: (a) => `Order deleted ${a.entityLabel ?? ""}` },
  purchase_order_create: { icon: () => null, color: "text-blue-500", describe: (a) => `Purchase order created ${a.entityLabel ?? ""}` },
  purchase_order_update: { icon: () => null, color: "text-amber-500", describe: (a) => `Purchase order updated ${a.entityLabel ?? ""}` },
  purchase_order_delete: { icon: () => null, color: "text-red-500", describe: (a) => `Purchase order deleted ${a.entityLabel ?? ""}` },
  delivery_create:  { icon: () => null, color: "text-blue-500", describe: (a) => `Delivery created ${a.entityLabel ?? ""}` },
  delivery_update:  { icon: () => null, color: "text-amber-500", describe: (a) => `Delivery updated ${a.entityLabel ?? ""}` },
  delivery_delete:  { icon: () => null, color: "text-red-500", describe: (a) => `Delivery deleted ${a.entityLabel ?? ""}` },
  quote_create:     { icon: () => null, color: "text-blue-500", describe: (a) => `Quote created ${a.entityLabel ?? ""}` },
  quote_update:     { icon: () => null, color: "text-amber-500", describe: (a) => `Quote updated ${a.entityLabel ?? ""}` },
  quote_delete:     { icon: () => null, color: "text-red-500", describe: (a) => `Quote deleted ${a.entityLabel ?? ""}` },
  quote_convert:    { icon: () => null, color: "text-emerald-500", describe: (a) => `Quote converted ${a.entityLabel ?? ""}` },
  invoice_create:   { icon: () => null, color: "text-blue-500", describe: (a) => `Invoice created ${a.entityLabel ?? ""}` },
  invoice_update:   { icon: () => null, color: "text-amber-500", describe: (a) => `Invoice updated ${a.entityLabel ?? ""}` },
  invoice_delete:   { icon: () => null, color: "text-red-500", describe: (a) => `Invoice deleted ${a.entityLabel ?? ""}` },
  user_create:      { icon: () => null, color: "text-blue-500", describe: (a) => `User created ${a.entityLabel ?? ""}` },
  user_update:      { icon: () => null, color: "text-amber-500", describe: (a) => `User updated ${a.entityLabel ?? ""}` },
  user_delete:      { icon: () => null, color: "text-red-500", describe: (a) => `User deleted ${a.entityLabel ?? ""}` },
};

const PRIORITY_STYLES: Record<string, string> = {
  high: "bg-red-50 text-red-600 border border-red-200",
  medium: "bg-amber-50 text-amber-600 border border-amber-200",
  low: "bg-zinc-100 text-zinc-500 border border-zinc-200",
};

function formatValue(v: number) {
  return v >= 1000000 ? `€${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `€${(v / 1000).toFixed(0)}k` : `€${v}`;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function KpiCard({ icon, iconBg, value, label, sub, trend, trendUp }: {
  icon: React.ReactNode; iconBg: string; value: string | number; label: string; sub: string; trend: string; trendUp: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className={`w-9 h-9 ${iconBg} rounded-lg flex items-center justify-center`}>{icon}</div>
        <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${trendUp ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
          {trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />} {trend}
        </span>
      </div>
      <div>
        <p className="text-3xl font-bold text-zinc-900 leading-none">{value}</p>
        <p className="text-xs text-zinc-500 mt-1.5 uppercase tracking-wide font-medium">{label}</p>
      </div>
      <p className="text-xs text-zinc-400">{sub}</p>
    </div>
  );
}

export default function Dashboard() {
  const { token } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    getDashboard(token)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const id = setInterval(() => {
      getDashboard(token)
        .then(setData)
        .catch(() => {});
    }, 15000);
    return () => clearInterval(id);
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="w-6 h-6 border-2 border-zinc-300 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>;
  }

  if (!data) return null;

  const maxVal = Math.max(...data.pipeline.map((s) => s.value), 1);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-5">
        <KpiCard icon={<Handshake className="w-4.5 h-4.5 text-blue-500" strokeWidth={1.75} />} iconBg="bg-blue-50" value={data.kpis.openDeals} label="Open Deals" sub="Active deals in pipeline" trend="+" trendUp />
        <KpiCard icon={<CheckSquare className="w-4.5 h-4.5 text-amber-500" strokeWidth={1.75} />} iconBg="bg-amber-50" value={data.kpis.tasksDueToday} label="Tasks Due Today" sub="Overdue and due today" trend="+" trendUp={false} />
        <KpiCard icon={<Phone className="w-4.5 h-4.5 text-purple-500" strokeWidth={1.75} />} iconBg="bg-purple-50" value={data.kpis.callsScheduled} label="Calls Scheduled" sub="Upcoming calls" trend="+" trendUp />
        <KpiCard icon={<UserPlus className="w-4.5 h-4.5 text-emerald-500" strokeWidth={1.75} />} iconBg="bg-emerald-50" value={data.kpis.newProspectsThisWeek} label="New Prospects" sub="This week" trend="+" trendUp />
      </div>

      <div className="grid grid-cols-5 gap-5">
        <div className="col-span-3 bg-white rounded-xl border border-zinc-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">Pipeline by Stage</h2>
              <p className="text-xs text-zinc-400 mt-0.5">Deal count & value by sales stage</p>
            </div>
            <button className="text-xs text-blue-500 hover:text-blue-600 font-medium flex items-center gap-1 transition-colors">
              View all <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-3">
            {data.pipeline.map((stage) => {
              const pct = maxVal > 0 ? (stage.value / maxVal) * 100 : 0;
              return (
                <div key={stage.key} className="flex items-center gap-3">
                  <div className="w-24 text-xs text-zinc-500 text-right font-medium shrink-0">{stage.label}</div>
                  <div className="flex-1 h-8 bg-zinc-50 rounded-lg overflow-hidden">
                    <div className="h-full rounded-lg flex items-center pl-3 transition-all" style={{ width: `${pct}%`, backgroundColor: STAGE_COLORS[stage.key] || "#ccc" }}>
                      <span className="text-xs font-semibold text-zinc-700 whitespace-nowrap">{stage.count} deals</span>
                    </div>
                  </div>
                  <div className="w-16 text-xs text-zinc-500 font-medium shrink-0">{formatValue(stage.value)}</div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 pt-5 border-t border-zinc-100">
            <p className="text-[11px] uppercase tracking-widest text-zinc-400 font-medium mb-4">Deal value distribution</p>
            <div className="flex items-end gap-2 h-20">
              {data.pipeline.map((stage) => {
                const heightPct = maxVal > 0 ? (stage.value / maxVal) * 100 : 0;
                return (
                  <div key={stage.key} className="flex-1 flex flex-col items-center gap-1.5 group">
                    <span className="text-[10px] text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity font-medium">{formatValue(stage.value)}</span>
                    <div className="w-full flex items-end" style={{ height: 56 }}>
                      <div className="w-full rounded-t-md transition-all duration-300 group-hover:brightness-90" style={{ height: `${heightPct}%`, backgroundColor: STAGE_COLORS[stage.key] || "#ccc" }} />
                    </div>
                    <span className="text-[10px] text-zinc-400 truncate w-full text-center">{stage.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="col-span-2 bg-white rounded-xl border border-zinc-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">Tasks Due Today</h2>
              <p className="text-xs text-zinc-400 mt-0.5">{new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
            </div>
            <button className="p-1.5 rounded-lg hover:bg-zinc-100 transition-colors">
              <MoreHorizontal className="w-4 h-4 text-zinc-400" />
            </button>
          </div>
          <div className="space-y-2.5">
            {data.tasksDueToday.length === 0 ? (
              <p className="text-sm text-zinc-400 text-center py-8">No tasks due today.</p>
            ) : (
              data.tasksDueToday.map((task) => (
                <div key={task._id} className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${task.status === "done" ? "bg-zinc-50 border-zinc-100 opacity-60" : "bg-white border-zinc-100 hover:border-zinc-200 hover:bg-zinc-50"}`}>
                  <div className="mt-0.5 flex-shrink-0">
                    {task.status === "done" ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Circle className="w-4 h-4 text-zinc-300 hover:text-zinc-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${task.status === "done" ? "line-through text-zinc-400" : "text-zinc-700"}`}>{task.title}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${PRIORITY_STYLES[task.priority] || ""}`}>{task.priority}</span>
                      {task.dueDate && (
                        <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {new Date(task.dueDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Recent Activity</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Across your team</p>
          </div>
          <button className="text-xs text-blue-500 hover:text-blue-600 font-medium flex items-center gap-1 transition-colors">
            View all <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="space-y-1">
          {data.recentActivity.length === 0 ? (
            <p className="text-sm text-zinc-400 text-center py-8">No recent activity.</p>
          ) : (
            data.recentActivity.map((item) => {
              const meta = ACTION_META[item.action] || { icon: () => null, color: "text-zinc-400", describe: () => item.action };
              const Icon = meta.icon;
              return (
                <div key={item._id} className="flex items-start gap-3 px-3 py-3 rounded-lg hover:bg-zinc-50 transition-colors group">
                  <div className={`w-7 h-7 rounded-lg bg-zinc-50 flex items-center justify-center flex-shrink-0 group-hover:bg-white border border-zinc-100 ${meta.color}`}>
                    {Icon ? <Icon className="w-3.5 h-3.5" strokeWidth={1.75} /> : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-700 leading-snug">{meta.describe(item)}</p>
                    <p className="text-xs text-zinc-400 mt-0.5 truncate">{item.entityLabel || item.entity || ""}</p>
                  </div>
                  <span className="text-[10px] text-zinc-400 whitespace-nowrap mt-0.5 flex-shrink-0">{timeAgo(item.createdAt)}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
