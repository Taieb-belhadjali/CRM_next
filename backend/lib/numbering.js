import dbConnect from "@/lib/mongodb";
import NumberingConfig from "@/models/NumberingConfig";

const ALLOWED_TOKENS = ["{PREFIX}", "{YEAR}", "{MONTH}", "{NUMBER}"];

function getCurrentPeriod(frequency) {
  if (frequency === "yearly") return String(new Date().getFullYear());
  if (frequency === "monthly") {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  return "never";
}

export async function generateReference(entityType) {
  await dbConnect();

  const config = await NumberingConfig.findOne({ entityType });
  if (!config) {
    throw new Error(`No numbering config found for entity type: ${entityType}`);
  }

  const now = new Date();
  const currentPeriod = getCurrentPeriod(config.resetFrequency);

  if (config.resetFrequency !== "never" && config.lastResetPeriod !== currentPeriod) {
    await NumberingConfig.findOneAndUpdate(
      { entityType },
      { $set: { lastResetPeriod: currentPeriod, nextNumber: 1 } }
    );
  }

  const updated = await NumberingConfig.findOneAndUpdate(
    { entityType },
    { $inc: { nextNumber: 1 } },
    { new: true }
  );

  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const number = String(updated.nextNumber).padStart(updated.padding, "0");

  let reference = updated.format;
  reference = reference.replace(/\{PREFIX\}/g, updated.prefix);
  reference = reference.replace(/\{YEAR\}/g, year);
  reference = reference.replace(/\{MONTH\}/g, month);
  reference = reference.replace(/\{NUMBER\}/g, number);

  return reference;
}

export async function getNextReferencePreview(entityType, overrides = {}) {
  await dbConnect();

  const config = await NumberingConfig.findOne({ entityType });
  if (!config) {
    return null;
  }

  const now = new Date();
  const currentPeriod = getCurrentPeriod(config.resetFrequency);

  let effectiveNextNumber = config.nextNumber;
  let effectivePeriod = config.lastResetPeriod;

  if (config.resetFrequency !== "never" && config.lastResetPeriod !== currentPeriod) {
    effectiveNextNumber = 1;
    effectivePeriod = currentPeriod;
  }

  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const number = String(effectiveNextNumber).padStart(config.padding, "0");

  const prefix = overrides.prefix ?? config.prefix;
  const format = overrides.format ?? config.format;
  const padding = overrides.padding ?? config.padding;

  const paddedNumber = String(effectiveNextNumber).padStart(padding, "0");

  let reference = format;
  reference = reference.replace(/\{PREFIX\}/g, prefix);
  reference = reference.replace(/\{YEAR\}/g, year);
  reference = reference.replace(/\{MONTH\}/g, month);
  reference = reference.replace(/\{NUMBER\}/g, paddedNumber);

  return reference;
}

export async function seedNumberingDefaults() {
  await dbConnect();

  const defaults = [
    { entityType: "quote", prefix: "DEV", format: "{PREFIX}-{YEAR}-{NUMBER}", padding: 4, resetFrequency: "yearly" },
    { entityType: "invoice", prefix: "FAC", format: "{PREFIX}-{YEAR}-{NUMBER}", padding: 4, resetFrequency: "yearly" },
    { entityType: "order", prefix: "CMD", format: "{PREFIX}-{YEAR}-{NUMBER}", padding: 4, resetFrequency: "yearly" },
    { entityType: "purchaseOrder", prefix: "BC", format: "{PREFIX}-{YEAR}-{NUMBER}", padding: 4, resetFrequency: "yearly" },
    { entityType: "delivery", prefix: "LIV", format: "{PREFIX}-{YEAR}-{NUMBER}", padding: 4, resetFrequency: "yearly" },
    { entityType: "client", prefix: "CLI", format: "{PREFIX}-{NUMBER}", padding: 4, resetFrequency: "never" },
    { entityType: "ticket", prefix: "TCK", format: "{PREFIX}-{YEAR}-{NUMBER}", padding: 4, resetFrequency: "yearly" },
  ];

  for (const def of defaults) {
    const existing = await NumberingConfig.findOne({ entityType: def.entityType });
    if (!existing) {
      const now = new Date();
      const currentPeriod = def.resetFrequency === "yearly" ? String(now.getFullYear()) : def.resetFrequency === "monthly" ? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}` : "";
      await NumberingConfig.create({
        ...def,
        nextNumber: 1,
        lastResetPeriod: currentPeriod,
      });
    }
  }
}

export { ALLOWED_TOKENS };
