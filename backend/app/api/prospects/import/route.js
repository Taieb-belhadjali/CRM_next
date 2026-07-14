import dbConnect from "@/lib/mongodb";
import Prospect from "@/models/Prospect";
import { getAuthUser } from "@/lib/auth";
import { withCors, handlePreflight } from "@/lib/cors";

/**
 * POST /api/prospects/import
 * Body: { rows: Array<object> }  — parsed CSV rows from the frontend (papaparse)
 *
 * Expected row keys (all optional except firstName + lastName):
 *   firstName, lastName, company, jobTitle, email, phone, address,
 *   status, tags (comma-separated string), source
 */
export async function POST(request) {
  const auth = getAuthUser(request);
  if (!auth) {
    return withCors(Response.json({ error: "Unauthorized" }, { status: 401 }));
  }

  const { rows } = await request.json();

  if (!Array.isArray(rows) || rows.length === 0) {
    return withCors(
      Response.json({ error: "rows array is required and must not be empty" }, { status: 400 })
    );
  }

  await dbConnect();

  const valid = [];
  const errors = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r.firstName?.trim() || !r.lastName?.trim()) {
      errors.push({ row: i + 1, error: "firstName and lastName are required" });
      continue;
    }

    valid.push({
      firstName: r.firstName.trim(),
      lastName: r.lastName.trim(),
      company: r.company?.trim() || undefined,
      jobTitle: r.jobTitle?.trim() || undefined,
      email: r.email?.trim().toLowerCase() || undefined,
      phone: r.phone?.trim() || undefined,
      address: r.address?.trim() || undefined,
      status: ["new", "contacted", "qualified", "converted", "unqualified"].includes(r.status)
        ? r.status
        : "new",
      tags: r.tags
        ? r.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
      source: "import",
      owner: auth.sub,
    });
  }

  const inserted = await Prospect.insertMany(valid, { ordered: false });

  return withCors(
    Response.json({
      inserted: inserted.length,
      skipped: errors.length,
      errors,
    })
  );
}

export async function OPTIONS() {
  return handlePreflight();
}
