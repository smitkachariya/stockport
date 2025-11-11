import mongoose from "mongoose";
const txSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    symbol: String,
    fullName: String,
    exchange: String,
    symbolToken: String,
    // Include wallet actions
    side: { type: String, enum: ["BUY", "SELL", "WALLET_ADD", "WALLET_WITHDRAW"], required: true },
    quantity: Number,
    price: Number, // execution price or wallet amount
    orderType: { type: String, enum: ["MARKET", "LIMIT"], default: "MARKET" },
    product: { type: String, default: "DELIVERY" },
    variety: { type: String, default: "NORMAL" },
    orderId: String,
    status: {
      type: String,
      enum: ["PENDING", "EXECUTED", "CANCELLED", "REJECTED"],
      default: "EXECUTED",
    },
    // portfolio snapshot
    quantityBefore: Number,
    quantityAfter: Number,
    avgPriceBefore: Number,
    avgPriceAfter: Number,
    // realized P&L on SELL
    realizedPnl: Number,
  },
  { timestamps: true }
);
export default mongoose.model("Transaction", txSchema);
