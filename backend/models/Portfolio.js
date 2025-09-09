import mongoose from "mongoose";

const portfolioSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    stocks: [
      {
        symbol: { type: String, required: true },
        fullName: { type: String, required: true },
        quantity: { type: Number, required: true },
        avgPrice: { type: Number, required: true },
      },
    ],
  },
  { timestamps: true }
);

const Portfolio = mongoose.model("Portfolio", portfolioSchema);
export default Portfolio;
