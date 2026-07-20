import dbConnect from "@/lib/mongodb";
import Invoice from "@/models/Invoice";
import { getAuthUser } from "@/lib/auth";
import { withCors, handlePreflight } from "@/lib/cors";
import { generatePdf } from "@/lib/pdf";

/** GET /api/invoices/:id/pdf */
export async function GET(request, { params }) {
  try {
    const auth = getAuthUser(request);
    if (!auth) {
      return withCors(Response.json({ error: "Unauthorized" }, { status: 401 }));
    }
    const { id } = await params;
    await dbConnect();
    const invoice = await Invoice.findById(id).populate([
      { path: "contact", select: "firstName lastName email" },
      { path: "account", select: "name" },
      { path: "deal",    select: "title" },
      { path: "owner",   select: "name email" },
    ]);
    if (!invoice) {
      return withCors(Response.json({ error: "Invoice not found" }, { status: 404 }));
    }
    const buffer = await generatePdf(invoice.toObject(), "invoice");

    const res = new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${invoice.number}.pdf"`,
      },
    });
    return withCors(res);
  } catch (e) {
    console.error(e);
    return withCors(Response.json({ error: "PDF generation failed." }, { status: 500 }));
  }
}

export async function OPTIONS() { return handlePreflight(); }
