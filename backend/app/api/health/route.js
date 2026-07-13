import { withCors, handlePreflight } from "@/lib/cors";

export async function GET() {
  return withCors(Response.json({ status: "ok" }));
}

export async function OPTIONS() {
  return handlePreflight();
}
