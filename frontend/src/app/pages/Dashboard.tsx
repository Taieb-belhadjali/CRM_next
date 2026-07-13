import {
  TrendingUp,
  TrendingDown,
  Handshake,
  CheckSquare,
  Phone,
  UserPlus,
  ArrowUpRight,
  CheckCircle2,
  Circle,
  Clock,
  ChevronRight,
  MoreHorizontal,
  Video,
  Star,
} from "lucide-react";
import { useState } from "react";

const PIPELINE_DATA = [
  { stage: "Prospection", deals: 34, value: 420000, color: "#bfdbfe" },
  { stage: "Proposition", deals: 21, value: 680000, color: "#93c5fd" },
  { stage: "Négociation", deals: 14, value: 910000, color: "#60a5fa" },
  { stage: "Gagné", deals: 9, value: 540000, color: "#22c55e" },
  { stage: "Perdu", deals: 6, value: 210000, color: "#f87171" },
];

const INITIAL_TASKS = [
  { id: 1, title: "Send proposal to Meridian Corp", priority: "high", time: "09:00", done: false },
  { id: 2, title: "Follow up with Atlas Ventures", priority: "medium", time: "10:30", done: false },
  { id: 3, title: "Review Q3 pipeline targets", priority: "low", time: "13:00", done: true },
  { id: 4, title: "Prepare demo for Nexus Digital", priority: "high", time: "15:00", done: false },
  { id: 5, title: "Update CRM notes from morning calls", priority: "medium", time: "17:00", done: false },
];

const MEETINGS = [
  { id: 1, time: "10:00", title: "Product Demo — Nexus Digital", participants: ["SL", "MK", "JR"] },
  { id: 2, time: "13:30", title: "Contract Review — Orion Partners", participants: ["AL", "TB"] },
  { id: 3, time: "16:00", title: "Quarterly Strategy Call", participants: ["CE", "RM", "SL", "FK"] },
];

const ACTIVITY = [
  { id: 1, icon: ArrowUpRight, text: "Deal moved to Négociation", sub: "Nexus Digital · $128k", time: "2m ago", color: "text-blue-500" },
  { id: 2, icon: UserPlus, text: "New prospect added", sub: "Thomas Huber · Orion GmbH", time: "18m ago", color: "text-green-500" },
  { id: 3, icon: Phone, text: "Call logged — 12 min", sub: "Sarah Laurent · Atlas Ventures", time: "1h ago", color: "text-purple-500" },
  { id: 4, icon: CheckCircle2, text: "Deal won · $54,000", sub: "Meridian Corp", time: "2h ago", color: "text-green-500" },
  { id: 5, icon: Star, text: "Account upgraded to Premium", sub: "Polaris Systems", time: "3h ago", color: "text-amber-500" },
];

const AVATAR_COLORS = ["bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-teal-500"];

const PRIORITY_STYLES: Record<string, string> = {
  high: "bg-red-50 text-red-600 border border-red-200",
  medium: "bg-amber-50 text-amber-600 border border-amber-200",
  low: "bg-zinc-100 text-zinc-500 border border-zinc-200",
};

function formatValue(v: number) {
  return v >= 1000000 ? `$${(v / 1000000).toFixed(1)}M` : `$${(v / 1000).toFixed(0)}k`;
}

function Avatar({ initials, idx }: { initials: string; idx: number }) {
  return (
    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold text-white -ml-2 first:ml-0 ring-2 ring-white ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`}>
      {initials}
    </div>
  );
}

export default function Dashboard() {
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const toggleTask = (id: number) => setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-4 gap-5">
        <KpiCard icon={<Handshake className="w-4.5 h-4.5 text-blue-500" strokeWidth={1.75} />} iconBg="bg-blue-50" value="84" label="Open Deals" sub="vs. 78 last month" trend="+8%" trendUp />
        <KpiCard icon={<CheckSquare className="w-4.5 h-4.5 text-amber-500" strokeWidth={1.75} />} iconBg="bg-amber-50" value="12" label="Tasks Due Today" sub="4 overdue from yesterday" trend="+3" trendUp={false} />
        <KpiCard icon={<Phone className="w-4.5 h-4.5 text-purple-500" strokeWidth={1.75} />} iconBg="bg-purple-50" value="7" label="Calls Scheduled" sub="Next at 10:00 — Nexus Digital" trend="+2" trendUp />
        <KpiCard icon={<UserPlus className="w-4.5 h-4.5 text-emerald-500" strokeWidth={1.75} />} iconBg="bg-emerald-50" value="31" label="New Prospects" sub="This week · goal 40" trend="+24%" trendUp />
      </div>

      {/* Pipeline + Tasks */}
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
            {PIPELINE_DATA.map((d) => {
              const maxVal = Math.max(...PIPELINE_DATA.map((x) => x.value));
              const pct = (d.value / maxVal) * 100;
              return (
                <div key={d.stage} className="flex items-center gap-3">
                  <div className="w-24 text-xs text-zinc-500 text-right font-medium shrink-0">{d.stage}</div>
                  <div className="flex-1 h-8 bg-zinc-50 rounded-lg overflow-hidden">
                    <div className="h-full rounded-lg flex items-center pl-3" style={{ width: `${pct}%`, backgroundColor: d.color }}>
                      <span className="text-xs font-semibold text-zinc-700 whitespace-nowrap">{d.deals} deals</span>
                    </div>
                  </div>
                  <div className="w-16 text-xs text-zinc-500 font-medium shrink-0">{formatValue(d.value)}</div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 pt-5 border-t border-zinc-100">
            <p className="text-[11px] uppercase tracking-widest text-zinc-400 font-medium mb-4">Deal value distribution</p>
            <div className="flex items-end gap-2 h-20">
              {PIPELINE_DATA.map((d) => {
                const maxVal = Math.max(...PIPELINE_DATA.map((x) => x.value));
                const heightPct = (d.value / maxVal) * 100;
                return (
                  <div key={d.stage} className="flex-1 flex flex-col items-center gap-1.5 group">
                    <span className="text-[10px] text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity font-medium">{formatValue(d.value)}</span>
                    <div className="w-full flex items-end" style={{ height: 56 }}>
                      <div className="w-full rounded-t-md transition-all duration-300 group-hover:brightness-90" style={{ height: `${heightPct}%`, backgroundColor: d.color }} />
                    </div>
                    <span className="text-[10px] text-zinc-400 truncate w-full text-center">{d.stage}</span>
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
              <p className="text-xs text-zinc-400 mt-0.5">Monday, 13 July 2026</p>
            </div>
            <button className="p-1.5 rounded-lg hover:bg-zinc-100 transition-colors">
              <MoreHorizontal className="w-4 h-4 text-zinc-400" />
            </button>
          </div>
          <div className="space-y-2.5">
            {tasks.map((task) => (
              <div key={task.id} className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${task.done ? "bg-zinc-50 border-zinc-100 opacity-60" : "bg-white border-zinc-100 hover:border-zinc-200 hover:bg-zinc-50"}`}>
                <button onClick={() => toggleTask(task.id)} className="mt-0.5 flex-shrink-0">
                  {task.done ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Circle className="w-4 h-4 text-zinc-300 hover:text-zinc-400" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-snug ${task.done ? "line-through text-zinc-400" : "text-zinc-700"}`}>{task.title}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${PRIORITY_STYLES[task.priority]}`}>{task.priority}</span>
                    <span className="text-[10px] text-zinc-400 flex items-center gap-1"><Clock className="w-3 h-3" /> {task.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Meetings + Activity */}
      <div className="grid grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">Upcoming Meetings</h2>
              <p className="text-xs text-zinc-400 mt-0.5">Today's schedule</p>
            </div>
            <button className="text-xs text-blue-500 hover:text-blue-600 font-medium flex items-center gap-1 transition-colors">
              View calendar <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-3">
            {MEETINGS.map((m, i) => (
              <div key={m.id} className="flex items-start gap-4 p-3.5 rounded-xl border border-zinc-100 hover:border-zinc-200 hover:bg-zinc-50 transition-colors">
                <div className="text-center flex-shrink-0 w-12">
                  <p className="text-xs font-semibold text-blue-500">{m.time}</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Today</p>
                </div>
                <div className="w-px self-stretch bg-zinc-100 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-800 truncate">{m.title}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex items-center">
                      {m.participants.map((p, idx) => <Avatar key={idx} initials={p} idx={i * 4 + idx} />)}
                    </div>
                    <span className="text-[10px] text-zinc-400">{m.participants.length} participants</span>
                  </div>
                </div>
                <button className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors">
                  <Video className="w-3.5 h-3.5" strokeWidth={1.75} />
                </button>
              </div>
            ))}
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
            {ACTIVITY.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.id} className="flex items-start gap-3 px-3 py-3 rounded-lg hover:bg-zinc-50 transition-colors group">
                  <div className={`w-7 h-7 rounded-lg bg-zinc-50 flex items-center justify-center flex-shrink-0 group-hover:bg-white border border-zinc-100 ${item.color}`}>
                    <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-700 leading-snug">{item.text}</p>
                    <p className="text-xs text-zinc-400 mt-0.5 truncate">{item.sub}</p>
                  </div>
                  <span className="text-[10px] text-zinc-400 whitespace-nowrap mt-0.5 flex-shrink-0">{item.time}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon, iconBg, value, label, sub, trend, trendUp }: {
  icon: React.ReactNode; iconBg: string; value: string; label: string; sub: string; trend: string; trendUp: boolean;
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
