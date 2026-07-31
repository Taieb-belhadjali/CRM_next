import mongoose from "mongoose";

const CalendarEventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    type: {
      type: String,
      enum: ["task", "meeting", "call", "reminder", "custom"],
      default: "custom",
    },
    startAt: { type: Date, required: true },
    endAt: { type: Date },
    allDay: { type: Boolean, default: false },
    location: { type: String, trim: true },
    meetingLink: { type: String, trim: true },
    notes: { type: String, trim: true },
    status: {
      type: String,
      enum: ["scheduled", "completed", "cancelled"],
      default: "scheduled",
    },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    visibility: {
      type: String,
      enum: ["private", "team", "shared"],
      default: "private",
    },
    sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    relatedTo: { type: mongoose.Schema.Types.ObjectId },
    relatedToModel: {
      type: String,
      enum: ["Prospect", "Contact", "Account", "Deal", "Task", "Meeting", "Call"],
    },
    reminderMinutes: { type: Number, default: 15, min: 0 },
    remindAt: { type: Date, index: true },
    reminderSent: { type: Boolean, default: false },
    googleEventId: { type: String },
    googleCalendarId: { type: String },
    googleSyncedAt: { type: Date },
  },
  { timestamps: true }
);

CalendarEventSchema.index({ startAt: 1, owner: 1 });

CalendarEventSchema.pre("save", async function () {
  if (this.startAt && this.reminderMinutes !== undefined && this.reminderMinutes !== null) {
    this.remindAt = new Date(new Date(this.startAt).getTime() - this.reminderMinutes * 60 * 1000);
  } else if (this.startAt) {
    this.remindAt = new Date(this.startAt);
  }
});

export default mongoose.models.CalendarEvent || mongoose.model("CalendarEvent", CalendarEventSchema);
