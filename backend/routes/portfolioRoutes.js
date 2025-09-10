import express from "express";
import Portfolio from "../models/Portfolio.js";
import Instrument from "../models/Instrument.js"; // instruments collection
import { protect } from "../middleware/authMiddleware.js";
import { smart_api } from "../utils/angelOne.js"; // SmartAPI wrapper instance

const router = express.Router();

/**
 * Get logged-in user's portfolio with live prices
 * GET /api/portfolio
 */
router.get("/", protect, async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({ userId: req.user._id });
    if (!portfolio) return res.json({ stocks: [] });

    const tokens = portfolio.stocks.map(s => ({
      exchange: s.exchange,
      tradingsymbol: s.symbol,
      symboltoken: s.symbolToken,
    }));

    let prices = {};
    if (tokens.length > 0) {
      const response = await smart_api.getLtpData({ data: tokens });
      prices = response.data || {};
    }

    const enriched = portfolio.stocks.map(stock => {
      const live = prices[stock.symbolToken];
      const currentPrice = live?.ltp || stock.avgPrice;
      const pnl = (currentPrice - stock.avgPrice) * stock.quantity;
      return {
        ...stock.toObject(),
        currentPrice,
        pnl,
      };
    });

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * Buy stock (add/update stock in portfolio)
 * POST /api/portfolio/buy
 */
router.post("/buy", protect, async (req, res) => {
  const { symbol, quantity, avgPrice } = req.body;

  try {
    const instrument = await Instrument.findOne({ symbol });
    if (!instrument) {
      return res.status(404).json({ message: "Symbol not found" });
    }

    let portfolio = await Portfolio.findOne({ userId: req.user._id });
    if (!portfolio) {
      portfolio = new Portfolio({ userId: req.user._id, stocks: [] });
    }

    const stockIndex = portfolio.stocks.findIndex(s => s.symbol === symbol);

    if (stockIndex > -1) {
      // Update existing stock
      const existingStock = portfolio.stocks[stockIndex];
      const totalCost =
        existingStock.avgPrice * existingStock.quantity + avgPrice * quantity;
      const newQuantity = existingStock.quantity + quantity;
      existingStock.avgPrice = totalCost / newQuantity;
      existingStock.quantity = newQuantity;
    } else {
      // Add new stock with token
      portfolio.stocks.push({
        symbol,
        symbolToken: instrument.token,
        exchange: instrument.exchange,
        fullName: instrument.name,
        quantity,
        avgPrice,
      });
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
  const { symbol, quantity } = req.body;

  try {
    const portfolio = await Portfolio.findOne({ userId: req.user._id });

    if (!portfolio) return res.status(404).json({ message: "Portfolio not found" });

    const stockIndex = portfolio.stocks.findIndex(s => s.symbol === symbol);
    if (stockIndex === -1) {
      return res.status(404).json({ message: "Stock not found in portfolio" });
    }

    const stock = portfolio.stocks[stockIndex];

    if (stock.quantity < quantity) {
      return res.status(400).json({ message: "Not enough stock quantity to sell" });
    }

    stock.quantity -= quantity;

    if (stock.quantity === 0) {
      portfolio.stocks.splice(stockIndex, 1);
    }

    await portfolio.save();
    res.json(portfolio);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

export default router;
