import dbConnect from "@/lib/mongodb";
import Invoice from "@/models/Invoice";
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

/** GET /api/invoices/:id */
export async function GET(request, { params }) {
  try {
    const auth = getAuthUser(request);
    if (!auth) return unauth();
    const { id } = await params;
    await dbConnect();
    const invoice = await Invoice.findById(id).populate(POPULATE).populate("quoteId", "number title");
    if (!invoice) return withCors(Response.json({ error: "Invoice not found" }, { status: 404 }));
    return withCors(Response.json({ invoice }));
  } catch (e) { return err(e); }
}

/** PATCH /api/invoices/:id */
export async function PATCH(request, { params }) {
  try {
    const auth = getAuthUser(request);
    if (!auth) return unauth();
    const { id } = await params;
    const body = await request.json();
    await dbConnect();
    const invoice = await Invoice.findById(id);
    if (!invoice) return withCors(Response.json({ error: "Invoice not found" }, { status: 404 }));

    const fields = ["title", "status", "issueDate", "dueDate", "paidDate",
                    "paidAmount", "deal", "contact", "account",
                    "notes", "terms", "paymentInfo"];
    for (const f of fields) {
      if (body[f] !== undefined) invoice[f] = body[f] ?? null;
    }
    if (body.title) invoice.title = body.title.trim();
    if (Array.isArray(body.lineItems)) invoice.lineItems = body.lineItems;

    await invoice.save();
    await invoice.populate(POPULATE);

    logActivity({ auth, request, action: "invoice_update", entity: "invoice",
      entityId: id, entityLabel: `${invoice.number} – ${invoice.title}`,
      meta: { status: invoice.status } });

    if (invoice.status === "paid" && body.status === "paid") {
      const order = await Order.findOne({ sourceType: "invoice", sourceId: invoice._id });
      if (order) {
        const existing = await Delivery.findOne({ orderId: order._id });
        if (!existing) {
          const delivery = await Delivery.create({
            orderId: order._id,
            invoiceId: invoice._id,
            status: "preparing",
          });
          logActivity({ auth, request, action: "delivery_create", entity: "delivery",
            entityId: delivery._id, entityLabel: `${delivery.number} – auto-created from invoice ${invoice.number}`,
            meta: { autoCreated: true, orderId: order._id, invoiceId: invoice._id } });
        } else if (!existing.invoiceId) {
          existing.invoiceId = invoice._id;
          await existing.save();
        }
      }
    }

    return withCors(Response.json({ invoice }));
  } catch (e) { return err(e); }
}

/** DELETE /api/invoices/:id */
export async function DELETE(request, { params }) {
  try {
    const auth = getAuthUser(request);
    if (!auth) return unauth();
    const { id } = await params;
    await dbConnect();
    const invoice = await Invoice.findByIdAndDelete(id);
    if (!invoice) return withCors(Response.json({ error: "Invoice not found" }, { status: 404 }));
    logActivity({ auth, request, action: "invoice_delete", entity: "invoice",
      entityId: id, entityLabel: `${invoice.number} – ${invoice.title}` });
    return withCors(Response.json({ message: "Deleted." }));
  } catch (e) { return err(e); }
}

export async function OPTIONS() { return handlePreflight(); }
