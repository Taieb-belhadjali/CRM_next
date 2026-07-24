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

const OrderSchema = new mongoose.Schema(
  {
    number:      { type: String, unique: true },
    title:       { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["pending", "confirmed", "fulfilled", "cancelled"],
      default: "pending",
    },
    sourceType: {
      type: String,
      enum: ["quote", "invoice", null],
      default: null,
    },
    sourceId:    { type: mongoose.Schema.Types.ObjectId, ref: "Quote", default: null },
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
  },
  { timestamps: true }
);

OrderSchema.pre("save", async function () {
  if (!this.number) {
    const year = new Date().getFullYear();
    const count = await mongoose.models.Order.countDocuments();
    this.number = `ORD-${year}-${String(count + 1).padStart(4, "0")}`;
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

OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ owner: 1 });

export default mongoose.models.Order || mongoose.model("Order", OrderSchema);
