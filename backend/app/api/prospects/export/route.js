import dbConnect from "@/lib/mongodb";
import Prospect from "@/models/Prospect";
import { getAuthUser } from "@/lib/auth";
import { withCors, handlePreflight } from "@/lib/cors";

const CSV_FIELDS = [
  "firstName", "lastName", "company", "jobTitle",
  "email", "phone", "address", "status", "tags", "source", "createdAt",
];

function escapeCell(val) {
  const str = val == null ? "" : String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(rows) {
  const header = CSV_FIELDS.join(",");
  const lines = rows.map((r) =>
    CSV_FIELDS.map((f) => {
      const val = f === "tags" ? (r.tags || []).join("|") : r[f];
      return escapeCell(val);
    }).join(",")
  );
  return [header, ...lines].join("\r\n");
}

/** GET /api/prospects/export?status=&tag=&owner= */
export async function GET(request) {
  const auth = getAuthUser(request);
  if (!auth) {
    return withCors(Response.json({ error: "Unauthorized" }, { status: 401 }));
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const tag = searchParams.get("tag");
  const owner = searchParams.get("owner");

  await dbConnect();

  const filter = {};
  if (status) filter.status = status;
  if (tag) filter.tags = tag;
  if (owner) filter.owner = owner;

  const prospects = await Prospect.find(filter).sort({ createdAt: -1 }).lean();
  const csv = toCsv(prospects);

  const headers = new Headers({
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="prospects-${Date.now()}.csv"`,
  });

  // Merge CORS headers manually so we can set a non-JSON content type
  const { corsHeaders } = await import("@/lib/cors");
  Object.entries(corsHeaders()).forEach(([k, v]) => headers.set(k, v));

  return new Response(csv, { status: 200, headers });
}

export async function OPTIONS() {
  return handlePreflight();
}
