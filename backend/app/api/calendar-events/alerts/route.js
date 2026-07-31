import dbConnect from "@/lib/mongodb";
import CalendarEvent from "@/models/CalendarEvent";
import Task from "@/models/Task";
import Meeting from "@/models/Meeting";
import { getAuthUser } from "@/lib/auth";
import { withCors, handlePreflight } from "@/lib/cors";
import { isClient } from "@/lib/clientAccess";

function unauth() { return withCors(Response.json({ error: "Unauthorized" }, { status: 401 })); }
function err500(e) { console.error(e); return withCors(Response.json({ error: "Something went wrong." }, { status: 500 })); }

function buildVisibilityFilter(auth) {
  const rules = {
    $or: [
      { owner: auth.sub },
      { visibility: "team" },
      { visibility: "shared", sharedWith: auth.sub },
    ],
  };

  if (isClient(auth)) {
    return { $and: [{ $or: [{ owner: auth.sub }, { sharedWith: auth.sub }] }, rules] };
  }
  return rules;
}

function normalizePopulated(item) {
  return {
    _id: item._id,
    title: item.title,
    startAt: item.startAt || item.dueDate || item.scheduledAt,
    remindAt: item.remindAt || item.dueDate || item.scheduledAt,
    type: item.__type || "reminder",
  };
}

/** GET /api/calendar-events/alerts */
export async function GET(request) {
  try {
    const auth = getAuthUser(request);
    if (!auth) return unauth();
    await dbConnect();

    const now = new Date();
    const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const calendarFilter = {
      ...buildVisibilityFilter(auth),
      remindAt: { $lte: next24h, $gte: now },
      status: "scheduled",
    };

    const [calEvents, tasks, meetings] = await Promise.all([
      CalendarEvent.find(calendarFilter)
        .populate("owner", "name email")
        .populate("sharedWith", "name email")
        .sort({ remindAt: 1 })
        .limit(50)
        .lean(),
      Task.find({
        owner: auth.sub,
        status: { $ne: "done" },
        dueDate: { $lte: next24h, $gte: now },
      })
        .populate("assignee", "name email")
        .sort({ dueDate: 1 })
        .limit(30)
        .lean(),
      Meeting.find({
        owner: auth.sub,
        scheduledAt: { $lte: next24h, $gte: now },
      })
        .populate("owner", "name email")
        .sort({ scheduledAt: 1 })
        .limit(30)
        .lean(),
    ]);

    const alerts = [
      ...calEvents.map((e) => ({
        ...normalizePopulated({ ...e, __type: e.type }),
        owner: e.owner,
        sharedWith: e.sharedWith,
      })),
      ...tasks.map((t) => ({
        ...normalizePopulated({ ...t, __type: "task" }),
        owner: { name: t.assignee?.name || auth.email, email: t.assignee?.email || auth.email },
        sharedWith: [],
      })),
      ...meetings.map((m) => ({
        ...normalizePopulated({ ...m, __type: "meeting" }),
        owner: m.owner,
        sharedWith: [],
      })),
    ].sort((a, b) => {
      const ta = new Date(a.remindAt || "").getTime();
      const tb = new Date(b.remindAt || "").getTime();
      return ta - tb;
    });

    return withCors(Response.json({ alerts }));
  } catch (e) { return err500(e); }
}

export async function OPTIONS() { return handlePreflight(); }
