import mongoose from "mongoose";

const DealSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    stage: {
      type: String,
      enum: [
        "prospection",
        "proposition",
        "negociation",
        "gagne",
        "perdu",
      ],
      default: "prospection",
    },
    value: {
      type: Number,
      default: 0,
    },
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
    },
    contacts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Contact",
      },
    ],
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    expectedCloseDate: {
      type: Date,
    },
    // Used to order cards within a Kanban column
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Deal || mongoose.model("Deal", DealSchema);
