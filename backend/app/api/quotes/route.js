import dbConnect from "@/lib/mongodb";
import Quote from "@/models/Quote";
import { getAuthUser } from "@/lib/auth";
import { withCors, handlePreflight } from "@/lib/cors";
import { logActivity } from "@/lib/activity";

function unauth() { return withCors(Response.json({ error: "Unauthorized" }, { status: 401 })); }
function err(e)   { console.error(e); return withCors(Response.json({ error: "Something went wrong." }, { status: 500 })); }

/** GET /api/quotes?status=&search=&page=&limit= */
export async function GET(request) {
  try {
    const auth = getAuthUser(request);
    if (!auth) return unauth();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search") || "";
    const page   = Math.max(1, parseInt(searchParams.get("page")  || "1",   10));
    const limit  = Math.min(100, parseInt(searchParams.get("limit") || "25", 10));
    await dbConnect();
    const filter = {};
    if (status) filter.status = status;
    if (search) filter.$or = [
      { title: new RegExp(search, "i") },
      { number: new RegExp(search, "i") },
    ];
    const [quotes, total] = await Promise.all([
      Quote.find(filter)
        .populate("contact", "firstName lastName email")
        .populate("account", "name")
        .populate("deal", "title")
        .populate("owner", "name email")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit).limit(limit).lean(),
      Quote.countDocuments(filter),
    ]);
    return withCors(Response.json({ quotes, total, page, limit }));
  } catch (e) { return err(e); }
}

/** POST /api/quotes */
export async function POST(request) {
  try {
    const auth = getAuthUser(request);
    if (!auth) return unauth();
    const body = await request.json();
    const { title, status, issueDate, validUntil, deal, contact, account,
            lineItems, notes, terms } = body;
    if (!title?.trim()) return withCors(Response.json({ error: "title is required" }, { status: 400 }));
    await dbConnect();
    const quote = await Quote.create({
      title: title.trim(),
      status: status || "draft",
      issueDate: issueDate || undefined,
      validUntil: validUntil || undefined,
      deal: deal || undefined,
      contact: contact || undefined,
      account: account || undefined,
      lineItems: Array.isArray(lineItems) ? lineItems : [],
      notes: notes?.trim(),
      terms: terms?.trim(),
      owner: auth.sub,
    });
    const populated = await quote.populate([
      { path: "contact", select: "firstName lastName email" },
      { path: "account", select: "name" },
      { path: "deal",    select: "title" },
      { path: "owner",   select: "name email" },
    ]);
    logActivity({ auth, request, action: "quote_create", entity: "quote",
      entityId: quote._id, entityLabel: `${quote.number} – ${title.trim()}` });
    return withCors(Response.json({ quote: populated }, { status: 201 }));
  } catch (e) { return err(e); }
}

export async function OPTIONS() { return handlePreflight(); }
