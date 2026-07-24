import dbConnect from "@/lib/mongodb";
import Order from "@/models/Order";
import Invoice from "@/models/Invoice";
import { getAuthUser } from "@/lib/auth";
import { withCors, handlePreflight } from "@/lib/cors";
import { logActivity } from "@/lib/activity";

/**
 * POST /api/:sourceType/:sourceId/convert-to-order
 * Creates an Order from a Quote or Invoice.
 */
export async function POST(request, { params }) {
  try {
    const auth = getAuthUser(request);
    if (!auth) return withCors(Response.json({ error: "Unauthorized" }, { status: 401 }));

    const { sourceType, sourceId } = await params;
    if (!["quote", "invoice"].includes(sourceType)) {
      return withCors(Response.json({ error: "Invalid source type." }, { status: 400 }));
    }

    await dbConnect();
    const Model = sourceType === "quote" ? (await import("@/models/Quote")).default : (await import("@/models/Invoice")).default;
    const source = await Model.findById(sourceId);
    if (!source) return withCors(Response.json({ error: `${sourceType} not found` }, { status: 404 }));

    const order = await Order.create({
      title:       source.title,
      status:      "pending",
      sourceType,
      sourceId:    source._id,
      deal:        source.deal    || undefined,
      contact:     source.contact || undefined,
      account:     source.account || undefined,
      lineItems:   source.lineItems.map((li) => ({ ...li.toObject ? li.toObject() : li })),
      notes:       source.notes,
      terms:       source.terms,
      owner:       auth.sub,
    });

    const populated = await order.populate([
      { path: "contact", select: "firstName lastName email" },
      { path: "account", select: "name" },
      { path: "deal",    select: "title" },
      { path: "owner",   select: "name email" },
    ]);

    logActivity({ auth, request, action: "order_create", entity: "order",
      entityId: order._id,
      entityLabel: `${order.number} – from ${sourceType} ${source.number || source._id}`,
      meta: { sourceType, sourceId: source._id } });

    return withCors(Response.json({ order: populated }, { status: 201 }));
  } catch (e) {
    console.error(e);
    return withCors(Response.json({ error: "Something went wrong." }, { status: 500 }));
  }
}

export async function OPTIONS() { return handlePreflight(); }
