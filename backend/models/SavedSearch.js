import mongoose from "mongoose";

const SavedSearchSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    query: { type: String, required: true, trim: true },
    filters: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

SavedSearchSchema.index({ user: 1, createdAt: -1 });

export default mongoose.models.SavedSearch || mongoose.model("SavedSearch", SavedSearchSchema);
