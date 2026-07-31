import { getAuthUser } from "@/lib/auth";
import { withCors, handlePreflight } from "@/lib/cors";
import GoogleOAuthToken from "@/models/GoogleOAuthToken";
import { getAuthorizationUrl } from "@/lib/googleCalendarOAuth";

function unauthorized() { return withCors(Response.json({ error: "Unauthorized" }, { status: 401 })); }

export async function GET(request) {
  const auth = getAuthUser(request);
  if (!auth) return unauthorized();

  const authUrl = getAuthorizationUrl();
  return withCors(Response.json({ authUrl }));
}

export async function OPTIONS() { return handlePreflight(); }
