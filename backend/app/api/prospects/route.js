import dbConnect from "@/lib/mongodb";
import Prospect from "@/models/Prospect";
import { getAuthUser } from "@/lib/auth";
import { withCors, handlePreflight } from "@/lib/cors";
import { logActivity } from "@/lib/activity";
import { generateReference } from "@/lib/numbering";

function unauth() {
  return withCors(Response.json({ error: "Unauthorized" }, { status: 401 }));
}

/** GET /api/prospects */
export async function GET(request) {
  try {
    const auth = getAuthUser(request);
    if (!auth) return unauth();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status");
    const tag = searchParams.get("tag");
    const owner = searchParams.get("owner");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, parseInt(searchParams.get("limit") || "25", 10));

    await dbConnect();

    const filter = {};
    if (search) {
      const re = new RegExp(search, "i");
      filter.$or = [{ firstName: re }, { lastName: re }, { email: re }, { company: re }];
    }
    if (status) filter.status = status;
    if (tag) filter.tags = tag;
    if (owner) filter.owner = owner;

    const [prospects, total] = await Promise.all([
      Prospect.find(filter)
        .populate("owner", "name email")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Prospect.countDocuments(filter),
    ]);

    const missing = prospects.filter((p) => !p.reference);
    if (missing.length > 0) {
      const refs = await Promise.all(missing.map(() => generateReference("client")));
      await Promise.all(missing.map((p, i) => Prospect.findByIdAndUpdate(p._id, { reference: refs[i] })));
      prospects.forEach((p) => {
        const mIdx = missing.findIndex((m) => String(m._id) === String(p._id));
        if (mIdx >= 0) p.reference = refs[mIdx];
      });
    }

    return withCors(Response.json({ prospects, total, page, limit }));
  } catch (err) {
    console.error("GET /api/prospects error:", err);
    return withCors(Response.json({ error: "Something went wrong." }, { status: 500 }));
  }
}

/** POST /api/prospects */
export async function POST(request) {
  try {
    const auth = getAuthUser(request);
    if (!auth) return unauth();

    const body = await request.json();
    const { firstName, lastName, company, jobTitle, email, phone, address, source, status, tags, location } = body;

    if (!firstName || !lastName) {
      return withCors(
        Response.json({ error: "firstName and lastName are required" }, { status: 400 })
      );
    }

    await dbConnect();

    const data = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      company: company?.trim() || undefined,
      jobTitle: jobTitle?.trim() || undefined,
      email: email?.trim().toLowerCase() || undefined,
      phone: phone?.trim() || undefined,
      address: address?.trim() || undefined,
      source: source || "manual",
      status: status || "new",
      tags: Array.isArray(tags) ? tags : [],
      owner: auth.sub,
    };

    if (
      location?.coordinates?.length === 2 &&
      typeof location.coordinates[0] === "number" &&
      typeof location.coordinates[1] === "number"
    ) {
      data.location = { type: "Point", coordinates: location.coordinates };
    }

    data.reference = await generateReference("client");
    const prospect = await Prospect.create(data);
    const populated = await prospect.populate("owner", "name email");

    logActivity({
      auth,
      request,
      action: "prospect_create",
      entity: "prospect",
      entityId: prospect._id,
      entityLabel: `${firstName.trim()} ${lastName.trim()}`,
    });

    return withCors(Response.json({ prospect: populated }, { status: 201 }));
  } catch (err) {
    console.error("POST /api/prospects error:", err);
    return withCors(Response.json({ error: "Something went wrong." }, { status: 500 }));
  }
}

export async function OPTIONS() {
  return handlePreflight();
}
