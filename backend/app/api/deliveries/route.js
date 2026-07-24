import dbConnect from "@/lib/mongodb";
import Delivery from "@/models/Delivery";
import { getAuthUser } from "@/lib/auth";
import { withCors, handlePreflight } from "@/lib/cors";
import { logActivity } from "@/lib/activity";

function unauth() { return withCors(Response.json({ error: "Unauthorized" }, { status: 401 })); }
function err(e)   { console.error(e); return withCors(Response.json({ error: "Something went wrong." }, { status: 500 })); }

/** GET /api/deliveries?status=&orderId=&search=&page=&limit= */
export async function GET(request) {
  try {
    const auth = getAuthUser(request);
    if (!auth) return unauth();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const orderId = searchParams.get("orderId");
    const search = searchParams.get("search") || "";
    const page   = Math.max(1, parseInt(searchParams.get("page")  || "1",   10));
    const limit  = Math.min(100, parseInt(searchParams.get("limit") || "25", 10));
    await dbConnect();
    const filter = {};
    if (status) filter.status = status;
    if (orderId) filter.orderId = orderId;
    if (search) filter.$or = [
      { trackingNumber: new RegExp(search, "i") },
      { number: new RegExp(search, "i") },
    ];
    const [deliveries, total] = await Promise.all([
      Delivery.find(filter)
        .populate("orderId", "number title status")
        .populate("invoiceId", "number title")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit).limit(limit).lean(),
      Delivery.countDocuments(filter),
    ]);
    return withCors(Response.json({ deliveries, total, page, limit }));
  } catch (e) { return err(e); }
}

/** POST /api/deliveries */
export async function POST(request) {
  try {
    const auth = getAuthUser(request);
    if (!auth) return unauth();
    const body = await request.json();
    const { orderId, invoiceId, trackingNumber, status, carrier,
            estimatedDelivery, notes } = body;
    if (!orderId) return withCors(Response.json({ error: "orderId is required" }, { status: 400 }));
    await dbConnect();
    const delivery = await Delivery.create({
      orderId,
      invoiceId: invoiceId || undefined,
      trackingNumber: trackingNumber?.trim(),
      status: status || "preparing",
      carrier: carrier?.trim() || undefined,
      estimatedDelivery: estimatedDelivery || undefined,
      notes: notes?.trim() || undefined,
    });
    const populated = await delivery.populate([
      { path: "orderId", select: "number title status" },
      { path: "invoiceId", select: "number title" },
    ]);
    logActivity({ auth, request, action: "delivery_create", entity: "delivery",
      entityId: delivery._id, entityLabel: `${delivery.number} – order ${delivery.orderId?.number || orderId}` });
    return withCors(Response.json({ delivery: populated }, { status: 201 }));
  } catch (e) { return err(e); }
}

export async function OPTIONS() { return handlePreflight(); }
