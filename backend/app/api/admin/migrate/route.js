import dbConnect from "@/lib/mongodb";
import Prospect from "@/models/Prospect";
import { getAuthUser } from "@/lib/auth";
import { withCors, handlePreflight } from "@/lib/cors";

/**
 * POST /api/admin/migrate
 * One-shot: removes malformed location objects (missing coordinates)
 * that break the 2dsphere index. Admin only.
 */
export async function POST(request) {
  const auth = getAuthUser(request);
  if (!auth) return withCors(Response.json({ error: "Unauthorized" }, { status: 401 }));
  if (auth.role !== "admin") return withCors(Response.json({ error: "Forbidden" }, { status: 403 }));

  await dbConnect();

  const result = await Prospect.updateMany(
    { location: { $exists: true }, "location.coordinates": { $exists: false } },
    { $unset: { location: "" } }
  );

  return withCors(Response.json({ fixed: result.modifiedCount }));
}

export async function OPTIONS() {
  return handlePreflight();
}
