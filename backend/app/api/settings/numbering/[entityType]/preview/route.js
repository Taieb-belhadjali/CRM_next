import dbConnect from "@/lib/mongodb";
import NumberingConfig from "@/models/NumberingConfig";
import { getAuthUser } from "@/lib/auth";
import { withCors, handlePreflight } from "@/lib/cors";
import { getNextReferencePreview } from "@/lib/numbering";

function unauth() { return withCors(Response.json({ error: "Unauthorized" }, { status: 401 })); }
function forbidden() { return withCors(Response.json({ error: "Forbidden" }, { status: 403 })); }
function err(e)   { console.error(e); return withCors(Response.json({ error: "Something went wrong." }, { status: 500 })); }

const ENTITY_TYPES = ["quote", "invoice", "order", "purchaseOrder", "delivery", "client", "ticket"];

/** GET /api/settings/numbering/:entityType/preview */
export async function GET(request, { params }) {
  try {
    const auth = getAuthUser(request);
    if (!auth) return unauth();
    if (auth.role !== "admin") return forbidden();
    const { entityType } = await params;
    if (!ENTITY_TYPES.includes(entityType)) {
      return withCors(Response.json({ error: "Invalid entity type" }, { status: 400 }));
    }

    await dbConnect();
    const config = await NumberingConfig.findOne({ entityType });
    if (!config) return withCors(Response.json({ preview: null }));

    const body = {};
    try { body.prefix = (await request.text()) ? JSON.parse(await request.text()).prefix : undefined; } catch {}
    // Read overrides from query params for lighter integration without changing method
    const { searchParams } = new URL(request.url);
    const overrideFormat = searchParams.get("format") || undefined;
    const overridePrefix = searchParams.get("prefix") || body.prefix || undefined;

    const preview = await getNextReferencePreview(entityType, {
      prefix: overridePrefix,
      format: overrideFormat,
      padding: searchParams.get("padding") || undefined,
      resetFrequency: searchParams.get("resetFrequency") || undefined,
    });
    return withCors(Response.json({ preview: preview || null }));
  } catch (e) { return err(e); }
}

export async function OPTIONS() { return handlePreflight(); }
