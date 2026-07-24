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

const DeliverySchema = new mongoose.Schema(
  {
    number:               { type: String, unique: true },
    orderId:              { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    invoiceId:            { type: mongoose.Schema.Types.ObjectId, ref: "Invoice", default: null },
    contact:              { type: mongoose.Schema.Types.ObjectId, ref: "Contact", default: null },
    account:              { type: mongoose.Schema.Types.ObjectId, ref: "Account", default: null },
    trackingNumber:       { type: String, trim: true },
    deliveryAddress:      { type: String, trim: true, default: null },
    status: {
      type: String,
      enum: ["preparing", "shipped", "delivered"],
      default: "preparing",
    },
    carrier:              { type: String, trim: true, default: null },
    estimatedDelivery:    { type: Date, default: null },
    deliveredAt:          { type: Date, default: null },
    lineItems:            [LineItemSchema],
    subtotal:             { type: Number, default: 0 },
    taxTotal:             { type: Number, default: 0 },
    grandTotal:           { type: Number, default: 0 },
    notes:                { type: String, trim: true, default: null },
  },
  { timestamps: true }
);

DeliverySchema.pre("save", async function () {
  if (!this.number) {
    const year = new Date().getFullYear();
    const count = await mongoose.models.Delivery.countDocuments();
    this.number = `DEL-${year}-${String(count + 1).padStart(4, "0")}`;
  }
  if (this.status === "delivered" && !this.deliveredAt) {
    this.deliveredAt = new Date();
  }
  if (!Array.isArray(this.lineItems)) this.lineItems = [];
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

DeliverySchema.index({ orderId: 1 });
DeliverySchema.index({ createdAt: -1 });

export default mongoose.models.Delivery || mongoose.model("Delivery", DeliverySchema);
