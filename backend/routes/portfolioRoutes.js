import express from "express";
import Portfolio from "../models/Portfolio.js";
import Transaction from "../models/Transaction.js";
import Instrument from "../models/Instrument.js"; // instruments collection
import { protect } from "../middleware/authMiddleware.js";
import angelOneClient from "../utils/angelOneClient.js"; // AngelOne SmartAPI client
import Wallet from "../models/Wallet.js";

const router = express.Router();

/**
 * Get logged-in user's portfolio with live prices
 * GET /api/portfolio?live=true
 */
router.get("/", protect, express.json({ strict: false }), async (req, res) => {
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

    // Exact LTP using Angel One quote API in one request; also auto-fix tokens
    let updatedTokens = false;

    // First repair missing/unknown tokens
    for (let i = 0; i < portfolio.stocks.length; i++) {
      const stock = portfolio.stocks[i];
      if (!stock.symbolToken || stock.symbolToken === "UNKNOWN") {
        try {
          const inst = await Instrument.findOne({ symbol: stock.symbol }).lean();
          if (inst) {
            portfolio.stocks[i].symbolToken = inst.token;
            portfolio.stocks[i].exchange = (inst.exchange || stock.exchange || "NSE").toUpperCase();
            if (!portfolio.stocks[i].fullName && inst.name) portfolio.stocks[i].fullName = inst.name;
            updatedTokens = true;
          }
        } catch {}
      }
    }
    if (updatedTokens) {
      try { await portfolio.save(); } catch {}
    }

    // Build exchangeTokens mapping for quote call
    const tokensByExch = {};
    portfolio.stocks.forEach((s) => {
      if (!s.symbolToken || s.symbolToken === "UNKNOWN") return;
      const exch = (s.exchange || "NSE").toUpperCase();
      if (!tokensByExch[exch]) tokensByExch[exch] = [];
      tokensByExch[exch].push(String(s.symbolToken));
    });

    let ltpMap = new Map();
    try {
      if (Object.keys(tokensByExch).length) {
        const quote = await angelOneClient.getMarketQuote({ mode: "LTP", exchangeTokens: tokensByExch });
        const fetched = quote?.data?.fetched || [];
        fetched.forEach((row) => {
          if (row?.symbolToken && row?.ltp != null) {
            ltpMap.set(String(row.symbolToken), Number(row.ltp));
          }
        });
      }
    } catch (e) {
      console.warn("AngelOne quote LTP failed:", e?.message || e);
    }

    const enriched = portfolio.stocks.map((stock) => {
      const tokenKey = String(stock.symbolToken || "");
      const currentPrice = ltpMap.has(tokenKey) ? ltpMap.get(tokenKey) : stock.avgPrice;
      const pnl = (currentPrice - stock.avgPrice) * stock.quantity;
      const pnlPercentage = stock.avgPrice > 0 ? (pnl / (stock.avgPrice * stock.quantity)) * 100 : 0;
      return {
        ...stock.toObject(),
        buyingPrice: Math.round(stock.avgPrice * 100) / 100,
        currentPrice: Math.round(currentPrice * 100) / 100,
        pnl: Math.round(pnl * 100) / 100,
        pnlPercentage: Math.round(pnlPercentage * 100) / 100,
        totalValue: Math.round(currentPrice * stock.quantity * 100) / 100,
        totalInvestment: Math.round(stock.avgPrice * stock.quantity * 100) / 100,
      };
    });

    res.json(enriched);
  } catch (err) {
    console.error("Error in portfolio GET route:", err);
    res.status(500).json({ message: err.message });
  }
});

// router.get("/", async (req, res) => {
//   try {
//     const portfolio = await Portfolio.find();

//     if (!portfolio || portfolio.length === 0) {
//       return res.json([]);
//     }

//     // loop through each stock in portfolio
//     for (const port of portfolio) {
//       for (const stock of port.stocks) {
//         try {
//           // fetch live price
//           const ltpResponse = await angelOneClient.getLTP({
//             exchange: stock.exchange || "NSE",
//             tradingsymbol: stock.symbol,
//             symboltoken: stock.symbolToken,
//           });

//           if (ltpResponse?.data?.ltp) {
//             stock.currentPrice = parseFloat(ltpResponse.data.ltp);
//           } else {
//             console.warn(
//               `❌ No LTP returned for ${stock.symbol} (token: ${stock.symbolToken}, exchange: ${stock.exchange})`
//             );
//             stock.currentPrice = stock.avgPrice; // fallback
//           }
//         } catch (err) {
//           console.error(
//             `⚠️ LTP fetch failed for ${stock.symbol} (token: ${stock.symbolToken}):`,
//             err.message
//           );
//           stock.currentPrice = stock.avgPrice; // fallback
//         }

//         // recalc PnL
//         stock.totalValue = stock.currentPrice * stock.quantity;
//         stock.totalInvestment = stock.avgPrice * stock.quantity;
//         stock.pnl = stock.totalValue - stock.totalInvestment;
//         stock.pnlPercentage =
//           stock.totalInvestment > 0
//             ? ((stock.pnl / stock.totalInvestment) * 100).toFixed(2)
//             : 0;
//       }
//     }

//     res.json(portfolio);
//   } catch (err) {
//     console.error("❌ Error fetching portfolio:", err.message);
//     res.status(500).json({ message: "Server error fetching portfolio" });
//   }
// });

/**
 * Buy stock (add/update stock in portfolio)
 * POST /api/portfolio/buy
 */
router.post("/buy", protect, async (req, res) => {
  const {
    symbol,
    quantity,
    avgPrice,
    placeOrder = false,
    orderType = "MARKET",
    price,
    product = "DELIVERY",
    variety = "NORMAL",
  } = req.body;

  try {
    // Find instrument in DB
    let instrument = await Instrument.findOne({ symbol });
    if (!instrument) {
      // Fallback: allow unknown symbol to be recorded with minimal fields
      instrument = {
        symbol,
        token: "UNKNOWN",
        exchange: "NSE",
        name: symbol,
      };
    }

    let portfolio = await Portfolio.findOne({ userId: req.user._id });
    if (!portfolio) {
      portfolio = new Portfolio({ userId: req.user._id, stocks: [] });
    }

    const stockIndex = portfolio.stocks.findIndex((s) => s.symbol === symbol);

    // Determine execution price for wallet deduction
    const executionPrice = Number(
      orderType === "LIMIT" ? price ?? avgPrice : avgPrice ?? 0
    );
    const totalCost = executionPrice * quantity;

    // Check wallet funds (do not deduct yet to avoid inconsistency on portfolio failure)
    let wallet = await Wallet.findOne({ userId: req.user._id });
    if (!wallet) wallet = await Wallet.create({ userId: req.user._id, balance: 0 });
    if (wallet.balance < totalCost) {
      return res.status(400).json({ message: "Insufficient wallet balance" });
    }

    if (placeOrder) {
      try {
        await angelOneClient.placeOrder({
          variety,
          tradingsymbol: instrument.symbol,
          symboltoken: instrument.token,
          exchange:
            (instrument.exchange || "NSE").toUpperCase() === "BSE"
              ? "BSE"
              : "NSE",
          transactiontype: "BUY",
          ordertype: orderType,
          price: orderType === "LIMIT" ? String(price ?? avgPrice) : String(executionPrice || 0),
          quantity,
          producttype: product,
          duration: "DAY",
        });
      } catch (err) {
        console.error("AngelOne placeOrder BUY failed:", err?.message || err);
      }
    }

    // record portfolio snapshot before
    const quantityBefore =
      stockIndex > -1 ? portfolio.stocks[stockIndex].quantity : 0;
    const avgPriceBefore =
      stockIndex > -1 ? portfolio.stocks[stockIndex].avgPrice : 0;

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

    // Deduct wallet after portfolio was successfully saved
    try {
      wallet.balance -= totalCost;
      await wallet.save();
    } catch (e) {
      console.warn("Wallet deduct failed after BUY save:", e?.message || e);
    }

    // store transaction (treat provided avgPrice as execution price fallback)
    try {
      const doc = await Transaction.create({
        userId: req.user._id,
        symbol: instrument.symbol,
        fullName: instrument.name || instrument.symbol,
        exchange: instrument.exchange,
        symbolToken: instrument.token,
        side: "BUY",
        quantity,
        price: Number(executionPrice),
        orderType: orderType,
        product,
        variety,
        status: "EXECUTED",
        quantityBefore,
        quantityAfter:
          stockIndex > -1
            ? portfolio.stocks.find((s) => s.symbol === instrument.symbol)
                ?.quantity
            : quantity,
        avgPriceBefore,
        avgPriceAfter: portfolio.stocks.find(
          (s) => s.symbol === instrument.symbol
        )?.avgPrice,
        realizedPnl: 0,
      });
      console.log("✅ Transaction BUY saved:", doc._id.toString());
    } catch (e) {
      console.warn("❌ Transaction log (BUY) failed:", e?.message || e);
    }
    res.json({ portfolio, walletBalance: wallet.balance });
  } catch (err) {
    console.error("Error in portfolio BUY route:", err);
    res.status(400).json({ message: err.message });
  }
});

/**
 * Sell stock (reduce/remove from portfolio)
 * POST /api/portfolio/sell
 */
router.post("/sell", protect, async (req, res) => {
  const {
    symbol,
    quantity,
    placeOrder = false,
    orderType = "MARKET",
    price,
    product = "DELIVERY",
    variety = "NORMAL",
  } = req.body;

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

    if (placeOrder) {
      try {
        await angelOneClient.placeOrder({
          variety,
          tradingsymbol: stock.symbol,
          symboltoken: stock.symbolToken,
          exchange:
            (stock.exchange || "NSE").toUpperCase() === "BSE" ? "BSE" : "NSE",
          transactiontype: "SELL",
          ordertype: orderType,
          price: orderType === "LIMIT" ? String(price ?? stock.avgPrice) : "0",
          quantity,
          producttype: product,
          duration: "DAY",
        });
      } catch (err) {
        console.error("AngelOne placeOrder SELL failed:", err?.message || err);
      }
    }

    const quantityBefore = stock.quantity;
    const avgPriceBefore = stock.avgPrice;
    stock.quantity -= quantity;

    if (stock.quantity === 0) {
      portfolio.stocks.splice(stockIndex, 1);
    }

    await portfolio.save();

    // compute realized PnL for this sell
    const executionPrice = Number(
      orderType === "LIMIT" ? price ?? avgPriceBefore : avgPriceBefore
    );
    const realizedPnl = (executionPrice - avgPriceBefore) * quantity;

    // Credit wallet with proceeds
    let wallet = await Wallet.findOne({ userId: req.user._id });
    if (!wallet) wallet = await Wallet.create({ userId: req.user._id, balance: 0 });
    wallet.balance += executionPrice * quantity;
    await wallet.save();

    // store transaction
    try {
      const doc = await Transaction.create({
        userId: req.user._id,
        symbol: stock.symbol,
        fullName: stock.fullName,
        exchange: stock.exchange,
        symbolToken: stock.symbolToken,
        side: "SELL",
        quantity,
        price: executionPrice,
        orderType,
        product,
        variety,
        status: "EXECUTED",
        quantityBefore,
        quantityAfter: stock.quantity,
        avgPriceBefore,
        avgPriceAfter: stock.avgPrice,
        realizedPnl,
      });
      console.log("✅ Transaction SELL saved:", doc._id.toString());
    } catch (e) {
      console.warn("❌ Transaction log (SELL) failed:", e?.message || e);
    }

    res.json({ portfolio, walletBalance: wallet.balance });
  } catch (err) {
    console.error("Error in sell route:", err);
    res.status(400).json({ message: err.message });
  }
});

/**
 * List transactions for logged-in user
 * GET /api/portfolio/transactions
 */
router.get("/transactions", protect, async (req, res) => {
  try {
    const tx = await Transaction.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .lean();
    res.json(tx);
  } catch (err) {
    console.error("Error fetching transactions:", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
