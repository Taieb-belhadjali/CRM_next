import dbConnect from "@/lib/mongodb";
import NumberingConfig from "@/models/NumberingConfig";
import { getAuthUser } from "@/lib/auth";
import { withCors, handlePreflight } from "@/lib/cors";
import { logActivity } from "@/lib/activity";
import { ALLOWED_TOKENS } from "@/lib/numbering";

function unauth() { return withCors(Response.json({ error: "Unauthorized" }, { status: 401 })); }
function forbidden() { return withCors(Response.json({ error: "Forbidden" }, { status: 403 })); }
function err(e)   { console.error(e); return withCors(Response.json({ error: "Something went wrong." }, { status: 500 })); }

/** GET /api/settings/numbering */
export async function GET(request) {
  try {
    const auth = getAuthUser(request);
    if (!auth) return unauth();
    if (auth.role !== "admin") return forbidden();
    await dbConnect();
    const configs = await NumberingConfig.find({}).sort({ entityType: 1 }).lean();
    return withCors(Response.json({ configs }));
  } catch (e) { return err(e); }
}

export async function OPTIONS() { return handlePreflight(); }
