import dbConnect from "@/lib/mongodb";
import Invoice from "@/models/Invoice";
import Order from "@/models/Order";
import { getAuthUser } from "@/lib/auth";
import { withCors, handlePreflight } from "@/lib/cors";
import { logActivity } from "@/lib/activity";

/**
 * POST /api/invoices/:id/convert-to-order
 * Creates an Order from an Invoice.
 */
export async function POST(request, { params }) {
  try {
    const auth = getAuthUser(request);
    if (!auth) return withCors(Response.json({ error: "Unauthorized" }, { status: 401 }));

    const { id } = await params;
    await dbConnect();
    const invoice = await Invoice.findById(id);
    if (!invoice) return withCors(Response.json({ error: "Invoice not found" }, { status: 404 }));

    const order = await Order.create({
      title:       invoice.title,
      status:      "pending",
      sourceType:  "invoice",
      sourceId:    invoice._id,
      deal:        invoice.deal    || undefined,
      contact:     invoice.contact || undefined,
      account:     invoice.account || undefined,
      lineItems:   invoice.lineItems.map((li) => ({ ...li.toObject ? li.toObject() : li })),
      notes:       invoice.notes,
      terms:       invoice.terms,
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
      entityLabel: `${order.number} – from invoice ${invoice.number || invoice._id}`,
      meta: { sourceType: "invoice", sourceId: invoice._id } });

    return withCors(Response.json({ order: populated }, { status: 201 }));
  } catch (e) {
    console.error(e);
    return withCors(Response.json({ error: "Something went wrong." }, { status: 500 }));
  }
}

export async function OPTIONS() { return handlePreflight(); }
