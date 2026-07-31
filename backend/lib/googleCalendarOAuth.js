import { google } from "googleapis";

const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
  GOOGLE_CALENDAR_ID,
} = process.env;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
  throw new Error("Missing Google OAuth env vars: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_REDIRECT_URI");
}

const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
);

export function getAuthorizationUrl() {
  const scopes = ["https://www.googleapis.com/auth/calendar"];
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: scopes,
  });
}

export async function exchangeCodeForTokens(code) {
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

export function getOAuthClient(accessToken, refreshToken, expiresAt) {
  const client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );

  client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
    expiry_date: expiresAt ? new Date(expiresAt).getTime() : undefined,
  });

  return client;
}

export async function createGoogleMeetEventWithTokens({ accessToken, refreshToken, expiresAt }, { summary, description, start, end }) {
  const auth = getOAuthClient(accessToken, refreshToken, expiresAt);
  const calendar = google.calendar({ version: "v3", auth });

  const event = {
    summary,
    description,
    start: { dateTime: start },
    end: { dateTime: end },
    conferenceData: {
      createRequest: { requestId: `meet-${Date.now()}` },
    },
  };

  const response = await calendar.events.insert({
    calendarId: GOOGLE_CALENDAR_ID || "primary",
    requestBody: event,
    conferenceDataVersion: 1,
  });

  const entryPoint = response.data.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video");
  const meetLink = entryPoint?.uri || response.data.hangoutLink || null;

  return {
    meetLink,
    eventId: response.data.id,
    htmlLink: response.data.htmlLink,
  };
}
