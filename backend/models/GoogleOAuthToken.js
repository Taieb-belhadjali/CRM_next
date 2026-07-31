import mongoose from "mongoose";

const GoogleOAuthTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    accessToken: { type: String, required: true },
    refreshToken: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    scope: { type: String, required: true },
    tokenType: { type: String, default: "Bearer" },
  },
  { timestamps: true }
);

GoogleOAuthTokenSchema.index({ userId: 1 }, { unique: true });

export default mongoose.models.GoogleOAuthToken ||
  mongoose.model("GoogleOAuthToken", GoogleOAuthTokenSchema);
