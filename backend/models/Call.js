import mongoose from "mongoose";

const CallSchema = new mongoose.Schema(
  {
    subject: { type: String, required: true, trim: true },
    direction: { type: String, enum: ["inbound", "outbound"], default: "outbound" },
    status: { type: String, enum: ["scheduled", "completed", "missed", "cancelled"], default: "completed" },
    durationMinutes: { type: Number, default: 0 },
    scheduledAt: { type: Date },
    notes: { type: String, trim: true },
    // Polymorphic link — can attach to contact, prospect, or deal
    relatedTo: { type: mongoose.Schema.Types.ObjectId },
    relatedToModel: { type: String, enum: ["Contact", "Prospect", "Deal"] },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

CallSchema.index({ scheduledAt: -1 });
export default mongoose.models.Call || mongoose.model("Call", CallSchema);
