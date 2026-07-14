import dbConnect from "@/lib/mongodb";
import Meeting from "@/models/Meeting";
import { getAuthUser } from "@/lib/auth";
import { withCors, handlePreflight } from "@/lib/cors";

import { logActivity } from "@/lib/activity";

function unauth() { return withCors(Response.json({ error: "Unauthorized" }, { status: 401 })); }

export async function PATCH(request, { params }) {
  const auth = getAuthUser(request);
  if (!auth) return unauth();
  const { id } = await params;
  const body = await request.json();
  const allowed = {};
  const fields = ["title", "scheduledAt", "durationMinutes", "location", "meetingLink", "notes", "relatedTo", "relatedToModel"];
  for (const f of fields) if (body[f] !== undefined) allowed[f] = body[f];
  if (allowed.title) allowed.title = allowed.title.trim();
  if (Array.isArray(body.participants)) allowed.participants = body.participants;
  await dbConnect();
  const meeting = await Meeting.findByIdAndUpdate(id, allowed, { new: true })
    .populate("owner", "name email").populate("participants", "name email");
  if (!meeting) return withCors(Response.json({ error: "Meeting not found" }, { status: 404 }));
  logActivity({ auth, request, action: "meeting_update", entity: "meeting", entityId: id, entityLabel: meeting.title, meta: { fields: Object.keys(allowed) } });
  return withCors(Response.json({ meeting }));
}

export async function DELETE(request, { params }) {
  const auth = getAuthUser(request);
  if (!auth) return unauth();
  const { id } = await params;
  await dbConnect();
  const meeting = await Meeting.findByIdAndDelete(id);
  if (!meeting) return withCors(Response.json({ error: "Meeting not found" }, { status: 404 }));
  logActivity({ auth, request, action: "meeting_delete", entity: "meeting", entityId: id, entityLabel: meeting.title });
  return withCors(Response.json({ message: "Deleted." }));
}

export async function OPTIONS() { return handlePreflight(); }
