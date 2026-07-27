import mongoose from "mongoose";
import { generateReference } from "@/lib/numbering";

const AccountSchema = new mongoose.Schema(
  {
    reference: { type: String, unique: true },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    siret: {
      type: String,
      trim: true,
    },
    sector: {
      type: String,
      trim: true,
    },
    size: {
      type: String,
      enum: ["1-10", "11-50", "51-200", "201-500", "500+"],
    },
    estimatedRevenue: {
      type: Number,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "disputed"],
      default: "active",
    },
    address: {
      type: String,
      trim: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

AccountSchema.pre("save", async function () {
  if (!this.reference) {
    this.reference = await generateReference("client");
  }
});

export default mongoose.models.Account ||
  mongoose.model("Account", AccountSchema);
