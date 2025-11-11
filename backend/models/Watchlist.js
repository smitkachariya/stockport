import mongoose from "mongoose";

const watchlistSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    stocks: [
      {
        symbol: { type: String, required: true }, // e.g., WAAREE
        fullName: { type: String, required: true }, // e.g., Waaree Energies
      },
    ],
  },
  { timestamps: true }
);

watchlistSchema.index({ name: 1, userId: 1 }, { unique: true });

const Watchlist = mongoose.model("Watchlist", watchlistSchema);
export default Watchlist;
