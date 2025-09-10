import mongoose from "mongoose";
const scripSchema = new mongoose.Schema({
  tradingsymbol: String,
  symboltoken: String,
  name: String,
  exchange: String,
}, { timestamps: true });
export default mongoose.model("MarketScrip", scripSchema);
