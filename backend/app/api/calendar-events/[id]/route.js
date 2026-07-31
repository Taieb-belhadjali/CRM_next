import dbConnect from "@/lib/mongodb";
import CalendarEvent from "@/models/CalendarEvent";
import { getAuthUser } from "@/lib/auth";
import { withCors, handlePreflight } from "@/lib/cors";
import { logActivity } from "@/lib/activity";
import { isClient } from "@/lib/clientAccess";

function unauth() { return withCors(Response.json({ error: "Unauthorized" }, { status: 401 })); }
function notFound() { return withCors(Response.json({ error: "Not found" }, { status: 404 })); }
function err500(e) { console.error(e); return withCors(Response.json({ error: "Something went wrong." }, { status: 500 })); }

function canAccess(event, auth) {
  if (event.owner.toString() === auth.sub) return true;
  if (event.visibility === "team") return true;
  if (event.visibility === "shared" && event.sharedWith?.some((id) => id.toString() === auth.sub)) return true;
  return false;
}

/** GET /api/calendar-events/:id */
export async function GET(request, { params }) {
  try {
    const auth = getAuthUser(request);
    if (!auth) return unauth();
    await dbConnect();
    const { id } = await params;
    const ev = await CalendarEvent.findById(id)
      .populate("owner", "name email")
      .populate("sharedWith", "name email")
      .lean();
    if (!ev) return notFound();
    if (!canAccess(ev, auth)) return withCors(Response.json({ error: "Forbidden" }, { status: 403 }));
    return withCors(Response.json({ event: ev }));
  } catch (e) { return err500(e); }
}

/** PATCH /api/calendar-events/:id */
export async function PATCH(request, { params }) {
  try {
    const auth = getAuthUser(request);
    if (!auth) return unauth();
    await dbConnect();
    const { id } = await params;
    const ev = await CalendarEvent.findById(id).lean();
    if (!ev) return notFound();
    if (ev.owner.toString() !== auth.sub) return withCors(Response.json({ error: "Forbidden" }, { status: 403 }));

    const body = await request.json();
    const allowed = [
      "title", "description", "type", "startAt", "endAt", "allDay", "location",
      "meetingLink", "notes", "status", "visibility", "sharedWith",
      "relatedTo", "relatedToModel", "reminderMinutes", "googleEventId", "googleCalendarId",
      "googleSyncedAt", "reminderSent",
    ];
    const update = {};
    for (const key of allowed) {
      if (key in body) update[key] = body[key];
    }

    if (update.startAt) update.startAt = new Date(update.startAt);
    if (update.endAt) update.endAt = new Date(update.endAt);
    if (update.sharedWith && Array.isArray(update.sharedWith)) {
      update.sharedWith = update.sharedWith.filter((id) => !!id);
    }

    const updated = await CalendarEvent.findByIdAndUpdate(id, update, { new: 1 });
    await updated.populate("owner", "name email");
    await updated.populate("sharedWith", "name email");

    logActivity({
      auth,
      request,
      action: "calendar_event_update",
      entity: "calendarEvent",
      entityId: id,
      entityLabel: updated.title,
    });

    return withCors(Response.json({ event: updated }));
  } catch (e) { return err500(e); }
}

/** DELETE /api/calendar-events/:id */
export async function DELETE(request, { params }) {
  try {
    const auth = getAuthUser(request);
    if (!auth) return unauth();
    await dbConnect();
    const { id } = await params;
    const ev = await CalendarEvent.findById(id).lean();
    if (!ev) return notFound();
    if (ev.owner.toString() !== auth.sub) return withCors(Response.json({ error: "Forbidden" }, { status: 403 }));

    await CalendarEvent.findByIdAndDelete(id);
    logActivity({
      auth,
      request,
      action: "calendar_event_delete",
      entity: "calendarEvent",
      entityId: id,
      entityLabel: ev.title,
    });

    return withCors(Response.json({ message: "Deleted" }));
  } catch (e) { return err500(e); }
}

export async function OPTIONS() { return handlePreflight(); }
