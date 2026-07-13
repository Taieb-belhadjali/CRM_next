import bcrypt from "bcryptjs";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { signToken } from "@/lib/auth";
import { withCors, handlePreflight } from "@/lib/cors";

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return withCors(
        Response.json(
          { error: "email and password are required" },
          { status: 400 }
        )
      );
    }

    await dbConnect();

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.isActive) {
      return withCors(
        Response.json({ error: "Invalid credentials" }, { status: 401 })
      );
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return withCors(
        Response.json({ error: "Invalid credentials" }, { status: 401 })
      );
    }

    const token = signToken(user);

    return withCors(
      Response.json({
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      })
    );
  } catch (err) {
    return withCors(
      Response.json({ error: "Something went wrong" }, { status: 500 })
    );
  }
}

export async function OPTIONS() {
  return handlePreflight();
}
