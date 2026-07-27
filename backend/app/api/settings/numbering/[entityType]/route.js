import dbConnect from "@/lib/mongodb";
import NumberingConfig from "@/models/NumberingConfig";
import { getAuthUser } from "@/lib/auth";
import { withCors, handlePreflight } from "@/lib/cors";
import { logActivity } from "@/lib/activity";
import { ALLOWED_TOKENS } from "@/lib/numbering";

function unauth() { return withCors(Response.json({ error: "Unauthorized" }, { status: 401 })); }
function forbidden() { return withCors(Response.json({ error: "Forbidden" }, { status: 403 })); }
function err(e)   { console.error(e); return withCors(Response.json({ error: "Something went wrong." }, { status: 500 })); }

const ENTITY_TYPES = ["quote", "invoice", "order", "purchaseOrder", "delivery", "client", "ticket"];

/** PATCH /api/settings/numbering/:entityType */
export async function PATCH(request, { params }) {
  try {
    const auth = getAuthUser(request);
    if (!auth) return unauth();
    if (auth.role !== "admin") return forbidden();
    const { entityType } = await params;
    if (!ENTITY_TYPES.includes(entityType)) {
      return withCors(Response.json({ error: "Invalid entity type" }, { status: 400 }));
    }
    const body = await request.json();
    const { prefix, format, padding, resetFrequency } = body;

    if (prefix !== undefined && typeof prefix !== "string") {
      return withCors(Response.json({ error: "prefix must be a string" }, { status: 400 }));
    }
    if (format !== undefined) {
      if (typeof format !== "string") {
        return withCors(Response.json({ error: "format must be a string" }, { status: 400 }));
      }
      const tokens = format.match(/\{[A-Z]+\}/g) || [];
      const invalid = tokens.filter((t) => !ALLOWED_TOKENS.includes(t));
      if (invalid.length > 0) {
        return withCors(Response.json({ error: `Invalid format tokens: ${invalid.join(", ")}. Allowed: ${ALLOWED_TOKENS.join(", ")}` }, { status: 400 }));
      }
    }
    if (padding !== undefined && (typeof padding !== "number" || padding < 1 || padding > 10)) {
      return withCors(Response.json({ error: "padding must be a number between 1 and 10" }, { status: 400 }));
    }
    if (resetFrequency !== undefined && !["never", "yearly", "monthly"].includes(resetFrequency)) {
      return withCors(Response.json({ error: "resetFrequency must be never, yearly, or monthly" }, { status: 400 }));
    }

    await dbConnect();
    const config = await NumberingConfig.findOne({ entityType });
    if (!config) return withCors(Response.json({ error: "Config not found" }, { status: 404 }));

    const updates = {};
    if (prefix !== undefined) updates.prefix = prefix.trim();
    if (format !== undefined) updates.format = format.trim();
    if (padding !== undefined) updates.padding = padding;
    if (resetFrequency !== undefined) updates.resetFrequency = resetFrequency;

    const updated = await NumberingConfig.findByIdAndUpdate(
      config._id,
      { $set: updates },
      { new: true }
    ).lean();

    logActivity({ auth, request, action: "settings_update", entity: null,
      entityId: config._id, entityLabel: `Updated numbering config for ${entityType}`,
      meta: { entityType, updates } });

    return withCors(Response.json({ config: updated }));
  } catch (e) { return err(e); }
}

export async function OPTIONS() { return handlePreflight(); }
