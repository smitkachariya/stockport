import mongoose from "mongoose";

const instrumentSchema = new mongoose.Schema({
  token: { type: String, required: true },
  symbol: { type: String, required: true },
  name: { type: String },
  exchange: { type: String, required: true },
});

const Instrument = mongoose.model("Instrument", instrumentSchema);
export default Instrument;
