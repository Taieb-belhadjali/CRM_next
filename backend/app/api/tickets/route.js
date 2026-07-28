import dbConnect from "@/lib/mongodb";
import Ticket from "@/models/Ticket";
import Contact from "@/models/Contact"; // must be imported to register schema for populate
import Account from "@/models/Account"; // must be imported to register schema for populate
import { getAuthUser } from "@/lib/auth";
import { enforceClientAccountAccess } from "@/lib/clientAccess";
import { withCors, handlePreflight } from "@/lib/cors";

import { logActivity } from "@/lib/activity";

function unauth() { return withCors(Response.json({ error: "Unauthorized" }, { status: 401 })); }

export async function GET(request) {
  try {
    const auth = getAuthUser(request);
    console.log("TICKETS LIST auth:", auth ? { sub: auth.sub, email: auth.email, role: auth.role, account: auth.account } : null);
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
    const clientFilter = enforceClientAccountAccess(auth);
    if (clientFilter !== null) Object.assign(filter, clientFilter);
    console.log("TICKETS LIST filter:", JSON.stringify(filter));
    let tickets, total;
    try {
      [tickets, total] = await Promise.all([
        Ticket.find(filter).populate("contact", "firstName lastName email").populate("account", "name").populate("assignee", "name email").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
        Ticket.countDocuments(filter),
      ]);
    } catch (queryError) {
      console.error("TICKETS LIST query failed:", queryError);
      throw queryError;
    }
    console.log("TICKETS LIST result count:", tickets.length, "total:", total);
    return withCors(Response.json({ tickets, total, page, limit }));
  } catch (e) {
    console.error("GET /api/tickets failed:", e);
    return withCors(Response.json({ error: e instanceof Error ? e.message : "Something went wrong." }, { status: 500 }));
  }
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
