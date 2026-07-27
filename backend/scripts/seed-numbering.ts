import mongoose from "mongoose";
import dotenv from "dotenv";
import { seedNumberingDefaults } from "../lib/numbering";

dotenv.config();

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not defined");
    process.exit(1);
  }
  await mongoose.connect(uri);
  await seedNumberingDefaults();
  console.log("Numbering configs seeded.");
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
