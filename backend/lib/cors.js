// Centralized CORS handling for the API-only backend.
// The frontend runs on a different origin (Vite dev server), so every
// API route needs these headers, and OPTIONS preflight requests must
// be answered directly.

const ALLOWED_ORIGIN = process.env.FRONTEND_URL || "http://localhost:5173";

export function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
}

export function withCors(response) {
  const headers = corsHeaders();
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

// Use in a route's OPTIONS export to answer preflight requests.
export function handlePreflight() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}
