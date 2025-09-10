import dotenv from "dotenv";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import Instrument from "../models/Instrument.js";

dotenv.config();

const filePath = path.join(process.cwd(), "instruments.json");

async function run() {
  try {
    // Connect to DB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    // Read instruments.json
    const data = fs.readFileSync(filePath, "utf-8");
    const instruments = JSON.parse(data);

    console.log(`Parsed ${instruments.length} instruments`);

    // Clear old data
    await Instrument.deleteMany({});
    console.log("🗑 Old instruments removed");

    // Insert new
    await Instrument.insertMany(
      instruments.map((i) => ({
        token: i.token,
        symbol: i.symbol,
        name: i.name,
        exchange: i.exch_seg, // depends on file structure
      }))
    );

    console.log("✅ Instruments saved to MongoDB");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
}

run();
