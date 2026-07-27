import dbConnect from "@/lib/mongodb";
import SavedSearch from "@/models/SavedSearch";
import { getAuthUser } from "@/lib/auth";
import { withCors, handlePreflight } from "@/lib/cors";
import { logActivity } from "@/lib/activity";

function unauth() { return withCors(Response.json({ error: "Unauthorized" }, { status: 401 })); }
function err(e)   { console.error(e); return withCors(Response.json({ error: "Something went wrong." }, { status: 500 })); }

/** DELETE /api/saved-searches/:id */
export async function DELETE(request, { params }) {
  try {
    const auth = getAuthUser(request);
    if (!auth) return unauth();
    const { id } = await params;
    await dbConnect();
    const search = await SavedSearch.findByIdAndDelete(id);
    if (!search) return withCors(Response.json({ error: "Not found" }, { status: 404 }));
    logActivity({ auth, request, action: "saved_search_delete", entity: null,
      entityId: id, entityLabel: `Deleted saved search: "${search.query}"` });
    return withCors(Response.json({ message: "Deleted." }));
  } catch (e) { return err(e); }
}

export async function OPTIONS() { return handlePreflight(); }
