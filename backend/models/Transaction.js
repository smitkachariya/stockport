import mongoose from "mongoose";
const txSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  symbol: String, fullName: String,
  side: { type: String, enum: ["BUY","SELL"], required: true },
  quantity: Number,
  price: Number,
  orderId: String,
  status: { type: String, enum: ["PENDING","EXECUTED","CANCELLED","REJECTED"], default: "PENDING" },
}, { timestamps: true });
export default mongoose.model("Transaction", txSchema);
