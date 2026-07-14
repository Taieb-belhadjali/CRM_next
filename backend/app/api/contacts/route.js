import dbConnect from "@/lib/mongodb";
import Contact from "@/models/Contact";
import { getAuthUser } from "@/lib/auth";
import { withCors, handlePreflight } from "@/lib/cors";

function unauth() {
  return withCors(Response.json({ error: "Unauthorized" }, { status: 401 }));
}

/** GET /api/contacts?search=&page=&limit=&account= */
export async function GET(request) {
  const auth = getAuthUser(request);
  if (!auth) return unauth();

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, parseInt(searchParams.get("limit") || "25", 10));
  const accountId = searchParams.get("account");

  await dbConnect();

  const filter = {};
  if (search) {
    const re = new RegExp(search, "i");
    filter.$or = [{ firstName: re }, { lastName: re }, { email: re }, { company: re }];
  }
  if (accountId) filter.account = accountId;

  const [contacts, total] = await Promise.all([
    Contact.find(filter)
      .populate("account", "name")
      .populate("owner", "name email")
      .sort({ lastName: 1, firstName: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Contact.countDocuments(filter),
  ]);

  return withCors(Response.json({ contacts, total, page, limit }));
}

/** POST /api/contacts */
export async function POST(request) {
  const auth = getAuthUser(request);
  if (!auth) return unauth();

  const body = await request.json();
  const { firstName, lastName, jobTitle, email, phone, address, account } = body;

  if (!firstName || !lastName) {
    return withCors(
      Response.json({ error: "firstName and lastName are required" }, { status: 400 })
    );
  }

  await dbConnect();

  const contact = await Contact.create({
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    jobTitle: jobTitle?.trim(),
    email: email?.trim().toLowerCase(),
    phone: phone?.trim(),
    address: address?.trim(),
    account: account || undefined,
    owner: auth.sub,
  });

  const populated = await contact.populate([
    { path: "account", select: "name" },
    { path: "owner", select: "name email" },
  ]);

  return withCors(Response.json({ contact: populated }, { status: 201 }));
}

export async function OPTIONS() {
  return handlePreflight();
}
