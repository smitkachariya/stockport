// routes/instruments.js
import express from "express";
import Instrument from "../models/Instrument.js"; // instrument model
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Search by symbol (e.g., WAAREE)
router.get("/:symbol", protect, async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const instrument = await Instrument.findOne({ symbol });
    if (!instrument) {
      return res.status(404).json({ message: "Instrument not found" });
    }
    res.json(instrument);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
