import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["admin", "commercial", "client"],
      default: "commercial",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    timezone: {
      type: String,
      trim: true,
      default: "UTC",
    },
    language: {
      type: String,
      trim: true,
      default: "en",
    },
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
    },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model("User", UserSchema);
