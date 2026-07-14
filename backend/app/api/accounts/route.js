import dbConnect from "@/lib/mongodb";
import Account from "@/models/Account";
import { getAuthUser } from "@/lib/auth";
import { withCors, handlePreflight } from "@/lib/cors";

function unauth() {
  return withCors(Response.json({ error: "Unauthorized" }, { status: 401 }));
}

/** GET /api/accounts?search=&page=&limit=&status= */
export async function GET(request) {
  const auth = getAuthUser(request);
  if (!auth) return unauth();

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, parseInt(searchParams.get("limit") || "25", 10));
  const status = searchParams.get("status");

  await dbConnect();

  const filter = {};
  if (search) {
    const re = new RegExp(search, "i");
    filter.$or = [{ name: re }, { sector: re }];
  }
  if (status) filter.status = status;

  const [accounts, total] = await Promise.all([
    Account.find(filter)
      .populate("owner", "name email")
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Account.countDocuments(filter),
  ]);

  return withCors(Response.json({ accounts, total, page, limit }));
}

/** POST /api/accounts */
export async function POST(request) {
  const auth = getAuthUser(request);
  if (!auth) return unauth();

  const body = await request.json();
  const { name, siret, sector, size, estimatedRevenue, status, address } = body;

  if (!name?.trim()) {
    return withCors(Response.json({ error: "name is required" }, { status: 400 }));
  }

  await dbConnect();

  const account = await Account.create({
    name: name.trim(),
    siret: siret?.trim(),
    sector: sector?.trim(),
    size: size || undefined,
    estimatedRevenue: estimatedRevenue || undefined,
    status: status || "active",
    address: address?.trim(),
    owner: auth.sub,
  });

  const populated = await account.populate("owner", "name email");
  return withCors(Response.json({ account: populated }, { status: 201 }));
}

export async function OPTIONS() {
  return handlePreflight();
}
