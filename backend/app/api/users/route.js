import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { getAuthUser } from "@/lib/auth";
import { withCors, handlePreflight } from "@/lib/cors";

function unauth() { return withCors(Response.json({ error: "Unauthorized" }, { status: 401 })); }

/** GET /api/users — lightweight list for assignee/owner dropdowns */
export async function GET(request) {
  const auth = getAuthUser(request);
  if (!auth) return unauth();

  await dbConnect();
  const users = await User.find({})
    .select("-passwordHash")
    .sort({ name: 1 })
    .lean();
  return withCors(Response.json({ users }));
}

export async function OPTIONS() { return handlePreflight(); }
