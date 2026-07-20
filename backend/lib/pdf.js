import PdfPrinter from "pdfmake";

// pdfmake requires font descriptors — use built-in Roboto via vfs
// We use a minimal font setup with standard PDF fonts to avoid bundling font files
const fonts = {
  Helvetica: {
    normal:      "Helvetica",
    bold:        "Helvetica-Bold",
    italics:     "Helvetica-Oblique",
    bolditalics: "Helvetica-BoldOblique",
  },
};

const printer = new PdfPrinter(fonts);

function fmt(n) {
  return `€${(n ?? 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR");
}

function statusColour(status) {
  const map = {
    draft:     "#a1a1aa",
    sent:      "#3b82f6",
    accepted:  "#22c55e",
    rejected:  "#ef4444",
    unpaid:    "#f59e0b",
    partial:   "#8b5cf6",
    paid:      "#22c55e",
    cancelled: "#a1a1aa",
  };
  return map[status] ?? "#a1a1aa";
}

/**
 * Build a pdfmake docDefinition for a quote or invoice.
 * @param {object} doc - populated Quote or Invoice document
 * @param {"quote"|"invoice"} type
 */
export function buildDocDefinition(doc, type) {
  const isQuote = type === "quote";
  const title   = isQuote ? "DEVIS" : "FACTURE";
  const refLabel = isQuote ? "N° Devis" : "N° Facture";

  const lineRows = (doc.lineItems ?? []).map((li) => [
    { text: li.description, style: "tableCell" },
    { text: String(li.quantity), style: "tableCell", alignment: "center" },
    { text: fmt(li.unitPrice), style: "tableCell", alignment: "right" },
    { text: `${li.taxRate ?? 0}%`, style: "tableCell", alignment: "center" },
    { text: fmt(li.total), style: "tableCell", alignment: "right", bold: true },
  ]);

  const relatedName =
    doc.account?.name ??
    (doc.contact ? `${doc.contact.firstName} ${doc.contact.lastName}` : null) ??
    "—";

  return {
    defaultStyle: { font: "Helvetica", fontSize: 10, color: "#18181b" },
    pageMargins: [40, 40, 40, 60],
    footer: (page, pages) => ({
      text: `${page} / ${pages}`,
      alignment: "center",
      fontSize: 8,
      color: "#a1a1aa",
      margin: [0, 10, 0, 0],
    }),
    content: [
      // ── Header ──
      {
        columns: [
          { text: "PulseCRM", style: "brand", width: "*" },
          {
            stack: [
              { text: title, style: "docTitle" },
              {
                columns: [
                  { text: refLabel, style: "labelSmall", width: 80 },
                  { text: doc.number ?? "—", style: "valueSmall" },
                ],
                margin: [0, 2, 0, 0],
              },
              {
                columns: [
                  { text: "Date", style: "labelSmall", width: 80 },
                  { text: fmtDate(doc.issueDate), style: "valueSmall" },
                ],
              },
              isQuote
                ? {
                    columns: [
                      { text: "Valide jusqu'au", style: "labelSmall", width: 80 },
                      { text: fmtDate(doc.validUntil), style: "valueSmall" },
                    ],
                  }
                : {
                    columns: [
                      { text: "Échéance", style: "labelSmall", width: 80 },
                      { text: fmtDate(doc.dueDate), style: "valueSmall" },
                    ],
                  },
              {
                text: doc.status?.toUpperCase() ?? "",
                color: statusColour(doc.status),
                bold: true,
                fontSize: 9,
                margin: [0, 6, 0, 0],
              },
            ],
            width: "auto",
            alignment: "right",
          },
        ],
        margin: [0, 0, 0, 20],
      },
      // ── Divider ──
      { canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: "#e4e4e7" }], margin: [0, 0, 0, 16] },

      // ── Client / Object ──
      {
        columns: [
          {
            stack: [
              { text: "CLIENT", style: "sectionLabel" },
              { text: relatedName, bold: true, fontSize: 11, margin: [0, 4, 0, 2] },
              doc.contact?.email ? { text: doc.contact.email, style: "meta" } : {},
              doc.deal?.title    ? { text: `Deal : ${doc.deal.title}`, style: "meta" } : {},
            ],
            width: "*",
          },
          {
            stack: [
              { text: "OBJET", style: "sectionLabel" },
              { text: doc.title, bold: true, fontSize: 11, margin: [0, 4, 0, 0] },
            ],
            width: "*",
            alignment: "right",
          },
        ],
        margin: [0, 0, 0, 20],
      },

      // ── Line items table ──
      { text: "PRESTATIONS", style: "sectionLabel", margin: [0, 0, 0, 6] },
      {
        table: {
          headerRows: 1,
          widths: ["*", 50, 70, 50, 70],
          body: [
            [
              { text: "Description",  style: "tableHeader" },
              { text: "Qté",          style: "tableHeader", alignment: "center" },
              { text: "P.U. HT",      style: "tableHeader", alignment: "right" },
              { text: "TVA",          style: "tableHeader", alignment: "center" },
              { text: "Total TTC",    style: "tableHeader", alignment: "right" },
            ],
            ...(lineRows.length
              ? lineRows
              : [[{ text: "Aucune ligne", colSpan: 5, alignment: "center", color: "#a1a1aa", italics: true }, {}, {}, {}, {}]]),
          ],
        },
        layout: {
          hLineWidth: (i, node) => (i === 0 || i === 1 || i === node.table.body.length ? 1 : 0.5),
          vLineWidth: () => 0,
          hLineColor: () => "#e4e4e7",
          paddingTop:    () => 6,
          paddingBottom: () => 6,
          paddingLeft:   () => 4,
          paddingRight:  () => 4,
          fillColor: (i) => (i === 0 ? "#f4f4f5" : i % 2 === 0 ? "#fafafa" : null),
        },
        margin: [0, 0, 0, 16],
      },

      // ── Totals ──
      {
        columns: [
          { width: "*", text: "" },
          {
            width: 220,
            table: {
              widths: ["*", 90],
              body: [
                [{ text: "Sous-total HT", style: "totalLabel" }, { text: fmt(doc.subtotal), alignment: "right", style: "totalValue" }],
                [{ text: "TVA",           style: "totalLabel" }, { text: fmt(doc.taxTotal),  alignment: "right", style: "totalValue" }],
                [{ text: "TOTAL TTC",     style: "totalLabelBold" }, { text: fmt(doc.grandTotal), alignment: "right", style: "totalValueBold" }],
                ...(!isQuote && doc.paidAmount
                  ? [
                      [{ text: "Payé",         style: "totalLabel",     color: "#22c55e" }, { text: fmt(doc.paidAmount), alignment: "right", style: "totalValue", color: "#22c55e" }],
                      [{ text: "Reste dû",     style: "totalLabelBold", color: "#ef4444" }, { text: fmt(doc.grandTotal - doc.paidAmount), alignment: "right", style: "totalValueBold", color: "#ef4444" }],
                    ]
                  : []),
              ],
            },
            layout: {
              hLineWidth: (i, node) => (i === 0 || i === node.table.body.length ? 1 : 0.5),
              vLineWidth: () => 0,
              hLineColor: () => "#e4e4e7",
              paddingTop:    () => 5,
              paddingBottom: () => 5,
            },
          },
        ],
        margin: [0, 0, 0, 20],
      },

      // ── Notes / Terms / Payment info ──
      ...(doc.notes ? [
        { text: "NOTES", style: "sectionLabel", margin: [0, 0, 0, 4] },
        { text: doc.notes, style: "meta", margin: [0, 0, 0, 12] },
      ] : []),
      ...(doc.terms ? [
        { text: "CONDITIONS", style: "sectionLabel", margin: [0, 0, 0, 4] },
        { text: doc.terms, style: "meta", margin: [0, 0, 0, 12] },
      ] : []),
      ...(!isQuote && doc.paymentInfo ? [
        { text: "COORDONNÉES BANCAIRES", style: "sectionLabel", margin: [0, 0, 0, 4] },
        { text: doc.paymentInfo, style: "meta" },
      ] : []),
    ],
    styles: {
      brand:          { fontSize: 20, bold: true, color: "#3b82f6" },
      docTitle:       { fontSize: 18, bold: true, color: "#18181b", alignment: "right" },
      sectionLabel:   { fontSize: 8, bold: true, color: "#71717a", letterSpacing: 1 },
      labelSmall:     { fontSize: 9, color: "#71717a" },
      valueSmall:     { fontSize: 9 },
      meta:           { fontSize: 9, color: "#71717a" },
      tableHeader:    { fontSize: 9, bold: true, color: "#3f3f46" },
      tableCell:      { fontSize: 9 },
      totalLabel:     { fontSize: 9, color: "#71717a" },
      totalLabelBold: { fontSize: 10, bold: true },
      totalValue:     { fontSize: 9 },
      totalValueBold: { fontSize: 11, bold: true },
    },
  };
}

/**
 * Generate a PDF buffer from a docDefinition.
 * Returns a Promise<Buffer>.
 */
export function generatePdf(docDefinition) {
  return new Promise((resolve, reject) => {
    const doc = printer.createPdfKitDocument(docDefinition);
    const chunks = [];
    doc.on("data",  (chunk) => chunks.push(chunk));
    doc.on("end",   () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}
