import express from "express";
import angel from "../utils/angelOneClient.js";
import MarketScrip from "../models/MarketScrip.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/scrips/download", async (req, res) => {
  try {
    const csvOrList = await angel.getScripMaster();
    // parse CSV and upsert to MarketScrip collection
    // for brevity: assume csvOrList is array of items
    // save to DB
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/scrips", async (req, res) => {
  const q = req.query.q || "";
  const results = await MarketScrip.find({
    $or: [{ tradingsymbol: new RegExp(q, "i") }, { name: new RegExp(q, "i") }],
  }).limit(20);
  res.json(results);
});

router.get("/ltp", protect, async (req, res) => {
  const { token, symbol } = req.query;
  const data = await angel.getLTP({
    tradingsymbol: symbol,
    symboltoken: token,
  });
  res.json(data);
});

export default router;
