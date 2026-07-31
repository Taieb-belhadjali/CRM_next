import dbConnect from "@/lib/mongodb";
import CalendarEvent from "@/models/CalendarEvent";
import { getAuthUser } from "@/lib/auth";
import { withCors, handlePreflight } from "@/lib/cors";
import { logActivity } from "@/lib/activity";
import { isClient } from "@/lib/clientAccess";

function unauth() { return withCors(Response.json({ error: "Unauthorized" }, { status: 401 })); }
function err500(e) { console.error(e); return withCors(Response.json({ error: "Something went wrong." }, { status: 500 })); }

function buildFilter(auth, from, to, type) {
  let filter = {};

  if (isClient(auth)) {
    filter.$and = [{ $or: [{ owner: auth.sub }, { sharedWith: auth.sub }] }];
  }

  const visibilityRules = {
    $or: [
      { owner: auth.sub },
      { visibility: "team" },
      { visibility: "shared", sharedWith: auth.sub },
    ],
  };

  if (filter.$and) {
    filter.$and.push(visibilityRules);
  } else {
    filter = visibilityRules;
  }

  if (from || to) {
    filter.startAt = {};
    if (from) filter.startAt = { ...filter.startAt, $gte: new Date(from) };
    if (to) filter.startAt = { ...filter.startAt, $lte: new Date(to) };
  }
  if (type) filter.type = type;

  return filter;
}

/** GET /api/calendar-events */
export async function GET(request) {
  try {
    const auth = getAuthUser(request);
    if (!auth) return unauth();
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const type = searchParams.get("type");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(200, parseInt(searchParams.get("limit") || "100", 10));

    await dbConnect();
    const filter = buildFilter(auth, from, to, type);

    const [events, total] = await Promise.all([
      CalendarEvent.find(filter)
        .populate("owner", "name email")
        .populate("sharedWith", "name email")
        .sort({ startAt: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      CalendarEvent.countDocuments(filter),
    ]);

    return withCors(Response.json({ events, total, page, limit }));
  } catch (e) { return err500(e); }
}

/** POST /api/calendar-events */
export async function POST(request) {
  try {
    const auth = getAuthUser(request);
    if (!auth) return unauth();
    const body = await request.json();
    const {
      title,
      description,
      type,
      startAt,
      endAt,
      allDay,
      location,
      meetingLink,
      notes,
      status,
      visibility,
      sharedWith,
      relatedTo,
      relatedToModel,
      reminderMinutes,
    } = body;

    if (!title?.trim() || !startAt) {
      return withCors(Response.json({ error: "title and startAt are required" }, { status: 400 }));
    }

    await dbConnect();
    const ev = await CalendarEvent.create({
      title: title.trim(),
      description: description?.trim(),
      type: type || "custom",
      startAt: new Date(startAt),
      endAt: endAt ? new Date(endAt) : undefined,
      allDay: !!allDay,
      location: location?.trim(),
      meetingLink: meetingLink?.trim(),
      notes: notes?.trim(),
      status: status || "scheduled",
      owner: auth.sub,
      visibility: visibility || "private",
      sharedWith: Array.isArray(sharedWith) ? sharedWith.filter((id) => !!id) : [],
      relatedTo: relatedTo || undefined,
      relatedToModel: relatedToModel || undefined,
      reminderMinutes: typeof reminderMinutes === "number" ? reminderMinutes : 15,
    });

    const populated = await ev.populate([
      { path: "owner", select: "name email" },
      { path: "sharedWith", select: "name email" },
    ]);

    logActivity({
      auth,
      request,
      action: "calendar_event_create",
      entity: "calendarEvent",
      entityId: ev._id,
      entityLabel: title.trim(),
    });

    return withCors(Response.json({ event: populated }, { status: 201 }));
  } catch (e) { return err500(e); }
}

export async function OPTIONS() { return handlePreflight(); }
