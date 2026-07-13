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

/** PATCH /api/admin/users/[id] — toggle isActive or update role */
export async function PATCH(request, { params }) {
  const auth = getAuthUser(request);
  if (!auth) return unauthorized();
  if (auth.role !== "admin") return forbidden();

  const { id } = await params;
  const body = await request.json();

  // Prevent admin from deactivating their own account
  if (auth.sub === id && body.isActive === false) {
    return withCors(
      Response.json({ error: "You cannot deactivate your own account." }, { status: 400 })
    );
  }

  await dbConnect();

  const allowed = {};
  if (typeof body.isActive === "boolean") allowed.isActive = body.isActive;
  if (body.role === "admin" || body.role === "commercial") allowed.role = body.role;
  if (typeof body.name === "string" && body.name.trim()) allowed.name = body.name.trim();
  if (typeof body.email === "string" && body.email.trim()) {
    const newEmail = body.email.trim().toLowerCase();
    // Check email isn't already taken by another user
    const conflict = await User.findOne({ email: newEmail, _id: { $ne: id } });
    if (conflict) {
      return withCors(
        Response.json({ error: "Email already in use by another account." }, { status: 409 })
      );
    }
    allowed.email = newEmail;
  }

  const user = await User.findByIdAndUpdate(id, allowed, { new: true }).select("-passwordHash");

  if (!user) {
    return withCors(Response.json({ error: "User not found" }, { status: 404 }));
  }

  return withCors(Response.json({ user }));
}

/** DELETE /api/admin/users/[id] — remove a user */
export async function DELETE(request, { params }) {
  const auth = getAuthUser(request);
  if (!auth) return unauthorized();
  if (auth.role !== "admin") return forbidden();

  const { id } = await params;

  if (auth.sub === id) {
    return withCors(
      Response.json({ error: "You cannot delete your own account." }, { status: 400 })
    );
  }

  await dbConnect();

  const user = await User.findByIdAndDelete(id);
  if (!user) {
    return withCors(Response.json({ error: "User not found" }, { status: 404 }));
  }

  return withCors(Response.json({ message: "User deleted." }));
}

export async function OPTIONS() {
  return handlePreflight();
}
