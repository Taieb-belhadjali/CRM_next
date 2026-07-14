import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { getAuthUser } from "@/lib/auth";
import { withCors, handlePreflight } from "@/lib/cors";
import { logActivity } from "@/lib/activity";

export async function GET(request) {
  const authUser = getAuthUser(request);

  if (!authUser) {
    return withCors(Response.json({ error: "Unauthorized" }, { status: 401 }));
  }

  await dbConnect();
  const user = await User.findById(authUser.sub).select("-passwordHash");

  if (!user) {
    return withCors(Response.json({ error: "User not found" }, { status: 404 }));
  }

  // Log logout when the client sends X-Logout: true header
  // The frontend sets this header when calling /me on logout
  if (request.headers.get("x-logout") === "true") {
    logActivity({ auth: authUser, request, action: "logout" });
  }

  return withCors(Response.json({ user }));
}

export async function OPTIONS() {
  return handlePreflight();
}
