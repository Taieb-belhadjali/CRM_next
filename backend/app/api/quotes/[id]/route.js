import dbConnect from "@/lib/mongodb";
import Quote from "@/models/Quote";
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

/** GET /api/quotes/:id */
export async function GET(request, { params }) {
  try {
    const auth = getAuthUser(request);
    if (!auth) return unauth();
    const { id } = await params;
    await dbConnect();
    const quote = await Quote.findById(id).populate(POPULATE);
    if (!quote) return withCors(Response.json({ error: "Quote not found" }, { status: 404 }));
    return withCors(Response.json({ quote }));
  } catch (e) { return err(e); }
}

/** PATCH /api/quotes/:id */
export async function PATCH(request, { params }) {
  try {
    const auth = getAuthUser(request);
    if (!auth) return unauth();
    const { id } = await params;
    const body = await request.json();
    await dbConnect();
    const quote = await Quote.findById(id);
    if (!quote) return withCors(Response.json({ error: "Quote not found" }, { status: 404 }));

    const fields = ["title", "status", "issueDate", "validUntil", "deal",
                    "contact", "account", "notes", "terms"];
    for (const f of fields) {
      if (body[f] !== undefined) quote[f] = body[f] || null;
    }
    if (body.title)     quote.title = body.title.trim();
    if (Array.isArray(body.lineItems)) quote.lineItems = body.lineItems;

    await quote.save(); // triggers pre-save totals recalculation
    await quote.populate(POPULATE);

    logActivity({ auth, request, action: "quote_update", entity: "quote",
      entityId: id, entityLabel: `${quote.number} – ${quote.title}`,
      meta: { status: quote.status } });
    return withCors(Response.json({ quote }));
  } catch (e) { return err(e); }
}

/** DELETE /api/quotes/:id */
export async function DELETE(request, { params }) {
  try {
    const auth = getAuthUser(request);
    if (!auth) return unauth();
    const { id } = await params;
    await dbConnect();
    const quote = await Quote.findByIdAndDelete(id);
    if (!quote) return withCors(Response.json({ error: "Quote not found" }, { status: 404 }));
    logActivity({ auth, request, action: "quote_delete", entity: "quote",
      entityId: id, entityLabel: `${quote.number} – ${quote.title}` });
    return withCors(Response.json({ message: "Deleted." }));
  } catch (e) { return err(e); }
}

export async function OPTIONS() { return handlePreflight(); }
