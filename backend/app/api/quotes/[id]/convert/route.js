import dbConnect from "@/lib/mongodb";
import Quote from "@/models/Quote";
import Invoice from "@/models/Invoice";
import { getAuthUser } from "@/lib/auth";
import { withCors, handlePreflight } from "@/lib/cors";
import { logActivity } from "@/lib/activity";

/**
 * POST /api/quotes/:id/convert
 * Creates an Invoice from an accepted Quote, links them together.
 */
export async function POST(request, { params }) {
  try {
    const auth = getAuthUser(request);
    if (!auth) return withCors(Response.json({ error: "Unauthorized" }, { status: 401 }));

    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    await dbConnect();
    const quote = await Quote.findById(id);
    if (!quote) return withCors(Response.json({ error: "Quote not found" }, { status: 404 }));
    if (quote.invoiceId) {
      return withCors(Response.json({ error: "Quote already converted to an invoice." }, { status: 409 }));
    }

    // Determine due date: body.dueDate or 30 days from today
    const dueDate = body.dueDate
      ? new Date(body.dueDate)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const invoice = await Invoice.create({
      title:       quote.title,
      status:      "unpaid",
      issueDate:   new Date(),
      dueDate,
      quoteId:     quote._id,
      deal:        quote.deal    || undefined,
      contact:     quote.contact || undefined,
      account:     quote.account || undefined,
      lineItems:   quote.lineItems.map((li) => ({ ...li.toObject() })),
      notes:       quote.notes,
      terms:       quote.terms,
      paymentInfo: body.paymentInfo || undefined,
      owner:       auth.sub,
    });

    // Link quote → invoice
    quote.invoiceId = invoice._id;
    if (quote.status === "draft" || quote.status === "sent") quote.status = "accepted";
    await quote.save();

    logActivity({ auth, request, action: "quote_convert", entity: "quote",
      entityId: quote._id,
      entityLabel: `${quote.number} → ${invoice.number}`,
      meta: { invoiceId: invoice._id } });

    const populated = await Invoice.findById(invoice._id).populate([
      { path: "contact", select: "firstName lastName email" },
      { path: "account", select: "name" },
      { path: "deal",    select: "title" },
      { path: "owner",   select: "name email" },
    ]);

    return withCors(Response.json({ invoice: populated, quote }, { status: 201 }));
  } catch (e) {
    console.error(e);
    return withCors(Response.json({ error: "Something went wrong." }, { status: 500 }));
  }
}

export async function OPTIONS() { return handlePreflight(); }
