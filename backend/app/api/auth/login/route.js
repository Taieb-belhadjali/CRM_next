import bcrypt from "bcryptjs";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { signToken } from "@/lib/auth";
import { withCors, handlePreflight } from "@/lib/cors";
import { logActivity } from "@/lib/activity";

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return withCors(
        Response.json({ error: "email and password are required" }, { status: 400 })
      );
    }

    await dbConnect();

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user || !user.isActive || !(await bcrypt.compare(password, user.passwordHash))) {
      // Log failed attempt — no auth object since we don't know the user
      logActivity({
        auth: user ? { sub: user._id, email: user.email, role: user.role } : null,
        request,
        action: "login_failed",
        meta: { email: email.toLowerCase() },
      });
      return withCors(Response.json({ error: "Invalid credentials" }, { status: 401 }));
    }

    const token = signToken(user);

    logActivity({
      auth: { sub: user._id, email: user.email, role: user.role },
      request,
      action: "login",
    });

    return withCors(
      Response.json({
        token,
        user: { id: user._id, name: user.name, email: user.email, role: user.role },
      })
    );
  } catch (err) {
    return withCors(Response.json({ error: "Something went wrong" }, { status: 500 }));
  }
}

export async function OPTIONS() {
  return handlePreflight();
}
