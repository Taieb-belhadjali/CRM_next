import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { getAuthUser } from "@/lib/auth";
import { withCors, handlePreflight } from "@/lib/cors";
import { logActivity } from "@/lib/activity";

function unauth() { return withCors(Response.json({ error: "Unauthorized" }, { status: 401 })); }
function err(e)   { console.error(e); return withCors(Response.json({ error: "Something went wrong." }, { status: 500 })); }

/** GET /api/settings */
export async function GET(request) {
  try {
    const auth = getAuthUser(request);
    if (!auth) return unauth();
    await dbConnect();
    const user = await User.findById(auth.sub).select("timezone language");
    if (!user) return withCors(Response.json({ error: "User not found" }, { status: 404 }));
    return withCors(Response.json({ timezone: user.timezone, language: user.language }));
  } catch (e) { return err(e); }
}

/** PATCH /api/settings */
export async function PATCH(request) {
  try {
    const auth = getAuthUser(request);
    if (!auth) return unauth();
    const body = await request.json();
    const { timezone, language } = body;
    await dbConnect();
    const user = await User.findById(auth.sub);
    if (!user) return withCors(Response.json({ error: "User not found" }, { status: 404 }));
    if (timezone !== undefined) user.timezone = timezone || "UTC";
    if (language !== undefined) user.language = language || "en";
    await user.save();
    logActivity({ auth, request, action: "settings_update", entity: null,
      entityId: auth.sub, entityLabel: "Updated settings", meta: { timezone: user.timezone, language: user.language } });
    return withCors(Response.json({ timezone: user.timezone, language: user.language }));
  } catch (e) { return err(e); }
}

export async function OPTIONS() { return handlePreflight(); }
