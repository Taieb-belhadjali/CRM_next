import mongoose from "mongoose";
import { generateReference } from "@/lib/numbering";

const ProspectSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    company: {
      type: String,
      trim: true,
    },
    jobTitle: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    reference: { type: String, unique: true },
    // Simple [lng, lat] point for map view (Sprint 2)
    // The entire field is omitted when no location is provided.
    // The 2dsphere index is sparse so it skips documents without coordinates.
    location: {
      type: {
        type: String,
        enum: ["Point"],
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
      },
    },
    source: {
      type: String,
      enum: ["manual", "import", "web_form"],
      default: "manual",
    },
    status: {
      type: String,
      enum: ["new", "contacted", "qualified", "converted", "unqualified"],
      default: "new",
    },
    tags: {
      type: [String], // e.g. VIP, non consulte, converti, desabonne, indesirable
      default: [],
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

ProspectSchema.index({ location: "2dsphere" }, { sparse: true });

ProspectSchema.pre("save", async function () {
  if (!this.reference) {
    this.reference = await generateReference("client");
  }
});

export default mongoose.models.Prospect ||
  mongoose.model("Prospect", ProspectSchema);
