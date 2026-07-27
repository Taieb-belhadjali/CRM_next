import mongoose from "mongoose";

const NumberingConfigSchema = new mongoose.Schema(
  {
    entityType: {
      type: String,
      required: true,
      unique: true,
      enum: ["quote", "invoice", "order", "purchaseOrder", "delivery", "client", "ticket"],
    },
    prefix: { type: String, required: true, trim: true, default: "" },
    format: {
      type: String,
      required: true,
      default: "{PREFIX}-{YEAR}-{NUMBER}",
      validate: {
        validator: function (v) {
          const allowed = ["{PREFIX}", "{YEAR}", "{MONTH}", "{NUMBER}"];
          const tokens = v.match(/\{[A-Z]+\}/g) || [];
          return tokens.every((t) => allowed.includes(t));
        },
        message: "Format contains invalid tokens. Allowed: {PREFIX}, {YEAR}, {MONTH}, {NUMBER}",
      },
    },
    padding: { type: Number, required: true, min: 1, max: 10, default: 4 },
    nextNumber: { type: Number, required: true, min: 1, default: 1 },
    resetFrequency: {
      type: String,
      required: true,
      enum: ["never", "yearly", "monthly"],
      default: "yearly",
    },
    lastResetPeriod: { type: String, default: "" },
  },
  { timestamps: true }
);

NumberingConfigSchema.index({ entityType: 1 }, { unique: true });

export default mongoose.models.NumberingConfig ||
  mongoose.model("NumberingConfig", NumberingConfigSchema);
