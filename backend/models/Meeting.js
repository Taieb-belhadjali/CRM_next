import mongoose from "mongoose";

const MeetingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    scheduledAt: { type: Date, required: true },
    durationMinutes: { type: Number, default: 60 },
    location: { type: String, trim: true },
    meetingLink: { type: String, trim: true },
    notes: { type: String, trim: true },
    // Participants — array of User ObjectIds
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    // Optional link to a deal or contact
    relatedTo: { type: mongoose.Schema.Types.ObjectId },
    relatedToModel: { type: String, enum: ["Contact", "Prospect", "Deal", "Account"] },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

MeetingSchema.index({ scheduledAt: 1 });
export default mongoose.models.Meeting || mongoose.model("Meeting", MeetingSchema);
