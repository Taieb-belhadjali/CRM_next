import dbConnect from "@/lib/mongodb";
import Quote from "@/models/Quote";
import { getAuthUser } from "@/lib/auth";
import { corsHeaders, handlePreflight } from "@/lib/cors";
import { buildDocDefinition, generatePdf } from "@/lib/pdf";

/** GET /api/quotes/:id/pdf */
export async function GET(request, { params }) {
  try {
    const auth = getAuthUser(request);
    if (!auth) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { "Content-Type": "application/json", ...corsHeaders() },
      });
    }
    const { id } = await params;
    await dbConnect();
    const quote = await Quote.findById(id).populate([
      { path: "contact", select: "firstName lastName email" },
      { path: "account", select: "name" },
      { path: "deal",    select: "title" },
      { path: "owner",   select: "name email" },
    ]);
    if (!quote) {
      return new Response(JSON.stringify({ error: "Quote not found" }), {
        status: 404, headers: { "Content-Type": "application/json", ...corsHeaders() },
      });
    }
    const docDef = buildDocDefinition(quote.toObject(), "quote");
    const buffer = await generatePdf(docDef);

    const headers = {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${quote.number}.pdf"`,
      ...corsHeaders(),
    };
    return new Response(buffer, { status: 200, headers });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "PDF generation failed." }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders() },
    });
  }
}

export async function OPTIONS() { return handlePreflight(); }
