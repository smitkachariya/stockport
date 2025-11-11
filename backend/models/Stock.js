import mongoose from "mongoose";

const stockSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    symbol: {
      type: String,
      required: true, // e.g. "AAPL", "TCS"
    },
    name: {
      type: String,
      required: true, // e.g. "Apple Inc."
    },
    quantity: {
      type: Number,
      required: true,
      default: 0,
    },
    buyPrice: {
      type: Number,
      required: true,
    },
    currentPrice: {
      type: Number,
      default: 0, // we’ll later fetch this from API (AngelOne)
    },
  },
  { timestamps: true }
);

const Stock = mongoose.model("Stock", stockSchema);

export default Stock;
