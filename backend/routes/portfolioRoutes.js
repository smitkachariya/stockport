import express from "express";
import Portfolio from "../models/Portfolio.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * Get logged-in user's portfolio
 * GET /api/portfolio
 */
router.get("/", protect, async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({ userId: req.user._id });
    if (!portfolio) {
      return res.json({ stocks: [] });
    }
    res.json(portfolio);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * Buy stock (add/update stock in portfolio)
 * POST /api/portfolio/buy
 */
router.post("/buy", protect, async (req, res) => {
  const { symbol, fullName, quantity, avgPrice } = req.body;

  if (!symbol || !fullName || !quantity || !avgPrice) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    let portfolio = await Portfolio.findOne({ userId: req.user._id });

    if (!portfolio) {
      portfolio = new Portfolio({ userId: req.user._id, stocks: [] });
    }

    const stockIndex = portfolio.stocks.findIndex((s) => s.symbol === symbol);

    if (stockIndex > -1) {
      // stock already exists → update avg price & quantity
      const existingStock = portfolio.stocks[stockIndex];
      const totalCost =
        existingStock.avgPrice * existingStock.quantity + avgPrice * quantity;
      const newQuantity = existingStock.quantity + quantity;
      existingStock.avgPrice = totalCost / newQuantity;
      existingStock.quantity = newQuantity;
    } else {
      // add new stock
      portfolio.stocks.push({ symbol, fullName, quantity, avgPrice });
    }

    await portfolio.save();
    res.json(portfolio);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

/**
 * Sell stock (reduce/remove from portfolio)
 * POST /api/portfolio/sell
 */
router.post("/sell", protect, async (req, res) => {
  const { symbol, quantity, orderType, limitPrice } = req.body;
  // orderType: "MARKET" or "LIMIT"

  if (!symbol || !quantity || !orderType) {
    return res
      .status(400)
      .json({ message: "Symbol, quantity, and orderType are required" });
  }

  try {
    const portfolio = await Portfolio.findOne({ userId: req.user._id });

    if (!portfolio) {
      return res.status(404).json({ message: "Portfolio not found" });
    }

    const stockIndex = portfolio.stocks.findIndex((s) => s.symbol === symbol);
    if (stockIndex === -1) {
      return res.status(404).json({ message: "Stock not found in portfolio" });
    }

    const stock = portfolio.stocks[stockIndex];
    if (stock.quantity < quantity) {
      return res
        .status(400)
        .json({ message: "Not enough stock quantity to sell" });
    }

    // --- Step 1: Place Sell Order with AngelOne ---
    let angelOrder;
    if (orderType === "MARKET") {
      angelOrder = await AngelOneClient.placeOrder({
        symbol,
        quantity,
        transactionType: "SELL",
        orderType: "MARKET",
      });
    } else if (orderType === "LIMIT") {
      if (!limitPrice) {
        return res.status(400).json({ message: "Limit price is required" });
      }
      angelOrder = await AngelOneClient.placeOrder({
        symbol,
        quantity,
        transactionType: "SELL",
        orderType: "LIMIT",
        price: limitPrice,
      });
    }

    // --- Step 2: Update Local Portfolio only after confirmation ---
    if (angelOrder.status === "SUCCESS") {
      stock.quantity -= quantity;

      if (stock.quantity === 0) {
        portfolio.stocks.splice(stockIndex, 1);
      }

      await portfolio.save();
    }

    res.json({
      message: "Sell order placed successfully",
      angelOrder,
      portfolio,
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

export default router;
