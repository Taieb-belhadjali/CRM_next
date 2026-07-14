import dbConnect from "@/lib/mongodb";
import Meeting from "@/models/Meeting";
import { getAuthUser } from "@/lib/auth";
import { withCors, handlePreflight } from "@/lib/cors";

import { logActivity } from "@/lib/activity";

function unauth() { return withCors(Response.json({ error: "Unauthorized" }, { status: 401 })); }

export async function GET(request) {
  try {
    const auth = getAuthUser(request);
    if (!auth) return unauth();
    const { searchParams } = new URL(request.url);
    const page  = Math.max(1, parseInt(searchParams.get("page")  || "1",  10));
    const limit = Math.min(100, parseInt(searchParams.get("limit") || "25", 10));
    const from  = searchParams.get("from");
    const to    = searchParams.get("to");
    await dbConnect();
    const filter = {};
    if (from || to) {
      filter.scheduledAt = {};
      if (from) filter.scheduledAt.$gte = new Date(from);
      if (to)   filter.scheduledAt.$lte = new Date(to);
    }
    const [meetings, total] = await Promise.all([
      Meeting.find(filter).populate("owner", "name email").populate("participants", "name email").sort({ scheduledAt: 1 }).skip((page - 1) * limit).limit(limit).lean(),
      Meeting.countDocuments(filter),
    ]);
    return withCors(Response.json({ meetings, total, page, limit }));
  } catch (e) { console.error(e); return withCors(Response.json({ error: "Something went wrong." }, { status: 500 })); }
}

export async function POST(request) {
  try {
    const auth = getAuthUser(request);
    if (!auth) return unauth();
    const body = await request.json();
    const { title, scheduledAt, durationMinutes, location, meetingLink, notes, participants, relatedTo, relatedToModel } = body;
    if (!title?.trim() || !scheduledAt) return withCors(Response.json({ error: "title and scheduledAt are required" }, { status: 400 }));
    await dbConnect();
    const meeting = await Meeting.create({
      title: title.trim(), scheduledAt, durationMinutes: durationMinutes ?? 60,
      location: location?.trim(), meetingLink: meetingLink?.trim(), notes: notes?.trim(),
      participants: Array.isArray(participants) ? participants : [],
      relatedTo: relatedTo || undefined, relatedToModel: relatedToModel || undefined,
      owner: auth.sub,
    });
    const populated = await meeting.populate([{ path: "owner", select: "name email" }, { path: "participants", select: "name email" }]);
    logActivity({ auth, request, action: "meeting_create", entity: "meeting", entityId: meeting._id, entityLabel: title.trim() });
    return withCors(Response.json({ meeting: populated }, { status: 201 }));
  } catch (e) { console.error(e); return withCors(Response.json({ error: "Something went wrong." }, { status: 500 })); }
}

export async function OPTIONS() { return handlePreflight(); }
