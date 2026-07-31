import dbConnect from "@/lib/mongodb";
import GoogleOAuthToken from "@/models/GoogleOAuthToken";
import { getAuthUser } from "@/lib/auth";
import { withCors, handlePreflight } from "@/lib/cors";
import { createGoogleMeetEventWithTokens } from "@/lib/googleCalendarOAuth";

function unauth() { return withCors(Response.json({ error: "Unauthorized" }, { status: 401 })); }

export async function POST(request) {
  try {
    const auth = getAuthUser(request);
    if (!auth) return unauth();

    const body = await request.json();
    const { title, scheduledAt, durationMinutes } = body;

    if (!title?.trim() || !scheduledAt) {
      return withCors(Response.json({ error: "title and scheduledAt are required" }, { status: 400 }));
    }

    await dbConnect();
    const tokenRecord = await GoogleOAuthToken.findOne({ userId: auth.sub });
    if (!tokenRecord) {
      return withCors(Response.json({ error: "Google Calendar not connected. Please connect your Google account first." }, { status: 400 }));
    }

    const start = new Date(scheduledAt);
    const end = new Date(start.getTime() + ((durationMinutes || 60) * 60 * 1000));

    const result = await createGoogleMeetEventWithTokens(
      {
        accessToken: tokenRecord.accessToken,
        refreshToken: tokenRecord.refreshToken,
        expiresAt: tokenRecord.expiresAt,
      },
      {
        summary: title.trim(),
        description: "Auto-generated meeting from CRM",
        start: start.toISOString(),
        end: end.toISOString(),
      }
    );

    return withCors(Response.json({ meetLink: result.meetLink, eventId: result.eventId, htmlLink: result.htmlLink }));
  } catch (e) {
    console.error("Failed to generate Google Meet link:", e);
    return withCors(Response.json({ error: "Something went wrong." }, { status: 500 }));
  }
}

export async function OPTIONS() { return handlePreflight(); }
