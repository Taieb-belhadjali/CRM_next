import mongoose from "mongoose";

const SignupTokenSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },
    role: {
      type: String,
      enum: ["client"],
      default: "client",
    },
    used: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

SignupTokenSchema.index({ token: 1 });
SignupTokenSchema.index({ email: 1, used: 1 });

export default mongoose.models.SignupToken ||
  mongoose.model("SignupToken", SignupTokenSchema);
