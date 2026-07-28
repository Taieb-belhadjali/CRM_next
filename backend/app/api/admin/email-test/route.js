import { getAuthUser } from "@/lib/auth";
import { withCors, handlePreflight } from "@/lib/cors";

function unauthorized() { return withCors(Response.json({ error: "Unauthorized" }, { status: 401 })); }
function forbidden() { return withCors(Response.json({ error: "Forbidden" }, { status: 403 })); }

export async function GET(request) {
  try {
    const auth = getAuthUser(request);
    if (!auth) return unauthorized();
    if (auth.role !== "admin") return forbidden();

    const host = process.env.SMTP_HOST || null;
    const port = process.env.SMTP_PORT || null;
    const user = process.env.SMTP_USER || null;
    const from = process.env.SMTP_FROM || user;

    if (!host || !user) {
      return withCors(Response.json({ ok: false, error: "Missing SMTP env vars", missing: { host: !host, user: !user } }, { status: 400 }));
    }

    return withCors(Response.json({
      ok: true,
      config: { host, port, user, from },
      message: "SMTP configuration loaded. Use admin user creation to test actual delivery.",
    }));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong.";
    return withCors(Response.json({ ok: false, error: message }, { status: 500 }));
  }
}

export async function OPTIONS() { return handlePreflight(); }
