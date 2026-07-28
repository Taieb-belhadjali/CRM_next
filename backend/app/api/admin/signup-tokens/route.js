import dbConnect from "@/lib/mongodb";
import SignupToken from "@/models/SignupToken";
import Account from "@/models/Account";
import User from "@/models/User";
import { getAuthUser } from "@/lib/auth";
import { withCors, handlePreflight } from "@/lib/cors";
import { logActivity } from "@/lib/activity";
import crypto from "crypto";

function unauth() { return withCors(Response.json({ error: "Unauthorized" }, { status: 401 })); }
function forbidden() { return withCors(Response.json({ error: "Forbidden" }, { status: 403 })); }

/** GET /api/admin/signup-tokens */
export async function GET(request) {
  try {
    const auth = getAuthUser(request);
    if (!auth) return unauth();
    if (auth.role !== "admin") return forbidden();

    await dbConnect();
    const tokens = await SignupToken.find({}).sort({ createdAt: -1 }).lean();
    return withCors(Response.json({ tokens }));
  } catch (err) {
    console.error("GET /api/admin/signup-tokens failed:", err);
    return withCors(Response.json({ error: "Something went wrong." }, { status: 500 }));
  }
}

/** POST /api/admin/signup-tokens */
export async function POST(request) {
  try {
    const auth = getAuthUser(request);
    if (!auth) return unauth();
    if (auth.role !== "admin") return forbidden();

    const body = await request.json();
    const { email, name, accountId } = body;

    if (!email || !name || !accountId) {
      return withCors(Response.json({ error: "email, name and accountId are required" }, { status: 400 }));
    }

    await dbConnect();
    const account = await Account.findById(accountId);
    if (!account) return withCors(Response.json({ error: "Account not found" }, { status: 404 }));

    const token = crypto.randomBytes(32).toString("hex");
    const signupToken = await SignupToken.create({
      token,
      email: email.toLowerCase(),
      name: name.trim(),
      account: accountId,
      createdBy: auth.sub,
    });

    logActivity({
      auth,
      request,
      action: "signup_token_create",
      entity: "signupToken",
      entityId: signupToken._id,
      entityLabel: email.toLowerCase(),
    });

    return withCors(Response.json({ token: signupToken.token, email: signupToken.email, name: signupToken.name, accountId }), { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong.";
    console.error("POST /api/admin/signup-tokens failed:", message, err);
    return withCors(Response.json({ error: message }, { status: 500 }));
  }
}

export async function OPTIONS() { return handlePreflight(); }
