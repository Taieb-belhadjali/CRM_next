import dbConnect from "@/lib/mongodb";
import SavedSearch from "@/models/SavedSearch";
import { getAuthUser } from "@/lib/auth";
import { withCors, handlePreflight } from "@/lib/cors";
import { logActivity } from "@/lib/activity";

function unauth() { return withCors(Response.json({ error: "Unauthorized" }, { status: 401 })); }
function err(e)   { console.error(e); return withCors(Response.json({ error: "Something went wrong." }, { status: 500 })); }

/** GET /api/saved-searches */
export async function GET(request) {
  try {
    const auth = getAuthUser(request);
    if (!auth) return unauth();
    await dbConnect();
    const searches = await SavedSearch.find({ user: auth.sub })
      .sort({ createdAt: -1 })
      .lean();
    return withCors(Response.json({ searches }));
  } catch (e) { return err(e); }
}

/** POST /api/saved-searches */
export async function POST(request) {
  try {
    const auth = getAuthUser(request);
    if (!auth) return unauth();
    const body = await request.json();
    const { query, filters } = body;
    if (!query?.trim()) return withCors(Response.json({ error: "query is required" }, { status: 400 }));
    await dbConnect();
    const search = await SavedSearch.create({
      user: auth.sub,
      query: query.trim(),
      filters: filters || null,
    });
    logActivity({ auth, request, action: "saved_search_create", entity: null,
      entityId: search._id, entityLabel: `Saved search: "${query.trim()}"` });
    return withCors(Response.json({ search }, { status: 201 }));
  } catch (e) { return err(e); }
}

export async function OPTIONS() { return handlePreflight(); }
