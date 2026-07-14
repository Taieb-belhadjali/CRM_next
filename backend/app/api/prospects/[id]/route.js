import dbConnect from "@/lib/mongodb";
import Prospect from "@/models/Prospect";
import { getAuthUser } from "@/lib/auth";
import { withCors, handlePreflight } from "@/lib/cors";

function unauth() {
  return withCors(Response.json({ error: "Unauthorized" }, { status: 401 }));
}

/** GET /api/prospects/:id */
export async function GET(request, { params }) {
  const auth = getAuthUser(request);
  if (!auth) return unauth();

  const { id } = await params;
  await dbConnect();

  const prospect = await Prospect.findById(id).populate("owner", "name email");
  if (!prospect) {
    return withCors(Response.json({ error: "Prospect not found" }, { status: 404 }));
  }

  return withCors(Response.json({ prospect }));
}

/** PATCH /api/prospects/:id */
export async function PATCH(request, { params }) {
  const auth = getAuthUser(request);
  if (!auth) return unauth();

  const { id } = await params;
  const body = await request.json();

  const allowed = {};
  const strFields = ["firstName", "lastName", "company", "jobTitle", "email", "phone", "address", "source", "status"];
  for (const f of strFields) {
    if (body[f] !== undefined) allowed[f] = body[f]?.trim?.() ?? body[f];
  }
  if (allowed.email) allowed.email = allowed.email.toLowerCase();
  if (Array.isArray(body.tags)) allowed.tags = body.tags;

  if (
    body.location?.coordinates?.length === 2 &&
    typeof body.location.coordinates[0] === "number" &&
    typeof body.location.coordinates[1] === "number"
  ) {
    allowed.location = { type: "Point", coordinates: body.location.coordinates };
  } else if (body.location === null) {
    allowed.location = undefined;
    allowed.$unset = { location: "" };
  }

  await dbConnect();

  const prospect = await Prospect.findByIdAndUpdate(id, allowed, { new: true }).populate(
    "owner",
    "name email"
  );

  if (!prospect) {
    return withCors(Response.json({ error: "Prospect not found" }, { status: 404 }));
  }

  return withCors(Response.json({ prospect }));
}

/** DELETE /api/prospects/:id */
export async function DELETE(request, { params }) {
  const auth = getAuthUser(request);
  if (!auth) return unauth();

  const { id } = await params;
  await dbConnect();

  const prospect = await Prospect.findByIdAndDelete(id);
  if (!prospect) {
    return withCors(Response.json({ error: "Prospect not found" }, { status: 404 }));
  }

  return withCors(Response.json({ message: "Deleted." }));
}

export async function OPTIONS() {
  return handlePreflight();
}
