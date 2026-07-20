import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";

// ── Colour helpers ────────────────────────────────────────────────────────────

const C = {
  blue:    rgb(0.231, 0.510, 0.965),
  dark:    rgb(0.094, 0.094, 0.098),
  grey:    rgb(0.443, 0.443, 0.471),
  light:   rgb(0.957, 0.957, 0.961),
  white:   rgb(1, 1, 1),
  green:   rgb(0.133, 0.773, 0.369),
  red:     rgb(0.937, 0.267, 0.267),
  amber:   rgb(0.961, 0.620, 0.043),
  violet:  rgb(0.545, 0.361, 0.965),
  zinc:    rgb(0.631, 0.631, 0.659),
};

const STATUS_COLOUR = {
  draft:     C.zinc,  sent:     C.blue,
  accepted:  C.green, rejected: C.red,
  unpaid:    C.amber, partial:  C.violet,
  paid:      C.green, cancelled: C.zinc,
};

function fmt(n) {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(n ?? 0) + " \u20ac";
}

function fmtDate(d) {
  if (!d) return "\u2014";
  return new Date(d).toLocaleDateString("fr-FR");
}

// ── PDF builder ───────────────────────────────────────────────────────────────

/**
 * Generate a PDF buffer for a quote or invoice.
 * @param {object} doc  - populated Quote or Invoice plain object
 * @param {"quote"|"invoice"} type
 * @returns {Promise<Uint8Array>}
 */
export async function generatePdf(doc, type) {
  const isQuote   = type === "quote";
  const docTitle  = isQuote ? "DEVIS" : "FACTURE";
  const refLabel  = isQuote ? "N\u00b0 Devis" : "N\u00b0 Facture";
  const label2    = isQuote ? "Valide jusqu'au" : "\u00c9ch\u00e9ance";
  const date2     = isQuote ? fmtDate(doc.validUntil) : fmtDate(doc.dueDate);

  const pdfDoc = await PDFDocument.create();
  const page   = pdfDoc.addPage([595, 842]); // A4
  const { width, height } = page.getSize();

  const fontR  = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontB  = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const M = 50; // margin
  const W = width - M * 2; // usable width

  // cursor from top
  let y = height - M;

  // ── Brand ────────────────────────────────────────────────────────────────
  page.drawText("PulseCRM", { x: M, y, font: fontB, size: 22, color: C.blue });

  // Doc type top-right
  const dtW = fontB.widthOfTextAtSize(docTitle, 18);
  page.drawText(docTitle, { x: width - M - dtW, y, font: fontB, size: 18, color: C.dark });

  y -= 20;

  // Meta block right-aligned
  const metaLines = [
    { label: refLabel, value: doc.number ?? "\u2014" },
    { label: "Date",   value: fmtDate(doc.issueDate) },
    { label: label2,   value: date2 },
    { label: "Statut", value: (doc.status ?? "").toUpperCase(), colour: STATUS_COLOUR[doc.status] ?? C.zinc },
  ];
  for (const ml of metaLines) {
    const lW = fontR.widthOfTextAtSize(`${ml.label} : `, 8);
    const vW = fontB.widthOfTextAtSize(ml.value, 8);
    const totalW = lW + vW;
    page.drawText(`${ml.label} : `, { x: width - M - totalW, y, font: fontR, size: 8, color: C.grey });
    page.drawText(ml.value, { x: width - M - vW, y, font: fontB, size: 8, color: ml.colour ?? C.dark });
    y -= 12;
  }

  // ── Divider ───────────────────────────────────────────────────────────────
  y = height - M - 80;
  page.drawLine({ start: { x: M, y }, end: { x: width - M, y }, thickness: 0.5, color: C.light });
  y -= 16;

  // ── Client / Subject ─────────────────────────────────────────────────────
  const clientName =
    doc.account?.name ??
    (doc.contact ? `${doc.contact.firstName} ${doc.contact.lastName}` : null) ?? "\u2014";

  page.drawText("CLIENT", { x: M, y, font: fontB, size: 8, color: C.grey });
  page.drawText("OBJET",  { x: M + 260, y, font: fontB, size: 8, color: C.grey });
  y -= 14;
  page.drawText(clientName, { x: M, y, font: fontB, size: 11, color: C.dark });
  page.drawText(doc.title ?? "", { x: M + 260, y, font: fontB, size: 11, color: C.dark, maxWidth: W - 260 });
  if (doc.contact?.email) {
    y -= 14;
    page.drawText(doc.contact.email, { x: M, y, font: fontR, size: 9, color: C.grey });
  }

  // ── Table header ─────────────────────────────────────────────────────────
  y -= 30;
  const ROW_H = 20;
  const cols  = { desc: 0, qty: 230, prix: 290, tva: 370, total: 430 };
  const cW    = { desc: 220, qty: 55, prix: 75, tva: 55, total: W - 430 };

  // Header bg
  page.drawRectangle({ x: M, y: y - 4, width: W, height: ROW_H, color: C.light });
  const hdr = [
    ["Description", cols.desc,  cW.desc,  "left"],
    ["Qt\u00e9",    cols.qty,   cW.qty,   "center"],
    ["P.U. HT",     cols.prix,  cW.prix,  "right"],
    ["TVA",         cols.tva,   cW.tva,   "center"],
    ["Total TTC",   cols.total, cW.total, "right"],
  ];
  for (const [text, cx, cw, align] of hdr) {
    const tw = fontB.widthOfTextAtSize(text, 8);
    const rx = align === "right" ? M + cx + cw - tw : align === "center" ? M + cx + (cw - tw) / 2 : M + cx + 4;
    page.drawText(text, { x: rx, y: y + 2, font: fontB, size: 8, color: C.grey });
  }
  y -= ROW_H;

  // ── Rows ──────────────────────────────────────────────────────────────────
  const items = doc.lineItems ?? [];
  if (items.length === 0) {
    page.drawText("Aucune ligne de prestation.", { x: M + 4, y: y + 4, font: fontR, size: 9, color: C.grey });
    y -= ROW_H;
  } else {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const bg = i % 2 === 0 ? C.white : rgb(0.980, 0.980, 0.980);
      page.drawRectangle({ x: M, y: y - 4, width: W, height: ROW_H, color: bg });

      // Description — truncate to fit
      let desc = item.description ?? "";
      while (desc.length > 0 && fontR.widthOfTextAtSize(desc, 9) > cW.desc - 8) {
        desc = desc.slice(0, -1);
      }
      page.drawText(desc, { x: M + cols.desc + 4, y: y + 4, font: fontR, size: 9, color: C.dark });

      const drawCell = (text, cx, cw, align = "right", bold = false) => {
        const f  = bold ? fontB : fontR;
        const tw = f.widthOfTextAtSize(text, 9);
        const rx = align === "right" ? M + cx + cw - tw - 2 : align === "center" ? M + cx + (cw - tw) / 2 : M + cx + 4;
        page.drawText(text, { x: rx, y: y + 4, font: f, size: 9, color: C.dark });
      };

      drawCell(String(item.quantity ?? 0),  cols.qty,   cW.qty,   "center");
      drawCell(fmt(item.unitPrice),          cols.prix,  cW.prix,  "right");
      drawCell(`${item.taxRate ?? 0}%`,      cols.tva,   cW.tva,   "center");
      drawCell(fmt(item.total),              cols.total, cW.total, "right", true);

      // Row bottom border
      page.drawLine({ start: { x: M, y: y - 4 }, end: { x: width - M, y: y - 4 }, thickness: 0.3, color: C.light });
      y -= ROW_H;
    }
  }

  // Table bottom border
  page.drawLine({ start: { x: M, y: y + ROW_H - 4 }, end: { x: width - M, y: y + ROW_H - 4 }, thickness: 0.8, color: C.light });

  // ── Totals ────────────────────────────────────────────────────────────────
  y -= 10;
  const totX = M + W - 200;
  const totW = 200;

  const drawTotal = (label, value, bold = false, colour = C.dark) => {
    const f   = bold ? fontB : fontR;
    const sz  = bold ? 10 : 9;
    const lc  = bold ? C.dark : C.grey;
    page.drawText(label, { x: totX, y, font: bold ? fontB : fontR, size: sz, color: lc });
    const vw  = f.widthOfTextAtSize(value, sz);
    page.drawText(value, { x: totX + totW - vw, y, font: f, size: sz, color: colour });
    y -= bold ? 16 : 14;
  };

  drawTotal("Sous-total HT", fmt(doc.subtotal));
  drawTotal("TVA",           fmt(doc.taxTotal));
  page.drawLine({ start: { x: totX, y: y + 10 }, end: { x: width - M, y: y + 10 }, thickness: 0.5, color: C.light });
  y -= 4;
  drawTotal("TOTAL TTC", fmt(doc.grandTotal), true);

  if (!isQuote && doc.paidAmount > 0) {
    drawTotal("Pay\u00e9",     fmt(doc.paidAmount),                   false, C.green);
    drawTotal("Reste d\u00fb", fmt(doc.grandTotal - doc.paidAmount),  true,  C.red);
  }

  // ── Notes / Terms / Payment ───────────────────────────────────────────────
  y -= 16;

  const writeSection = (label, text) => {
    if (!text) return;
    page.drawText(label, { x: M, y, font: fontB, size: 8, color: C.grey });
    y -= 13;
    // Wrap text naively at ~90 chars per line
    const words = text.split(" ");
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (fontR.widthOfTextAtSize(test, 9) > W) {
        page.drawText(line, { x: M, y, font: fontR, size: 9, color: C.dark });
        y -= 12;
        line = word;
      } else {
        line = test;
      }
    }
    if (line) {
      page.drawText(line, { x: M, y, font: fontR, size: 9, color: C.dark });
      y -= 12;
    }
    y -= 8;
  };

  writeSection("NOTES",                doc.notes);
  writeSection("CONDITIONS",            doc.terms);
  if (!isQuote) writeSection("COORDONN\u00c9ES BANCAIRES", doc.paymentInfo);

  // ── Footer ────────────────────────────────────────────────────────────────
  const footer = "G\u00e9n\u00e9r\u00e9 par PulseCRM";
  const fw = fontR.widthOfTextAtSize(footer, 8);
  page.drawText(footer, { x: (width - fw) / 2, y: 30, font: fontR, size: 8, color: C.light });

  return pdfDoc.save();
}
