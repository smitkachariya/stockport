import Stock from "../models/Stock.js";

// @desc    Add new stock
// @route   POST /api/stocks
// @access  Private
export const addStock = async (req, res) => {
  try {
    const stock = await Stock.create({
      user: req.user._id,
      name: req.body.name,
      symbol: req.body.symbol,
      quantity: req.body.quantity,
      buyPrice: req.body.buyPrice,
    });
    res.status(201).json(stock);
  } catch (error) {
    console.error("❌ Error in addStock:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get user stocks
// @route   GET /api/stocks
// @access  Private
export const getStocks = async (req, res) => {
  try {
    const stocks = await Stock.find({ user: req.user._id });
    res.json(stocks);
  } catch (error) {
    console.error("❌ Error in getStocks:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Delete stock
// @route   DELETE /api/stocks/:id
// @access  Private
// controllers/stockController.js

// @desc    Delete a stock
// @route   DELETE /api/stocks/:id
// @access  Private
export const deleteStock = async (req, res) => {
  try {
    const stock = await Stock.findById(req.params.id);

    if (!stock) {
      return res.status(404).json({ message: "Stock not found" });
    }

    // Make sure the stock belongs to the logged-in user
    if (stock.user.toString() !== req.user.id) {
      return res.status(401).json({ message: "Not authorized" });
    }

    await stock.deleteOne();
    res.json({ message: "Stock removed successfully" });
  } catch (error) {
    console.error("❌ Error in deleteStock:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};
