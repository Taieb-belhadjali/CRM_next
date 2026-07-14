import dbConnect from "@/lib/mongodb";
import Deal from "@/models/Deal";
import Contact from "@/models/Contact"; // must be imported to register schema for populate
import { getAuthUser } from "@/lib/auth";
import { withCors, handlePreflight } from "@/lib/cors";
import { logActivity } from "@/lib/activity";

function unauth() { return withCors(Response.json({ error: "Unauthorized" }, { status: 401 })); }
function err500(e) { console.error(e); return withCors(Response.json({ error: "Something went wrong." }, { status: 500 })); }

/** GET /api/deals?stage=&search=&page=&limit= */
export async function GET(request) {
  try {
    const auth = getAuthUser(request);
    if (!auth) return unauth();
    const { searchParams } = new URL(request.url);
    const stage  = searchParams.get("stage");
    const search = searchParams.get("search") || "";
    const page   = Math.max(1, parseInt(searchParams.get("page")  || "1",  10));
    const limit  = Math.min(200, parseInt(searchParams.get("limit") || "100", 10));
    await dbConnect();
    const filter = {};
    if (stage)  filter.stage = stage;
    if (search) filter.$or = [{ title: new RegExp(search, "i") }];
    const [deals, total] = await Promise.all([
      Deal.find(filter)
        .populate("account", "name")
        .populate("contacts", "firstName lastName email")
        .populate("owner", "name email")
        .sort({ stage: 1, order: 1, createdAt: -1 })
        .skip((page - 1) * limit).limit(limit).lean(),
      Deal.countDocuments(filter),
    ]);
    return withCors(Response.json({ deals, total, page, limit }));
  } catch (e) { return err500(e); }
}

/** POST /api/deals */
export async function POST(request) {
  try {
    const auth = getAuthUser(request);
    if (!auth) return unauth();
    const body = await request.json();
    const { title, stage, value, account, contacts, expectedCloseDate } = body;
    if (!title?.trim()) return withCors(Response.json({ error: "title is required" }, { status: 400 }));
    await dbConnect();
    const deal = await Deal.create({
      title: title.trim(),
      stage: stage || "prospection",
      value: value ?? 0,
      account: account || undefined,
      contacts: Array.isArray(contacts) ? contacts : [],
      expectedCloseDate: expectedCloseDate || undefined,
      owner: auth.sub,
      order: 0,
    });
    const populated = await deal.populate([
      { path: "account", select: "name" },
      { path: "contacts", select: "firstName lastName email" },
      { path: "owner", select: "name email" },
    ]);
    logActivity({ auth, request, action: "deal_create", entity: "deal", entityId: deal._id, entityLabel: title.trim() });
    return withCors(Response.json({ deal: populated }, { status: 201 }));
  } catch (e) { return err500(e); }
}

export async function OPTIONS() { return handlePreflight(); }
