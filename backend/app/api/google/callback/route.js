import { getAuthUser } from "@/lib/auth";
import { withCors, handlePreflight } from "@/lib/cors";
import GoogleOAuthToken from "@/models/GoogleOAuthToken";
import { exchangeCodeForTokens } from "@/lib/googleCalendarOAuth";

function unauthorized() { return withCors(Response.json({ error: "Unauthorized" }, { status: 401 })); }
function badRequest(message) { return withCors(Response.json({ error: message }, { status: 400 })); }

export async function POST(request) {
  try {
    const auth = getAuthUser(request);
    if (!auth) return unauthorized();

    const body = await request.json();
    const { code } = body;

    if (!code) {
      return badRequest("Missing authorization code");
    }

    const tokens = await exchangeCodeForTokens(code);

    await GoogleOAuthToken.findOneAndUpdate(
      { userId: auth.sub },
      {
        userId: auth.sub,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : new Date(Date.now() + 3600 * 1000),
        scope: tokens.scope || "https://www.googleapis.com/auth/calendar",
        tokenType: tokens.token_type || "Bearer",
      },
      { upsert: true }
    );

    return withCors(Response.json({ ok: true }));
  } catch (err) {
    console.error("Google OAuth callback failed:", err);
    return withCors(Response.json({ error: "Something went wrong." }, { status: 500 }));
  }
}

export async function OPTIONS() { return handlePreflight(); }
