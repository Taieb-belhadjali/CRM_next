import dbConnect from "@/lib/mongodb";
import PurchaseOrder from "@/models/PurchaseOrder";
import { getAuthUser } from "@/lib/auth";
import { withCors, handlePreflight } from "@/lib/cors";
import { logActivity } from "@/lib/activity";

function unauth() { return withCors(Response.json({ error: "Unauthorized" }, { status: 401 })); }
function err(e)   { console.error(e); return withCors(Response.json({ error: "Something went wrong." }, { status: 500 })); }

const POPULATE = [
  { path: "contact", select: "firstName lastName email" },
  { path: "account", select: "name" },
  { path: "deal",    select: "title" },
  { path: "owner",   select: "name email" },
];

/** GET /api/purchase-orders/:id */
export async function GET(request, { params }) {
  try {
    const auth = getAuthUser(request);
    if (!auth) return unauth();
    const { id } = await params;
    await dbConnect();
    const po = await PurchaseOrder.findById(id).populate(POPULATE);
    if (!po) return withCors(Response.json({ error: "Purchase order not found" }, { status: 404 }));
    return withCors(Response.json({ purchaseOrder: po }));
  } catch (e) { return err(e); }
}

/** PATCH /api/purchase-orders/:id */
export async function PATCH(request, { params }) {
  try {
    const auth = getAuthUser(request);
    if (!auth) return unauth();
    const { id } = await params;
    const body = await request.json();
    await dbConnect();
    const po = await PurchaseOrder.findById(id);
    if (!po) return withCors(Response.json({ error: "Purchase order not found" }, { status: 404 }));

    const fields = ["title", "status", "supplier", "deal", "contact", "account", "notes"];
    for (const f of fields) {
      if (body[f] !== undefined) po[f] = body[f] || null;
    }
    if (body.title) po.title = body.title.trim();
    if (Array.isArray(body.lineItems)) po.lineItems = body.lineItems;

    await po.save();
    await po.populate(POPULATE);

    logActivity({ auth, request, action: "purchase_order_update", entity: "purchase_order",
      entityId: id, entityLabel: `${po.number} – ${po.title}`,
      meta: { status: po.status } });
    return withCors(Response.json({ purchaseOrder: po }));
  } catch (e) { return err(e); }
}

/** DELETE /api/purchase-orders/:id */
export async function DELETE(request, { params }) {
  try {
    const auth = getAuthUser(request);
    if (!auth) return unauth();
    const { id } = await params;
    await dbConnect();
    const po = await PurchaseOrder.findByIdAndDelete(id);
    if (!po) return withCors(Response.json({ error: "Purchase order not found" }, { status: 404 }));
    logActivity({ auth, request, action: "purchase_order_delete", entity: "purchase_order",
      entityId: id, entityLabel: `${po.number} – ${po.title}` });
    return withCors(Response.json({ message: "Deleted." }));
  } catch (e) { return err(e); }
}

export async function OPTIONS() { return handlePreflight(); }
