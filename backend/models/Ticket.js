import mongoose from "mongoose";
import { generateReference } from "@/lib/numbering";

const TicketSchema = new mongoose.Schema(
  {
    reference: { type: String, unique: true },
    subject: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved", "closed"],
      default: "open",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    contact: { type: mongoose.Schema.Types.ObjectId, ref: "Contact" },
    account: { type: mongoose.Schema.Types.ObjectId, ref: "Account" },
    assignee: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

TicketSchema.pre("save", async function () {
  if (!this.reference) {
    this.reference = await generateReference("ticket");
  }
});

TicketSchema.index({ status: 1, createdAt: -1 });
export default mongoose.models.Ticket || mongoose.model("Ticket", TicketSchema);
