import express from "express";
import angel from "../utils/angelOneClient.js";
import MarketScrip from "../models/MarketScrip.js";
import Instrument from "../models/Instrument.js";
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
  try {
    let { token, symbol, exchange } = req.query;
    if (!token && symbol) {
      // Look up instrument by symbol if token not provided
      const inst = await Instrument.findOne({ symbol: symbol.toUpperCase() });
      if (!inst) return res.status(404).json({ message: "Instrument not found" });
      token = inst.token;
      exchange = inst.exchange || "NSE";
    }
    if (!token || !symbol) {
      return res.status(400).json({ message: "token and symbol are required (or provide symbol to look up)" });
    }
    const data = await angel.getLTP({
      exchange: (exchange || "NSE").toUpperCase(),
      tradingsymbol: symbol.toUpperCase(),
      symboltoken: token,
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Batch LTP by symbols using Angel One quote API
// GET /api/market/ltp/batch?symbols=TCS-EQ,RELIANCE-EQ
router.get("/ltp/batch", protect, async (req, res) => {
  try {
    const symbolsParam = (req.query.symbols || "").toString();
    const symbols = symbolsParam.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
    if (!symbols.length) return res.json({ fetched: [] });

    // Build exchangeTokens using Instrument first, then MarketScrip fallback per-symbol if needed
    const tokensByExch = {};
    const instRows = await Instrument.find({ symbol: { $in: symbols } }).lean();
    const instMap = new Map(instRows.map((r) => [r.symbol.toUpperCase(), r]));

    for (const sym of symbols) {
      let row = instMap.get(sym);
      if (!row) {
        const scrip = await MarketScrip.findOne({ tradingsymbol: sym }).lean();
        if (scrip) {
          row = { symbol: scrip.tradingsymbol, token: scrip.symboltoken, exchange: scrip.exchange };
        }
      }
      if (row && row.token) {
        const exch = String(row.exchange || "NSE").toUpperCase();
        if (!tokensByExch[exch]) tokensByExch[exch] = [];
        tokensByExch[exch].push(String(row.token));
      }
    }

    if (!Object.keys(tokensByExch).length) return res.json({ fetched: [] });

    const quote = await angel.getMarketQuote({ mode: "LTP", exchangeTokens: tokensByExch });
    // Normalize response
    const fetched = (quote?.data?.fetched || []).map((r) => ({
      exchange: r.exchange,
      symbolToken: r.symbolToken,
      tradingSymbol: r.tradingSymbol,
      ltp: r.ltp,
    }));
    res.json({ fetched });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
