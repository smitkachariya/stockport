import express from "express";
import Watchlist from "../models/Watchlist.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * Create new watchlist
 * POST /api/watchlists
 */
router.post("/", protect, async (req, res) => {
  try {
    const watchlist = await Watchlist.create({
      name: req.body.name,
      userId: req.user._id,
      stocks: [],
    });
    res.status(201).json(watchlist);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

/**
 * Get all watchlists of logged-in user
 * GET /api/watchlists
 */
router.get("/", protect, async (req, res) => {
  try {
    const watchlists = await Watchlist.find({ userId: req.user._id });
    res.json(watchlists);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * Add stock to a watchlist
 * POST /api/watchlists/:id/stocks
 */
router.post("/:id/stocks", protect, async (req, res) => {
  try {
    const watchlist = await Watchlist.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!watchlist) {
      return res.status(404).json({ message: "Watchlist not found" });
    }

    const alreadyExists = watchlist.stocks.some(
      (s) => s.symbol === req.body.symbol
    );
    if (alreadyExists) {
      return res
        .status(400)
        .json({ message: "Stock already exists in this watchlist" });
    }

    watchlist.stocks.push({
      symbol: req.body.symbol,
      fullName: req.body.fullName,
    });

    await watchlist.save();
    res.json(watchlist);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * Remove stock from watchlist
 * DELETE /api/watchlists/:id/stocks/:symbol
 */
router.delete("/:id/stocks/:symbol", protect, async (req, res) => {
  try {
    const watchlist = await Watchlist.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!watchlist)
      return res.status(404).json({ message: "Watchlist not found" });

    watchlist.stocks = watchlist.stocks.filter(
      (s) => s.symbol !== req.params.symbol
    );

    await watchlist.save();
    res.json(watchlist);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

/**
 * Delete a watchlist
 * DELETE /api/watchlists/:id
 */
router.delete("/:id", protect, async (req, res) => {
  try {
    const watchlist = await Watchlist.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!watchlist)
      return res.status(404).json({ message: "Watchlist not found" });

    res.json({ message: "Watchlist deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * Rename a watchlist
 * PUT /api/watchlists/:id
 */
router.put("/:id", protect, async (req, res) => {
  try {
    const watchlist = await Watchlist.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!watchlist) {
      return res.status(404).json({ message: "Watchlist not found" });
    }

    watchlist.name = req.body.name || watchlist.name;

    await watchlist.save();
    res.json(watchlist);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
