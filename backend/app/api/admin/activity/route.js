import dbConnect from "@/lib/mongodb";
import ActivityLog from "@/models/ActivityLog";
import { getAuthUser } from "@/lib/auth";
import { withCors, handlePreflight } from "@/lib/cors";

/**
 * GET /api/admin/activity
 * Query params: page, limit, user, action, entity, search, dateFrom, dateTo
 * Admin only.
 */
export async function GET(request) {
  const auth = getAuthUser(request);
  if (!auth) return withCors(Response.json({ error: "Unauthorized" }, { status: 401 }));
  if (auth.role !== "admin") return withCors(Response.json({ error: "Forbidden" }, { status: 403 }));

  const { searchParams } = new URL(request.url);
  const page     = Math.max(1, parseInt(searchParams.get("page")  || "1",  10));
  const limit    = Math.min(100, parseInt(searchParams.get("limit") || "50", 10));
  const userId   = searchParams.get("user");
  const action   = searchParams.get("action");
  const entity   = searchParams.get("entity");
  const search   = searchParams.get("search") || "";
  const dateFrom = searchParams.get("dateFrom");
  const dateTo   = searchParams.get("dateTo");

  await dbConnect();

  const filter = {};
  if (userId) filter.user   = userId;
  if (action) filter.action = action;
  if (entity) filter.entity = entity;

  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
    if (dateTo)   filter.createdAt.$lte = new Date(dateTo);
  }

  if (search) {
    const re = new RegExp(search, "i");
    filter.$or = [
      { userName:    re },
      { userEmail:   re },
      { action:      re },
      { entity:      re },
      { entityLabel: re },
      { ip:          re },
      // Search inside meta values (stringified)
      { "meta.email": re },
      { "meta.stage": re },
    ];
  }

  const [logs, total] = await Promise.all([
    ActivityLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    ActivityLog.countDocuments(filter),
  ]);

  return withCors(Response.json({ logs, total, page, limit }));
}

export async function OPTIONS() {
  return handlePreflight();
}
