import dbConnect from "@/lib/mongodb";
import CalendarEvent from "@/models/CalendarEvent";
import GoogleOAuthToken from "@/models/GoogleOAuthToken";
import { getAuthUser } from "@/lib/auth";
import { withCors, handlePreflight } from "@/lib/cors";
import { google } from "googleapis";

function unauth() { return withCors(Response.json({ error: "Unauthorized" }, { status: 401 })); }
function notFound() { return withCors(Response.json({ error: "Not found" }, { status: 404 })); }
function err500(e) { console.error(e); return withCors(Response.json({ error: e?.message ?? "Sync failed" }, { status: 500 })); }

function toGoogleDate(d, allDay, end = false) {
  const dt = new Date(d);
  if (allDay) {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const day = String(dt.getDate()).padStart(2, "0");
    const dateStr = `${y}-${m}-${day}`;
    if (end) {
      const ed = new Date(dt);
      ed.setDate(ed.getDate() + 1);
      const ey = ed.getFullYear();
      const em = String(ed.getMonth() + 1).padStart(2, "0");
      const eday = String(ed.getDate()).padStart(2, "0");
      return { date: `${ey}-${em}-${eday}` };
    }
    return { date: dateStr };
  }
  return { dateTime: dt.toISOString() };
}

/** POST /api/calendar-events/:id/sync */
export async function POST(request, { params }) {
  try {
    const auth = getAuthUser(request);
    if (!auth) return unauth();
    await dbConnect();

    const { id } = await params;
    const ev = await CalendarEvent.findById(id);
    if (!ev) return notFound();
    if (ev.owner.toString() !== auth.sub) return withCors(Response.json({ error: "Forbidden" }, { status: 403 }));

    const tokenRecord = await GoogleOAuthToken.findOne({ userId: auth.sub });
    if (!tokenRecord) return withCors(Response.json({ error: "Google Calendar not connected" }, { status: 400 }));

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    oauth2Client.setCredentials({
      access_token: tokenRecord.accessToken,
      refresh_token: tokenRecord.refreshToken,
      expiry_date: tokenRecord.expiresAt ? new Date(tokenRecord.expiresAt).getTime() : undefined,
    });

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const event = {
      summary: ev.title,
      description: ev.description || ev.notes || undefined,
      start: toGoogleDate(new Date(ev.startAt), ev.allDay, false),
      end: toGoogleDate(new Date(ev.endAt || ev.startAt), ev.allDay, true),
    };

    if (ev.location) event.location = ev.location;

    const response = await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID || "primary",
      requestBody: event,
    });

    ev.googleEventId = response.data.id;
    ev.googleCalendarId = response.data.htmlLink || undefined;
    ev.googleSyncedAt = new Date();
    await ev.save();

    const populated = await ev.populate([
      { path: "owner", select: "name email" },
      { path: "sharedWith", select: "name email" },
    ]);

    return withCors(Response.json({
      event: populated.toObject ? populated.toObject() : populated,
      google: {
        eventId: response.data.id,
        htmlLink: response.data.htmlLink,
        hangoutLink: response.data.hangoutLink || null,
      },
    }));
  } catch (e) { return err500(e); }
}

export async function OPTIONS() { return handlePreflight(); }
