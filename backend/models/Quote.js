import mongoose from "mongoose";
import { generateReference } from "@/lib/numbering";

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

const QuoteSchema = new mongoose.Schema(
  {
    number:      { type: String, unique: true },
    title:       { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["draft", "sent", "accepted", "rejected"],
      default: "draft",
    },
    issueDate:   { type: Date, default: Date.now },
    validUntil:  { type: Date },
    deal:        { type: mongoose.Schema.Types.ObjectId, ref: "Deal" },
    contact:     { type: mongoose.Schema.Types.ObjectId, ref: "Contact" },
    account:     { type: mongoose.Schema.Types.ObjectId, ref: "Account" },
    owner:       { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    lineItems:   [LineItemSchema],
    subtotal:    { type: Number, default: 0 },
    taxTotal:    { type: Number, default: 0 },
    grandTotal:  { type: Number, default: 0 },
    notes:       { type: String, trim: true },
    terms:       { type: String, trim: true },
    invoiceId:   { type: mongoose.Schema.Types.ObjectId, ref: "Invoice", default: null },
  },
  { timestamps: true }
);

QuoteSchema.pre("save", async function () {
  if (!this.number) {
    this.number = await generateReference("quote");
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
});

QuoteSchema.index({ status: 1, createdAt: -1 });
QuoteSchema.index({ account: 1 });
QuoteSchema.index({ deal: 1 });

export default mongoose.models.Quote || mongoose.model("Quote", QuoteSchema);
