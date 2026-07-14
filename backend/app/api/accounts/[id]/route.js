import dbConnect from "@/lib/mongodb";
import Account from "@/models/Account";
import Contact from "@/models/Contact";
import { getAuthUser } from "@/lib/auth";
import { withCors, handlePreflight } from "@/lib/cors";

function unauth() {
  return withCors(Response.json({ error: "Unauthorized" }, { status: 401 }));
}

/** GET /api/accounts/:id  — includes linked contacts */
export async function GET(request, { params }) {
  const auth = getAuthUser(request);
  if (!auth) return unauth();

  const { id } = await params;
  await dbConnect();

  const [account, contacts] = await Promise.all([
    Account.findById(id).populate("owner", "name email"),
    Contact.find({ account: id }).select("firstName lastName jobTitle email phone").lean(),
  ]);

  if (!account) {
    return withCors(Response.json({ error: "Account not found" }, { status: 404 }));
  }

  return withCors(Response.json({ account, contacts }));
}

/** PATCH /api/accounts/:id */
export async function PATCH(request, { params }) {
  const auth = getAuthUser(request);
  if (!auth) return unauth();

  const { id } = await params;
  const body = await request.json();

  const allowed = {};
  const fields = ["name", "siret", "sector", "size", "estimatedRevenue", "status", "address"];
  for (const f of fields) {
    if (body[f] !== undefined) {
      allowed[f] = typeof body[f] === "string" ? body[f].trim() : body[f];
    }
  }

  await dbConnect();

  const account = await Account.findByIdAndUpdate(id, allowed, { new: true }).populate(
    "owner",
    "name email"
  );

  if (!account) {
    return withCors(Response.json({ error: "Account not found" }, { status: 404 }));
  }

  return withCors(Response.json({ account }));
}

/** DELETE /api/accounts/:id */
export async function DELETE(request, { params }) {
  const auth = getAuthUser(request);
  if (!auth) return unauth();

  const { id } = await params;
  await dbConnect();

  const account = await Account.findByIdAndDelete(id);
  if (!account) {
    return withCors(Response.json({ error: "Account not found" }, { status: 404 }));
  }

  // Unlink contacts that referenced this account
  await Contact.updateMany({ account: id }, { $unset: { account: "" } });

  return withCors(Response.json({ message: "Deleted." }));
}

export async function OPTIONS() {
  return handlePreflight();
}
