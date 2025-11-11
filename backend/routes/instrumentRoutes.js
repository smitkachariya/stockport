// routes/instruments.js
import express from "express";
import Instrument from "../models/Instrument.js"; // instrument model
import MarketScrip from "../models/MarketScrip.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Search by query: symbol or name
router.get("/search", protect, async (req, res) => {
  try {
    const q = (req.query.q || "").toString().trim();
    if (!q) return res.json([]);
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

    // First search Instruments
    let results = await Instrument.find({
      $or: [{ symbol: rx }, { name: rx }],
    })
      .limit(20)
      .lean();

    // Fallback to MarketScrip if nothing found
    if (!results || results.length === 0) {
      const scr = await MarketScrip.find({
        $or: [{ tradingsymbol: rx }, { name: rx }],
      })
        .limit(20)
        .lean();
      results = scr.map((s) => ({
        _id: s._id,
        symbol: s.tradingsymbol,
        name: s.name,
        exchange: s.exchange,
        token: s.symboltoken,
      }));
    }

    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get by symbol with flexible matching (exact, '-EQ', prefix, or MarketScrip fallback)
router.get("/:symbol", protect, async (req, res) => {
  try {
    const raw = (req.params.symbol || "").toString().trim().toUpperCase();
    if (!raw) return res.status(400).json({ message: "symbol required" });

    // 1) Try exact in Instrument
    let inst = await Instrument.findOne({ symbol: raw }).lean();

    // 2) Try with '-EQ'
    if (!inst) inst = await Instrument.findOne({ symbol: `${raw}-EQ` }).lean();

    // 3) Try prefix match
    if (!inst) inst = await Instrument.findOne({ symbol: new RegExp(`^${raw}`) }).lean();

    // 4) Fallback to MarketScrip by tradingsymbol exact or prefix
    if (!inst) {
      const scrip = await MarketScrip.findOne({ tradingsymbol: raw }).lean()
        || await MarketScrip.findOne({ tradingsymbol: new RegExp(`^${raw}`) }).lean();
      if (scrip) {
        return res.json({
          _id: scrip._id,
          symbol: scrip.tradingsymbol,
          name: scrip.name,
          exchange: scrip.exchange,
          token: scrip.symboltoken,
        });
      }
    }

    if (!inst) return res.status(404).json({ message: "Instrument not found" });
    res.json(inst);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
