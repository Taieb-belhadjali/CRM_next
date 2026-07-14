import dbConnect from "@/lib/mongodb";
import Ticket from "@/models/Ticket";
import { getAuthUser } from "@/lib/auth";
import { withCors, handlePreflight } from "@/lib/cors";

function unauth() { return withCors(Response.json({ error: "Unauthorized" }, { status: 401 })); }

export async function GET(request, { params }) {
  const auth = getAuthUser(request);
  if (!auth) return unauth();
  const { id } = await params;
  await dbConnect();
  const ticket = await Ticket.findById(id)
    .populate("contact", "firstName lastName email")
    .populate("account", "name")
    .populate("assignee", "name email");
  if (!ticket) return withCors(Response.json({ error: "Ticket not found" }, { status: 404 }));
  return withCors(Response.json({ ticket }));
}

export async function PATCH(request, { params }) {
  try {
    const auth = getAuthUser(request);
    if (!auth) return unauth();
    const { id } = await params;
    const body = await request.json();
    const allowed = {};
    const fields = ["subject", "description", "status", "priority", "contact", "account", "assignee"];
    for (const f of fields) if (body[f] !== undefined) allowed[f] = body[f] || null;
    if (allowed.subject) allowed.subject = allowed.subject.trim();
    if (body.status === "resolved" && body.status !== undefined) allowed.resolvedAt = new Date();
    await dbConnect();
    const ticket = await Ticket.findByIdAndUpdate(id, allowed, { new: true })
      .populate("contact", "firstName lastName email")
      .populate("account", "name")
      .populate("assignee", "name email");
    if (!ticket) return withCors(Response.json({ error: "Ticket not found" }, { status: 404 }));
    logActivity({ auth, request, action: "ticket_update", entity: "ticket", entityId: id, entityLabel: ticket.subject, meta: { fields: Object.keys(allowed) } });
    return withCors(Response.json({ ticket }));
  } catch (e) {
    console.error(e);
    return withCors(Response.json({ error: "Something went wrong." }, { status: 500 }));
  }
}

export async function DELETE(request, { params }) {
  const auth = getAuthUser(request);
  if (!auth) return unauth();
  const { id } = await params;
  await dbConnect();
  const ticket = await Ticket.findByIdAndDelete(id);
  if (!ticket) return withCors(Response.json({ error: "Ticket not found" }, { status: 404 }));
  logActivity({ auth, request, action: "ticket_delete", entity: "ticket", entityId: id, entityLabel: ticket.subject });
  return withCors(Response.json({ message: "Deleted." }));
}

export async function OPTIONS() { return handlePreflight(); }
