import dbConnect from "@/lib/mongodb";
import Order from "@/models/Order";
import { getAuthUser } from "@/lib/auth";
import { withCors, handlePreflight } from "@/lib/cors";
import { logActivity } from "@/lib/activity";
import Delivery from "@/models/Delivery";

function unauth() { return withCors(Response.json({ error: "Unauthorized" }, { status: 401 })); }
function err(e)   { console.error(e); return withCors(Response.json({ error: "Something went wrong." }, { status: 500 })); }

const POPULATE = [
  { path: "contact", select: "firstName lastName email" },
  { path: "account", select: "name" },
  { path: "deal",    select: "title" },
  { path: "owner",   select: "name email" },
];

/** GET /api/orders/:id */
export async function GET(request, { params }) {
  try {
    const auth = getAuthUser(request);
    if (!auth) return unauth();
    const { id } = await params;
    await dbConnect();
    const order = await Order.findById(id).populate(POPULATE);
    if (!order) return withCors(Response.json({ error: "Order not found" }, { status: 404 }));
    return withCors(Response.json({ order }));
  } catch (e) { return err(e); }
}

/** PATCH /api/orders/:id */
export async function PATCH(request, { params }) {
  try {
    const auth = getAuthUser(request);
    if (!auth) return unauth();
    const { id } = await params;
    const body = await request.json();
    await dbConnect();
    const order = await Order.findById(id);
    if (!order) return withCors(Response.json({ error: "Order not found" }, { status: 404 }));

    const prevStatus = order.status;

    const fields = ["title", "status", "sourceType", "sourceId", "deal",
                    "contact", "account", "notes", "terms"];
    for (const f of fields) {
      if (body[f] !== undefined) order[f] = body[f] || null;
    }
    if (body.title) order.title = body.title.trim();
    if (Array.isArray(body.lineItems)) order.lineItems = body.lineItems;

    await order.save();
    await order.populate(POPULATE);

    const newStatus = order.status;

    logActivity({ auth, request, action: "order_update", entity: "order",
      entityId: id, entityLabel: `${order.number} – ${order.title}`,
      meta: { status: newStatus } });

    if (newStatus === "confirmed" && prevStatus !== "confirmed") {
      const existingDelivery = await Delivery.findOne({ orderId: order._id });
      if (!existingDelivery) {
        const delivery = await Delivery.create({
          orderId: order._id,
          invoiceId: order.invoiceId || undefined,
          contact: order.contact || undefined,
          account: order.account || undefined,
          status: "preparing",
        });
        logActivity({ auth, request, action: "delivery_create", entity: "delivery",
          entityId: delivery._id, entityLabel: `${delivery.number} – auto-created from order ${order.number}`,
          meta: { autoCreated: true, orderId: order._id } });
      }
    }

    return withCors(Response.json({ order }));
  } catch (e) { return err(e); }
}

/** DELETE /api/orders/:id */
export async function DELETE(request, { params }) {
  try {
    const auth = getAuthUser(request);
    if (!auth) return unauth();
    const { id } = await params;
    await dbConnect();
    const order = await Order.findByIdAndDelete(id);
    if (!order) return withCors(Response.json({ error: "Order not found" }, { status: 404 }));
    logActivity({ auth, request, action: "order_delete", entity: "order",
      entityId: id, entityLabel: `${order.number} – ${order.title}` });
    return withCors(Response.json({ message: "Deleted." }));
  } catch (e) { return err(e); }
}

export async function OPTIONS() { return handlePreflight(); }
