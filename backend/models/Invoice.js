import mongoose from "mongoose";

const LineItemSchema = new mongoose.Schema(
  {
    description: { type: String, required: true, trim: true },
    quantity:    { type: Number, required: true, min: 0, default: 1 },
    unitPrice:   { type: Number, required: true, min: 0, default: 0 },
    taxRate:     { type: Number, default: 0, min: 0, max: 100 },
    subtotal:    { type: Number, default: 0 },
    taxAmount:   { type: Number, default: 0 },
    total:       { type: Number, default: 0 },
  },
  { _id: false }
);

const InvoiceSchema = new mongoose.Schema(
  {
    number:       { type: String, unique: true }, // e.g. INV-2026-0001
    title:        { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["draft", "sent", "unpaid", "partial", "paid", "cancelled"],
      default: "draft",
    },
    issueDate:    { type: Date, default: Date.now },
    dueDate:      { type: Date },
    paidDate:     { type: Date },
    paidAmount:   { type: Number, default: 0 },
    // Source quote (if converted)
    quoteId:      { type: mongoose.Schema.Types.ObjectId, ref: "Quote", default: null },
    // Relations
    deal:         { type: mongoose.Schema.Types.ObjectId, ref: "Deal" },
    contact:      { type: mongoose.Schema.Types.ObjectId, ref: "Contact" },
    account:      { type: mongoose.Schema.Types.ObjectId, ref: "Account" },
    owner:        { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    // Line items
    lineItems:    [LineItemSchema],
    // Totals
    subtotal:     { type: Number, default: 0 },
    taxTotal:     { type: Number, default: 0 },
    grandTotal:   { type: Number, default: 0 },
    // Free-text fields
    notes:        { type: String, trim: true },
    terms:        { type: String, trim: true },
    paymentInfo:  { type: String, trim: true }, // bank details, etc.
  },
  { timestamps: true }
);

InvoiceSchema.pre("save", async function () {
  if (!this.number) {
    const year = new Date().getFullYear();
    const count = await mongoose.models.Invoice.countDocuments();
    this.number = `INV-${year}-${String(count + 1).padStart(4, "0")}`;
  }
  let subtotal = 0, taxTotal = 0;
  for (const item of this.lineItems) {
    item.subtotal  = Math.round(item.quantity * item.unitPrice * 100) / 100;
    item.taxAmount = Math.round(item.subtotal * (item.taxRate / 100) * 100) / 100;
    item.total     = Math.round((item.subtotal + item.taxAmount) * 100) / 100;
    subtotal  += item.subtotal;
    taxTotal  += item.taxAmount;
  }
  this.subtotal   = Math.round(subtotal  * 100) / 100;
  this.taxTotal   = Math.round(taxTotal  * 100) / 100;
  this.grandTotal = Math.round((subtotal + taxTotal) * 100) / 100;
  if (this.isModified("status") && this.status === "paid" && !this.paidDate) {
    this.paidDate = new Date();
  }
});

InvoiceSchema.index({ status: 1, createdAt: -1 });
InvoiceSchema.index({ account: 1 });
InvoiceSchema.index({ dueDate: 1 });

export default mongoose.models.Invoice || mongoose.model("Invoice", InvoiceSchema);
