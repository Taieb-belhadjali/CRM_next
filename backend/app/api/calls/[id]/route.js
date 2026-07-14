import dbConnect from "@/lib/mongodb";
import Call from "@/models/Call";
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
  const fields = ["subject", "direction", "status", "durationMinutes", "scheduledAt", "notes", "relatedTo", "relatedToModel"];
  for (const f of fields) if (body[f] !== undefined) allowed[f] = body[f];
  if (allowed.subject) allowed.subject = allowed.subject.trim();
  await dbConnect();
  const call = await Call.findByIdAndUpdate(id, allowed, { new: true }).populate("owner", "name email");
  if (!call) return withCors(Response.json({ error: "Call not found" }, { status: 404 }));
  logActivity({ auth, request, action: "call_update", entity: "call", entityId: id, entityLabel: call.subject, meta: { fields: Object.keys(allowed) } });
  return withCors(Response.json({ call }));
}

export async function DELETE(request, { params }) {
  const auth = getAuthUser(request);
  if (!auth) return unauth();
  const { id } = await params;
  await dbConnect();
  const call = await Call.findByIdAndDelete(id);
  if (!call) return withCors(Response.json({ error: "Call not found" }, { status: 404 }));
  logActivity({ auth, request, action: "call_delete", entity: "call", entityId: id, entityLabel: call.subject });
  return withCors(Response.json({ message: "Deleted." }));
}

export async function OPTIONS() { return handlePreflight(); }
