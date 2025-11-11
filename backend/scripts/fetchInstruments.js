// scripts/fetchInstruments.js
import mongoose from "mongoose";
import axios from "axios";
import Instrument from "../models/Instrument.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load backend/.env regardless of current working directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env"), override: true });

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("❌ MONGO_URI is not set. Check backend/.env and try again.");
  process.exit(1);
}

async function fetchAndStoreInstruments() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB Connected");

    const url =
      "https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json";

    console.log("📥 Downloading instruments...");
    const { data } = await axios.get(url);

    if (!Array.isArray(data)) {
      throw new Error("Invalid instruments data format");
    }

    // Clear old data
    await Instrument.deleteMany({});
    console.log("🗑️ Old instruments deleted");

    // Insert new
    await Instrument.insertMany(
      data.map((item) => ({
        token: item.token,
        symbol: item.symbol,
        name: item.name,
        exchange: item.exch_seg,
      }))
    );

    console.log(`✅ Inserted ${data.length} instruments into DB`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

fetchAndStoreInstruments();
