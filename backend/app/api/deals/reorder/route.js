import dbConnect from "@/lib/mongodb";
import Deal from "@/models/Deal";
import { getAuthUser } from "@/lib/auth";
import { withCors, handlePreflight } from "@/lib/cors";
import { logActivity } from "@/lib/activity";

/**
 * PATCH /api/deals/reorder
 * Body: { updates: [{ id, stage, order }] }
 * Used by the Kanban board after a drag-and-drop move.
 */
export async function PATCH(request) {
  try {
    const auth = getAuthUser(request);
    if (!auth) return withCors(Response.json({ error: "Unauthorized" }, { status: 401 }));
    const { updates } = await request.json();
    if (!Array.isArray(updates) || !updates.length) {
      return withCors(Response.json({ error: "updates array required" }, { status: 400 }));
    }
    await dbConnect();
    await Promise.all(
      updates.map(({ id, stage, order }) => Deal.findByIdAndUpdate(id, { stage, order }))
    );
    // Log a stage change for each moved deal
    for (const { id, stage } of updates) {
      const deal = await Deal.findById(id).select("title").lean();
      logActivity({
        auth, request, action: "deal_stage_change", entity: "deal",
        entityId: id, entityLabel: deal?.title ?? id,
        meta: { stage },
      });
    }
    return withCors(Response.json({ ok: true }));
  } catch (e) {
    console.error(e);
    return withCors(Response.json({ error: "Something went wrong." }, { status: 500 }));
  }
}

export async function OPTIONS() { return handlePreflight(); }
