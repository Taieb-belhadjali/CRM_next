import { google } from "googleapis";
import fs from "fs";
import path from "path";

const GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON_FILE = process.env.GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON_FILE;
const GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON = process.env.GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON;
const GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || "primary";

let calendarClient = null;

function loadServiceAccountJson() {
  if (GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON_FILE) {
    const resolved = path.resolve(GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON_FILE);
    if (!fs.existsSync(resolved)) {
      throw new Error(`Google service account file not found: ${resolved}`);
    }
    return JSON.parse(fs.readFileSync(resolved, "utf8"));
  }
  if (!GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON) {
    throw new Error("Missing Google service account config. Set GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON_FILE or GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON.");
  }
  return JSON.parse(GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON);
}

function getCalendarClient() {
  if (!calendarClient) {
    const auth = new google.auth.GoogleAuth({
      credentials: loadServiceAccountJson(),
      scopes: ["https://www.googleapis.com/auth/calendar"],
    });
    calendarClient = google.calendar({ version: "v3", auth });
  }
  return calendarClient;
}

export async function createGoogleMeetEvent({ summary, description, start, end, organizerEmail }) {
  const calendar = getCalendarClient();

  const event = {
    summary,
    description,
    start: { dateTime: start },
    end: { dateTime: end },
    attendees: organizerEmail ? [{ email: organizerEmail }] : undefined,
    conferenceData: {
      createRequest: { requestId: `meet-${Date.now()}` },
    },
  };

  const response = await calendar.events.insert({
    calendarId: GOOGLE_CALENDAR_ID,
    requestBody: event,
    conferenceDataVersion: 1,
  });

  console.log("[GOOGLE_MEET] Calendar response data:", JSON.stringify(response.data, null, 2));

  const entryPoint = response.data.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video");
  const meetLink = entryPoint?.uri || response.data.hangoutLink || null;

  return {
    meetLink,
    eventId: response.data.id,
    htmlLink: response.data.htmlLink,
  };
}
