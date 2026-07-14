import bcrypt from "bcryptjs";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { withCors, handlePreflight } from "@/lib/cors";
import { logActivity } from "@/lib/activity";

export async function POST(request) {
  try {
    const { name, email, password, role } = await request.json();

    if (!name || !email || !password) {
      return withCors(
        Response.json({ error: "name, email and password are required" }, { status: 400 })
      );
    }

    await dbConnect();

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return withCors(Response.json({ error: "Email already in use" }, { status: 409 }));
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: role === "admin" ? "admin" : "commercial",
    });

    logActivity({
      auth: { sub: user._id, email: user.email, role: user.role },
      request,
      action: "register",
      entity: "user",
      entityId: user._id,
      entityLabel: user.name,
    });

    return withCors(
      Response.json(
        { id: user._id, name: user.name, email: user.email, role: user.role },
        { status: 201 }
      )
    );
  } catch (err) {
    return withCors(Response.json({ error: "Something went wrong" }, { status: 500 }));
  }
}

export async function OPTIONS() {
  return handlePreflight();
}
