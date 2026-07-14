import dbConnect from "@/lib/mongodb";
import Deal from "@/models/Deal";
import Contact from "@/models/Contact"; // must be imported to register schema for populate
import { getAuthUser } from "@/lib/auth";
import { withCors, handlePreflight } from "@/lib/cors";
import { logActivity } from "@/lib/activity";

function unauth() { return withCors(Response.json({ error: "Unauthorized" }, { status: 401 })); }

/** GET /api/deals/:id */
export async function GET(request, { params }) {
  const auth = getAuthUser(request);
  if (!auth) return unauth();
  const { id } = await params;
  await dbConnect();
  const deal = await Deal.findById(id)
    .populate("account", "name")
    .populate("contacts", "firstName lastName email")
    .populate("owner", "name email");
  if (!deal) return withCors(Response.json({ error: "Deal not found" }, { status: 404 }));
  return withCors(Response.json({ deal }));
}

/** PATCH /api/deals/:id */
export async function PATCH(request, { params }) {
  try {
    const auth = getAuthUser(request);
    if (!auth) return unauth();
    const { id } = await params;
    const body = await request.json();
    const allowed = {};
    if (body.title !== undefined)             allowed.title = body.title.trim();
    if (body.stage !== undefined)             allowed.stage = body.stage;
    if (body.value !== undefined)             allowed.value = body.value;
    if (body.order !== undefined)             allowed.order = body.order;
    if (body.account !== undefined)           allowed.account = body.account || null;
    if (body.expectedCloseDate !== undefined) allowed.expectedCloseDate = body.expectedCloseDate || null;
    if (Array.isArray(body.contacts))         allowed.contacts = body.contacts;
    await dbConnect();
    const deal = await Deal.findByIdAndUpdate(id, allowed, { new: true })
      .populate("account", "name")
      .populate("contacts", "firstName lastName email")
      .populate("owner", "name email");
    if (!deal) return withCors(Response.json({ error: "Deal not found" }, { status: 404 }));
    logActivity({ auth, request, action: "deal_update", entity: "deal", entityId: id, entityLabel: deal.title, meta: { fields: Object.keys(allowed) } });
    return withCors(Response.json({ deal }));
  } catch (e) {
    console.error(e);
    return withCors(Response.json({ error: "Something went wrong." }, { status: 500 }));
  }
}

/** DELETE /api/deals/:id */
export async function DELETE(request, { params }) {
  const auth = getAuthUser(request);
  if (!auth) return unauth();
  const { id } = await params;
  await dbConnect();
  const deal = await Deal.findByIdAndDelete(id);
  if (!deal) return withCors(Response.json({ error: "Deal not found" }, { status: 404 }));
  logActivity({ auth, request, action: "deal_delete", entity: "deal", entityId: id, entityLabel: deal.title });
  return withCors(Response.json({ message: "Deleted." }));
}

export async function OPTIONS() { return handlePreflight(); }
