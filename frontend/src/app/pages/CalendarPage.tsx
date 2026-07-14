import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, CheckSquare, Handshake } from "lucide-react";
import { listTasks, listDeals, type Task, type Deal } from "../api";
import { useAuth } from "../hooks/useAuth";

function startOfWeek(d: Date) {
  const day = d.getDay(); // 0=Sun
  const diff = (day === 0 ? -6 : 1) - day; // Monday start
  const start = new Date(d);
  start.setDate(d.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

interface DayItem { type: "task" | "deal"; id: string; title: string; time?: string; done?: boolean; stage?: string; value?: number; }

const STAGE_COLOURS: Record<string, string> = {
  prospection: "bg-blue-50 border-blue-200 text-blue-700",
  proposition: "bg-violet-50 border-violet-200 text-violet-700",
  negociation: "bg-amber-50 border-amber-200 text-amber-700",
  gagne:       "bg-emerald-50 border-emerald-200 text-emerald-700",
  perdu:       "bg-red-50 border-red-200 text-red-600",
};

export default function CalendarPage() {
  const { token } = useAuth();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [tasks, setTasks] = useState<Task[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      listTasks(token, { limit: 200 }),
      listDeals(token, { limit: 200 }),
    ]).then(([tr, dr]) => { setTasks(tr.tasks); setDeals(dr.deals); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();

  const itemsForDay = (day: Date): DayItem[] => {
    const result: DayItem[] = [];
    for (const t of tasks) {
      if (t.dueDate && sameDay(new Date(t.dueDate), day)) {
        result.push({ type: "task", id: t._id, title: t.title, done: t.status === "done" });
      }
    }
    for (const d of deals) {
      if (d.expectedCloseDate && sameDay(new Date(d.expectedCloseDate), day)) {
        result.push({ type: "deal", id: d._id, title: d.title, stage: d.stage, value: d.value });
      }
    }
    return result;
  };

  const monthLabel = (() => {
    const months = new Set(days.map((d) => d.getMonth()));
    if (months.size === 1) return `${MONTH_NAMES[days[0].getMonth()]} ${days[0].getFullYear()}`;
    return `${MONTH_NAMES[days[0].getMonth()]} – ${MONTH_NAMES[days[6].getMonth()]} ${days[6].getFullYear()}`;
  })();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">Calendar</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{monthLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekStart((w) => addDays(w, -7))} className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700 transition-colors">
            <ChevronLeft className="w-4 h-4" strokeWidth={1.75} />
          </button>
          <button onClick={() => setWeekStart(startOfWeek(new Date()))} className="px-3 py-1.5 text-xs font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors">
            Today
          </button>
          <button onClick={() => setWeekStart((w) => addDays(w, 7))} className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700 transition-colors">
            <ChevronRight className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* Week grid */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
        {/* Day header row */}
        <div className="grid grid-cols-7 border-b border-zinc-100">
          {days.map((day, i) => {
            const isToday = sameDay(day, today);
            return (
              <div key={i} className="px-3 py-3 text-center border-r border-zinc-100 last:border-r-0">
                <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-medium">{DAY_NAMES[i]}</p>
                <div className={`mx-auto mt-1 w-7 h-7 flex items-center justify-center rounded-full text-sm font-semibold ${isToday ? "bg-blue-500 text-white" : "text-zinc-700"}`}>
                  {day.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Events row */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <span className="w-5 h-5 border-2 border-zinc-300 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-7 min-h-[300px]">
            {days.map((day, i) => {
              const items = itemsForDay(day);
              const isToday = sameDay(day, today);
              return (
                <div key={i} className={`border-r border-zinc-100 last:border-r-0 p-2 space-y-1.5 ${isToday ? "bg-blue-50/30" : ""}`}>
                  {items.length === 0 && (
                    <p className="text-[10px] text-zinc-200 text-center pt-4">—</p>
                  )}
                  {items.map((item) => (
                    <div key={item.id} className={`rounded-lg border px-2 py-1.5 text-[11px] leading-snug ${item.type === "task" ? (item.done ? "bg-zinc-50 border-zinc-200 text-zinc-400 line-through" : "bg-white border-zinc-200 text-zinc-700") : (STAGE_COLOURS[item.stage!] || "bg-zinc-50 border-zinc-200 text-zinc-600")}`}>
                      <div className="flex items-center gap-1">
                        {item.type === "task"
                          ? <CheckSquare className="w-3 h-3 flex-shrink-0" strokeWidth={1.75} />
                          : <Handshake className="w-3 h-3 flex-shrink-0" strokeWidth={1.75} />}
                        <span className="truncate font-medium">{item.title}</span>
                      </div>
                      {item.value !== undefined && (
                        <p className="text-[10px] mt-0.5 opacity-70">€{item.value.toLocaleString()}</p>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-zinc-400">
        <span className="flex items-center gap-1.5"><CheckSquare className="w-3.5 h-3.5" strokeWidth={1.75} /> Task due date</span>
        <span className="flex items-center gap-1.5"><Handshake className="w-3.5 h-3.5" strokeWidth={1.75} /> Deal close date</span>
      </div>
    </div>
  );
}
