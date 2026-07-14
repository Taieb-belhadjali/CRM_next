import dbConnect from "@/lib/mongodb";
import Ticket from "@/models/Ticket";
import { getAuthUser } from "@/lib/auth";
import { withCors, handlePreflight } from "@/lib/cors";

import { logActivity } from "@/lib/activity";

function unauth() { return withCors(Response.json({ error: "Unauthorized" }, { status: 401 })); }

export async function GET(request) {
  try {
    const auth = getAuthUser(request);
    if (!auth) return unauth();
    const { searchParams } = new URL(request.url);
    const status   = searchParams.get("status");
    const priority = searchParams.get("priority");
    const search   = searchParams.get("search") || "";
    const page     = Math.max(1, parseInt(searchParams.get("page")  || "1",  10));
    const limit    = Math.min(100, parseInt(searchParams.get("limit") || "25", 10));
    await dbConnect();
    const filter = {};
    if (status)   filter.status   = status;
    if (priority) filter.priority = priority;
    if (search)   filter.$or = [{ subject: new RegExp(search, "i") }, { description: new RegExp(search, "i") }];
    const [tickets, total] = await Promise.all([
      Ticket.find(filter).populate("contact", "firstName lastName email").populate("account", "name").populate("assignee", "name email").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Ticket.countDocuments(filter),
    ]);
    return withCors(Response.json({ tickets, total, page, limit }));
  } catch (e) { console.error(e); return withCors(Response.json({ error: "Something went wrong." }, { status: 500 })); }
}

export async function POST(request) {
  try {
    const auth = getAuthUser(request);
    if (!auth) return unauth();
    const body = await request.json();
    const { subject, description, status, priority, contact, account, assignee } = body;
    if (!subject?.trim()) return withCors(Response.json({ error: "subject is required" }, { status: 400 }));
    await dbConnect();
    const ticket = await Ticket.create({
      subject: subject.trim(), description: description?.trim(),
      status: status || "open", priority: priority || "medium",
      contact: contact || undefined, account: account || undefined,
      assignee: assignee || undefined, owner: auth.sub,
    });
    const populated = await ticket.populate([
      { path: "contact", select: "firstName lastName email" },
      { path: "account", select: "name" },
      { path: "assignee", select: "name email" },
    ]);
    logActivity({ auth, request, action: "ticket_create", entity: "ticket", entityId: ticket._id, entityLabel: subject.trim() });
    return withCors(Response.json({ ticket: populated }, { status: 201 }));
  } catch (e) { console.error(e); return withCors(Response.json({ error: "Something went wrong." }, { status: 500 })); }
}

export async function OPTIONS() { return handlePreflight(); }
