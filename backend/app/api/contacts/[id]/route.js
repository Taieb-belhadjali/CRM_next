import dbConnect from "@/lib/mongodb";
import Contact from "@/models/Contact";
import { getAuthUser } from "@/lib/auth";
import { withCors, handlePreflight } from "@/lib/cors";
import { logActivity } from "@/lib/activity";

function unauth() {
  return withCors(Response.json({ error: "Unauthorized" }, { status: 401 }));
}

/** GET /api/contacts/:id */
export async function GET(request, { params }) {
  const auth = getAuthUser(request);
  if (!auth) return unauth();

  const { id } = await params;
  await dbConnect();

  const contact = await Contact.findById(id)
    .populate("account", "name sector")
    .populate("owner", "name email");

  if (!contact) {
    return withCors(Response.json({ error: "Contact not found" }, { status: 404 }));
  }

  return withCors(Response.json({ contact }));
}

/** PATCH /api/contacts/:id */
export async function PATCH(request, { params }) {
  const auth = getAuthUser(request);
  if (!auth) return unauth();

  const { id } = await params;
  const body = await request.json();

  const allowed = {};
  const fields = ["firstName", "lastName", "jobTitle", "email", "phone", "address", "account"];
  for (const f of fields) {
    if (body[f] !== undefined) {
      allowed[f] = typeof body[f] === "string" ? body[f].trim() : body[f];
    }
  }
  if (allowed.email) allowed.email = allowed.email.toLowerCase();
  if (body.account === null) allowed.account = null;

  await dbConnect();

  const contact = await Contact.findByIdAndUpdate(id, allowed, { new: true })
    .populate("account", "name sector")
    .populate("owner", "name email");

  if (!contact) {
    return withCors(Response.json({ error: "Contact not found" }, { status: 404 }));
  }

  logActivity({
    auth,
    request,
    action: "contact_update",
    entity: "contact",
    entityId: id,
    entityLabel: `${contact.firstName} ${contact.lastName}`,
    meta: { fields: Object.keys(allowed) },
  });

  return withCors(Response.json({ contact }));
}

/** DELETE /api/contacts/:id */
export async function DELETE(request, { params }) {
  const auth = getAuthUser(request);
  if (!auth) return unauth();

  const { id } = await params;
  await dbConnect();

  const contact = await Contact.findByIdAndDelete(id);
  if (!contact) {
    return withCors(Response.json({ error: "Contact not found" }, { status: 404 }));
  }

  logActivity({
    auth,
    request,
    action: "contact_delete",
    entity: "contact",
    entityId: id,
    entityLabel: `${contact.firstName} ${contact.lastName}`,
  });

  return withCors(Response.json({ message: "Deleted." }));
}

export async function OPTIONS() {
  return handlePreflight();
}
