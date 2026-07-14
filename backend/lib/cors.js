const ALLOWED_ORIGIN = process.env.FRONTEND_URL || "http://localhost:5173";
const IS_DEV = process.env.NODE_ENV !== "production";

// In dev, use a wildcard so any localhost port works without changing env vars.
// In production, restrict to the configured FRONTEND_URL.
function getAllowedOrigin() {
  return IS_DEV ? "*" : ALLOWED_ORIGIN;
}

export function corsHeaders() {
  const origin = getAllowedOrigin();
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Logout",
    // Cannot use credentials with wildcard origin — only needed in production
    ...(IS_DEV ? {} : { "Access-Control-Allow-Credentials": "true" }),
  };
}

export function withCors(response) {
  const headers = corsHeaders();
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

export function handlePreflight(request) {
  return new Response(null, { status: 204, headers: corsHeaders() });
}
