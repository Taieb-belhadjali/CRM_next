import mongoose from "mongoose";

const DeliverySchema = new mongoose.Schema(
  {
    number:               { type: String, unique: true },
    orderId:              { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    invoiceId:            { type: mongoose.Schema.Types.ObjectId, ref: "Invoice", default: null },
    trackingNumber:       { type: String, trim: true },
    status: {
      type: String,
      enum: ["preparing", "shipped", "delivered"],
      default: "preparing",
    },
    carrier:              { type: String, trim: true, default: null },
    estimatedDelivery:    { type: Date, default: null },
    deliveredAt:          { type: Date, default: null },
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
});

DeliverySchema.index({ orderId: 1 });
DeliverySchema.index({ createdAt: -1 });

export default mongoose.models.Delivery || mongoose.model("Delivery", DeliverySchema);
