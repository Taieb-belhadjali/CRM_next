import bcrypt from "bcryptjs";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { getAuthUser } from "@/lib/auth";
import { withCors, handlePreflight } from "@/lib/cors";

function unauthorized(msg = "Unauthorized") {
  return withCors(Response.json({ error: msg }, { status: 401 }));
}

function forbidden(msg = "Forbidden") {
  return withCors(Response.json({ error: msg }, { status: 403 }));
}

/** GET /api/admin/users — list all users (admin only) */
export async function GET(request) {
  const auth = getAuthUser(request);
  if (!auth) return unauthorized();
  if (auth.role !== "admin") return forbidden();

  await dbConnect();
  const users = await User.find({}).select("-passwordHash").sort({ createdAt: -1 });

  return withCors(Response.json({ users }));
}

/** POST /api/admin/users — create/invite a new user (admin only) */
export async function POST(request) {
  const auth = getAuthUser(request);
  if (!auth) return unauthorized();
  if (auth.role !== "admin") return forbidden();

  const { name, email, password, role } = await request.json();

  if (!name || !email || !password) {
    return withCors(
      Response.json({ error: "name, email and password are required" }, { status: 400 })
    );
  }

  await dbConnect();

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return withCors(
      Response.json({ error: "Email already in use" }, { status: 409 })
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash,
    role: role === "admin" ? "admin" : "commercial",
  });

  return withCors(
    Response.json(
      { id: user._id, name: user.name, email: user.email, role: user.role },
      { status: 201 }
    )
  );
}

export async function OPTIONS() {
  return handlePreflight();
}
