import dbConnect from "@/lib/mongodb";
import Delivery from "@/models/Delivery";
import { getAuthUser } from "@/lib/auth";
import { withCors, handlePreflight } from "@/lib/cors";
import { logActivity } from "@/lib/activity";

function unauth() { return withCors(Response.json({ error: "Unauthorized" }, { status: 401 })); }
function err(e)   { console.error(e); return withCors(Response.json({ error: "Something went wrong." }, { status: 500 })); }

const POPULATE = [
  { path: "orderId", select: "number title status" },
  { path: "invoiceId", select: "number title" },
  { path: "contact", select: "firstName lastName email" },
  { path: "account", select: "name" },
];

/** GET /api/deliveries/:id */
export async function GET(request, { params }) {
  try {
    const auth = getAuthUser(request);
    if (!auth) return unauth();
    const { id } = await params;
    await dbConnect();
    const delivery = await Delivery.findById(id).populate(POPULATE);
    if (!delivery) return withCors(Response.json({ error: "Delivery not found" }, { status: 404 }));
    return withCors(Response.json({ delivery }));
  } catch (e) { return err(e); }
}

/** PATCH /api/deliveries/:id */
export async function PATCH(request, { params }) {
  try {
    const auth = getAuthUser(request);
    if (!auth) return unauth();
    const { id } = await params;
    const body = await request.json();
    await dbConnect();
    const delivery = await Delivery.findById(id);
    if (!delivery) return withCors(Response.json({ error: "Delivery not found" }, { status: 404 }));

    const fields = ["trackingNumber", "deliveryAddress", "status", "carrier",
                    "estimatedDelivery", "lineItems", "notes", "contact", "account"];
    for (const f of fields) {
      if (body[f] !== undefined) delivery[f] = body[f] || null;
    }
    if (body.trackingNumber) delivery.trackingNumber = body.trackingNumber.trim();
    if (body.deliveryAddress) delivery.deliveryAddress = body.deliveryAddress.trim();
    if (body.carrier) delivery.carrier = body.carrier.trim();

    await delivery.save();
    await delivery.populate(POPULATE);

    logActivity({ auth, request, action: "delivery_update", entity: "delivery",
      entityId: id, entityLabel: `${delivery.number} – ${delivery.orderId?.number || "order"}`,
      meta: { status: delivery.status } });
    return withCors(Response.json({ delivery }));
  } catch (e) { return err(e); }
}

/** DELETE /api/deliveries/:id */
export async function DELETE(request, { params }) {
  try {
    const auth = getAuthUser(request);
    if (!auth) return unauth();
    const { id } = await params;
    await dbConnect();
    const delivery = await Delivery.findByIdAndDelete(id);
    if (!delivery) return withCors(Response.json({ error: "Delivery not found" }, { status: 404 }));
    logActivity({ auth, request, action: "delivery_delete", entity: "delivery",
      entityId: id, entityLabel: `${delivery.number} – ${delivery.orderId?.number || "order"}` });
    return withCors(Response.json({ message: "Deleted." }));
  } catch (e) { return err(e); }
}

export async function OPTIONS() { return handlePreflight(); }
