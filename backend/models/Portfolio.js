import mongoose from "mongoose";

const stockSchema = new mongoose.Schema({
  symbol: { type: String, required: true },          // Trading symbol (ex: WAAREE)
  symbolToken: { type: String, required: true },     // From instruments DB
  exchange: { type: String, default: "NSE" },        // Exchange name
  fullName: { type: String },                        // Company full name
  quantity: { type: Number, required: true },
  avgPrice: { type: Number, required: true }
});

const portfolioSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  stocks: [stockSchema],
});

const Portfolio = mongoose.model("Portfolio", portfolioSchema);

export default Portfolio;
