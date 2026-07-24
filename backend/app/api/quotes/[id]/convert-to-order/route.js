import dbConnect from "@/lib/mongodb";
import Quote from "@/models/Quote";
import Order from "@/models/Order";
import { getAuthUser } from "@/lib/auth";
import { withCors, handlePreflight } from "@/lib/cors";
import { logActivity } from "@/lib/activity";

/**
 * POST /api/quotes/:id/convert-to-order
 * Creates an Order from an accepted Quote.
 */
export async function POST(request, { params }) {
  try {
    const auth = getAuthUser(request);
    if (!auth) return withCors(Response.json({ error: "Unauthorized" }, { status: 401 }));

    const { id } = await params;
    await dbConnect();
    const quote = await Quote.findById(id);
    if (!quote) return withCors(Response.json({ error: "Quote not found" }, { status: 404 }));

    const order = await Order.create({
      title:       quote.title,
      status:      "pending",
      sourceType:  "quote",
      sourceId:    quote._id,
      deal:        quote.deal    || undefined,
      contact:     quote.contact || undefined,
      account:     quote.account || undefined,
      lineItems:   quote.lineItems.map((li) => ({ ...li.toObject ? li.toObject() : li })),
      notes:       quote.notes,
      terms:       quote.terms,
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
      entityLabel: `${order.number} – from quote ${quote.number || quote._id}`,
      meta: { sourceType: "quote", sourceId: quote._id } });

    return withCors(Response.json({ order: populated }, { status: 201 }));
  } catch (e) {
    console.error(e);
    return withCors(Response.json({ error: "Something went wrong." }, { status: 500 }));
  }
}

export async function OPTIONS() { return handlePreflight(); }
