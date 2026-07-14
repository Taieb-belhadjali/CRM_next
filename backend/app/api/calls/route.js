import dbConnect from "@/lib/mongodb";
import Call from "@/models/Call";
import { getAuthUser } from "@/lib/auth";
import { withCors, handlePreflight } from "@/lib/cors";

import { logActivity } from "@/lib/activity";

function unauth() { return withCors(Response.json({ error: "Unauthorized" }, { status: 401 })); }

export async function GET(request) {
  try {
    const auth = getAuthUser(request);
    if (!auth) return unauth();
    const { searchParams } = new URL(request.url);
    const status    = searchParams.get("status");
    const direction = searchParams.get("direction");
    const relatedTo = searchParams.get("relatedTo");
    const page      = Math.max(1, parseInt(searchParams.get("page")  || "1",  10));
    const limit     = Math.min(100, parseInt(searchParams.get("limit") || "25", 10));
    await dbConnect();
    const filter = {};
    if (status)    filter.status    = status;
    if (direction) filter.direction = direction;
    if (relatedTo) filter.relatedTo = relatedTo;
    const [calls, total] = await Promise.all([
      Call.find(filter).populate("owner", "name email").sort({ scheduledAt: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Call.countDocuments(filter),
    ]);
    return withCors(Response.json({ calls, total, page, limit }));
  } catch (e) { console.error(e); return withCors(Response.json({ error: "Something went wrong." }, { status: 500 })); }
}

export async function POST(request) {
  try {
    const auth = getAuthUser(request);
    if (!auth) return unauth();
    const body = await request.json();
    const { subject, direction, status, durationMinutes, scheduledAt, notes, relatedTo, relatedToModel } = body;
    if (!subject?.trim()) return withCors(Response.json({ error: "subject is required" }, { status: 400 }));
    await dbConnect();
    const call = await Call.create({
      subject: subject.trim(), direction: direction || "outbound",
      status: status || "completed", durationMinutes: durationMinutes ?? 0,
      scheduledAt: scheduledAt || undefined, notes: notes?.trim(),
      relatedTo: relatedTo || undefined, relatedToModel: relatedToModel || undefined,
      owner: auth.sub,
    });
    const populated = await call.populate("owner", "name email");
    logActivity({ auth, request, action: "call_create", entity: "call", entityId: call._id, entityLabel: subject.trim() });
    return withCors(Response.json({ call: populated }, { status: 201 }));
  } catch (e) { console.error(e); return withCors(Response.json({ error: "Something went wrong." }, { status: 500 })); }
}

export async function OPTIONS() { return handlePreflight(); }
