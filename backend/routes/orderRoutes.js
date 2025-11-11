import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import Transaction from "../models/Transaction.js";
import Portfolio from "../models/Portfolio.js";
import Wallet from "../models/Wallet.js";
import Instrument from "../models/Instrument.js";
import angelOneClient from "../utils/angelOneClient.js";

const router = express.Router();

// Place order: currently supports creating LIMIT pending orders tracked locally.
// POST /api/orders/place
router.post("/place", protect, async (req, res) => {
  try {
    const { side, symbol, quantity, orderType = "LIMIT", price, product = "DELIVERY", variety = "NORMAL" } = req.body || {};
    if (!side || !symbol || !quantity) return res.status(400).json({ message: "side, symbol, quantity are required" });

    const upperSide = String(side).toUpperCase();
    const upperOrder = String(orderType).toUpperCase();

    // For now, MARKET orders should continue to use existing portfolio endpoints to avoid changing stable logic
    if (upperOrder === "MARKET") {
      return res.status(400).json({ message: "Use /api/portfolio/buy or /api/portfolio/sell for MARKET orders" });
    }

    if (upperOrder !== "LIMIT") return res.status(400).json({ message: "orderType must be LIMIT or MARKET" });
    if (price == null || Number(price) <= 0) return res.status(400).json({ message: "Limit price is required and must be > 0" });

    // Find instrument details (token/exchange/name)
    const inst = await Instrument.findOne({ symbol: symbol.toUpperCase() }).lean();
    if (!inst) return res.status(404).json({ message: `Instrument for ${symbol} not found` });

    // Optional balance check for BUY (not deducted until execution)
    if (upperSide === "BUY") {
      let wallet = await Wallet.findOne({ userId: req.user._id });
      if (!wallet) wallet = await Wallet.create({ userId: req.user._id, balance: 0 });
      const totalCost = Number(price) * Number(quantity);
      if (wallet.balance < totalCost) {
        return res.status(400).json({ message: "Insufficient wallet balance for limit BUY" });
      }
    }

    // Create a pending transaction entry
    const tx = await Transaction.create({
      userId: req.user._id,
      symbol: inst.symbol,
      fullName: inst.name || inst.symbol,
      exchange: inst.exchange,
      symbolToken: inst.token,
      side: upperSide,
      quantity: Number(quantity),
      price: Number(price), // store desired limit price until execution
      orderType: "LIMIT",
      product,
      variety,
      status: "PENDING",
    });

    return res.status(201).json(tx);
  } catch (err) {
    console.error("/orders/place error:", err);
    res.status(500).json({ message: err.message });
  }
});

// List user's pending orders
// GET /api/orders/pending
router.get("/pending", protect, async (req, res) => {
  try {
    const tx = await Transaction.find({ userId: req.user._id, status: "PENDING" }).sort({ createdAt: -1 }).lean();
    res.json(tx);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Sync pending orders: if market price reaches limit, execute and convert to EXECUTED
// POST /api/orders/sync
router.post("/sync", protect, async (req, res) => {
  try {
    const pending = await Transaction.find({ userId: req.user._id, status: "PENDING" });
    const results = [];
    for (const tx of pending) {
      try {
        const exchange = (tx.exchange || "NSE").toUpperCase();
        const ltpResp = await angelOneClient.getLTP({ exchange, tradingsymbol: tx.symbol, symboltoken: tx.symbolToken });
        const ltp = Number(ltpResp?.data?.ltp || 0);
        if (!ltp) {
          results.push({ id: tx._id.toString(), action: "skip", reason: "No LTP" });
          continue;
        }
        const canExecute = tx.side === "BUY" ? ltp <= tx.price : ltp >= tx.price;
        if (!canExecute) {
          results.push({ id: tx._id.toString(), action: "pending", ltp });
          continue;
        }
        // Execute locally using portfolio + wallet logic (mirrors existing endpoints)
        let portfolio = await Portfolio.findOne({ userId: req.user._id });
        if (!portfolio) portfolio = new Portfolio({ userId: req.user._id, stocks: [] });
        let wallet = await Wallet.findOne({ userId: req.user._id });
        if (!wallet) wallet = await Wallet.create({ userId: req.user._id, balance: 0 });

        if (tx.side === "BUY") {
          const totalCost = ltp * tx.quantity;
          if (wallet.balance < totalCost) {
            results.push({ id: tx._id.toString(), action: "failed", reason: "Insufficient wallet at execution" });
            continue;
          }
          const idx = portfolio.stocks.findIndex((s) => s.symbol === tx.symbol);
          const qtyBefore = idx > -1 ? portfolio.stocks[idx].quantity : 0;
          const avgBefore = idx > -1 ? portfolio.stocks[idx].avgPrice : 0;
          if (idx > -1) {
            const ex = portfolio.stocks[idx];
            const newTotal = ex.avgPrice * ex.quantity + ltp * tx.quantity;
            const newQty = ex.quantity + tx.quantity;
            ex.avgPrice = newTotal / newQty;
            ex.quantity = newQty;
          } else {
            portfolio.stocks.push({ symbol: tx.symbol, symbolToken: tx.symbolToken, exchange: exchange, fullName: tx.fullName, quantity: tx.quantity, avgPrice: ltp });
          }
          await portfolio.save();
          wallet.balance -= totalCost;
          await wallet.save();
          tx.status = "EXECUTED";
          tx.price = ltp; // actual execution price
          tx.quantityBefore = qtyBefore;
          tx.quantityAfter = idx > -1 ? portfolio.stocks.find((s) => s.symbol === tx.symbol)?.quantity : tx.quantity;
          tx.avgPriceBefore = avgBefore;
          tx.avgPriceAfter = portfolio.stocks.find((s) => s.symbol === tx.symbol)?.avgPrice;
          await tx.save();
          results.push({ id: tx._id.toString(), action: "executed", ltp });
        } else {
          // SELL
          const idx = portfolio.stocks.findIndex((s) => s.symbol === tx.symbol);
          if (idx === -1 || portfolio.stocks[idx].quantity < tx.quantity) {
            results.push({ id: tx._id.toString(), action: "failed", reason: "Not enough quantity to sell" });
            continue;
          }
          const stock = portfolio.stocks[idx];
          const qtyBefore = stock.quantity;
          const avgBefore = stock.avgPrice;
          stock.quantity -= tx.quantity;
          if (stock.quantity === 0) portfolio.stocks.splice(idx, 1);
          await portfolio.save();
          wallet.balance += ltp * tx.quantity;
          await wallet.save();
          const realized = (ltp - avgBefore) * tx.quantity;
          tx.status = "EXECUTED";
          tx.price = ltp;
          tx.quantityBefore = qtyBefore;
          tx.quantityAfter = Math.max(0, qtyBefore - tx.quantity);
          tx.avgPriceBefore = avgBefore;
          tx.avgPriceAfter = stock?.avgPrice;
          tx.realizedPnl = realized;
          await tx.save();
          results.push({ id: tx._id.toString(), action: "executed", ltp });
        }
      } catch (e) {
        console.warn("sync pending error", e?.message || e);
        results.push({ id: tx._id.toString(), action: "error", reason: e?.message || String(e) });
      }
    }
    res.json({ count: pending.length, results });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;