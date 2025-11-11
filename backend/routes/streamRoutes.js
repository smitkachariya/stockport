import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import angelOneClient from "../utils/angelOneClient.js";
import Instrument from "../models/Instrument.js";

const router = express.Router();

// SSE endpoint that polls Angel One quote API every 1s
// GET /api/stream/ltp?symbols=RELIANCE,TCS or tokens=3045,881&exchange=NSE
router.get("/ltp", protect, async (req, res) => {
  try {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const symbolsParam = (req.query.symbols || "").toString();
    const tokensParam = (req.query.tokens || "").toString();
    const exchangeParam = (req.query.exchange || "NSE").toString().toUpperCase();

    let tokensByExch = {};

    if (tokensParam) {
      tokensByExch[exchangeParam] = tokensParam.split(",").map((t) => t.trim()).filter(Boolean);
    }

    if (symbolsParam) {
      const symbols = symbolsParam.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
      const rows = await Instrument.find({ symbol: { $in: symbols } }).lean();
      rows.forEach((r) => {
        const exch = (r.exchange || "NSE").toUpperCase();
        if (!tokensByExch[exch]) tokensByExch[exch] = [];
        if (r.token) tokensByExch[exch].push(String(r.token));
      });
    }

    if (!Object.keys(tokensByExch).length) {
      res.write(`event: error\n`);
      res.write(`data: ${JSON.stringify({ message: "No valid tokens/symbols provided" })}\n\n`);
      return;
    }

    let alive = true;
    req.on("close", () => {
      alive = false;
      clearInterval(timer);
    });

    const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

    // initial tick
    const poll = async () => {
      try {
        const quote = await angelOneClient.getMarketQuote({ mode: "LTP", exchangeTokens: tokensByExch });
        const fetched = quote?.data?.fetched || [];
        fetched.forEach((row) => {
          send({
            type: "ltp",
            exchange: row.exchange,
            symbolToken: row.symbolToken,
            tradingSymbol: row.tradingSymbol,
            ltp: row.ltp,
          });
        });
      } catch (e) {
        res.write(`event: error\n`);
        res.write(`data: ${JSON.stringify({ message: e?.message || String(e) })}\n\n`);
      }
    };

    await poll();
    const timer = setInterval(() => alive && poll(), 1000);
  } catch (err) {
    res.status(500).end();
  }
});

export default router;