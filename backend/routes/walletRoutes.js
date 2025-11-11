import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import Wallet from "../models/Wallet.js";
import Transaction from "../models/Transaction.js";

const router = express.Router();

// Get current wallet balance
router.get("/", protect, async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ userId: req.user._id });
    res.json({ balance: wallet?.balance || 0 });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Adjust wallet: type = 'add' | 'withdraw', amount > 0
router.post("/adjust", protect, async (req, res) => {
  try {
    const { type, amount } = req.body;
    const amt = Number(amount);
    if (!type || !(type === "add" || type === "withdraw")) {
      return res.status(400).json({ message: "Invalid type. Use 'add' or 'withdraw'" });
    }
    if (!(amt > 0)) return res.status(400).json({ message: "Amount must be > 0" });

    let wallet = await Wallet.findOne({ userId: req.user._id });
    if (!wallet) wallet = await Wallet.create({ userId: req.user._id, balance: 0 });

    if (type === "withdraw" && wallet.balance < amt) {
      return res.status(400).json({ message: "Insufficient wallet balance" });
    }

    wallet.balance += type === "add" ? amt : -amt;
    await wallet.save();

    // Log transaction for wallet movement
    try {
      await Transaction.create({
        userId: req.user._id,
        symbol: "WALLET",
        fullName: "Wallet",
        side: type === "add" ? "WALLET_ADD" : "WALLET_WITHDRAW",
        quantity: 1,
        price: amt,
        status: "EXECUTED",
      });
    } catch (e) {
      console.warn("Wallet transaction log failed:", e?.message || e);
    }

    res.json({ balance: wallet.balance });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;