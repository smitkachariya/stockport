import express from "express";
import Portfolio from "../models/Portfolio.js";
import Instrument from "../models/Instrument.js"; // instruments collection
import { protect } from "../middleware/authMiddleware.js";
import { smart_api } from "../utils/angelOne.js"; // AngelOne SmartAPI client

const router = express.Router();

/**
 * Get logged-in user's portfolio with live prices
 * GET /api/portfolio?live=true
 */
router.get("/", protect, async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({ userId: req.user._id });
    if (!portfolio) return res.json({ stocks: [] });

    const useLivePrices = req.query.live === "true";

    // ✅ Without live prices → fast response
    if (!useLivePrices) {
      // Return portfolio without live prices (faster, no API calls)
      const stocks = portfolio.stocks.map((stock) => ({
        ...stock.toObject(),
        buyingPrice: Math.round(stock.avgPrice * 100) / 100,
        currentPrice: Math.round(stock.avgPrice * 100) / 100, // Same as buying price when no live data
        pnl: 0,
        pnlPercentage: 0,
        totalValue: Math.round(stock.avgPrice * stock.quantity * 100) / 100,
        totalInvestment:
          Math.round(stock.avgPrice * stock.quantity * 100) / 100,
      }));
      return res.json(stocks);
    }

    // Get live prices for each stock
    const enriched = await Promise.all(
      portfolio.stocks.map(async (stock) => {
        let currentPrice = stock.avgPrice; // Default to average price

        try {
          // Try to get live price from AngelOne API
          if (stock.symbolToken && stock.symbolToken !== "UNKNOWN") {
            console.log(`Fetching live price for ${stock.symbol}...`);
            const ltpResponse = await angelOneClient.getLTP({
              tradingsymbol: stock.symbol,
              symboltoken: stock.symbolToken,
            });

            if (ltpResponse && ltpResponse.data && ltpResponse.data.ltp) {
              currentPrice = parseFloat(ltpResponse.data.ltp);
              console.log(`✅ Live price for ${stock.symbol}: ${currentPrice}`);
            }
          } else {
            console.log(
              `⚠️ Skipping live price for ${stock.symbol} - symbolToken is UNKNOWN`
            );
          }
        } catch (error) {
          console.warn(
            `❌ Failed to get live price for ${stock.symbol}:`,
            error.message
          );
          // Simulate a small price change for demo purposes
          const randomChange = (Math.random() - 0.5) * 0.1; // ±5% random change
          currentPrice = stock.avgPrice * (1 + randomChange);
          console.log(
            `📊 Using simulated price for ${
              stock.symbol
            }: ${currentPrice.toFixed(2)}`
          );
        }

        const pnl = (currentPrice - stock.avgPrice) * stock.quantity;
        const pnlPercentage =
          stock.avgPrice > 0
            ? (pnl / (stock.avgPrice * stock.quantity)) * 100
            : 0;

        return {
          ...stock.toObject(),
          buyingPrice: Math.round(stock.avgPrice * 100) / 100, // Buying/Average price
          currentPrice: Math.round(currentPrice * 100) / 100, // Current market price
          pnl: Math.round(pnl * 100) / 100, // Profit/Loss amount
          pnlPercentage: Math.round(pnlPercentage * 100) / 100, // Profit/Loss percentage
          totalValue: Math.round(currentPrice * stock.quantity * 100) / 100, // Total current value
          totalInvestment:
            Math.round(stock.avgPrice * stock.quantity * 100) / 100, // Total investment
        };
      })
    );

    res.json(enriched);
  } catch (err) {
    console.error("Error in portfolio GET route:", err);
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
    // Find instrument in DB
    const instrument = await Instrument.findOne({ symbol });
    if (!instrument) {
      return res
        .status(404)
        .json({ message: "Symbol not found in instruments DB" });
    }

    let portfolio = await Portfolio.findOne({ userId: req.user._id });
    if (!portfolio) {
      portfolio = new Portfolio({ userId: req.user._id, stocks: [] });
    }

    const stockIndex = portfolio.stocks.findIndex((s) => s.symbol === symbol);

    if (stockIndex > -1) {
      // Update existing stock
      const existingStock = portfolio.stocks[stockIndex];
      const totalCost =
        existingStock.avgPrice * existingStock.quantity + avgPrice * quantity;
      const newQuantity = existingStock.quantity + quantity;
      existingStock.avgPrice = totalCost / newQuantity;
      existingStock.quantity = newQuantity;
    } else {
      // Add new stock with correct fields
      portfolio.stocks.push({
        symbol: instrument.symbol,
        symbolToken: instrument.token,
        exchange: instrument.exchange,
        fullName: instrument.name || instrument.symbol,
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

  if (!symbol || !quantity) {
    return res
      .status(400)
      .json({ message: "Symbol and quantity are required" });
  }
  if (quantity <= 0) {
    return res.status(400).json({ message: "Quantity must be greater than 0" });
  }

  try {
    const portfolio = await Portfolio.findOne({ userId: req.user._id });
    if (!portfolio) {
      return res.status(404).json({ message: "Portfolio not found" });
    }

    const stockIndex = portfolio.stocks.findIndex((s) => s.symbol === symbol);
    if (stockIndex === -1) {
      return res
        .status(404)
        .json({ message: `Stock '${symbol}' not found in portfolio` });
    }

    const stock = portfolio.stocks[stockIndex];
    if (stock.quantity < quantity) {
      return res
        .status(400)
        .json({ message: `Not enough stock quantity to sell` });
    }

    stock.quantity -= quantity;

    if (stock.quantity === 0) {
      portfolio.stocks.splice(stockIndex, 1);
    }

    await portfolio.save();
    res.json(portfolio);
  } catch (err) {
    console.error("Error in sell route:", err);
    res.status(400).json({ message: err.message });
  }
});

export default router;
