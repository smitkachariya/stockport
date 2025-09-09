import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import userRoutes from "./routes/userRoutes.js";
import stockRoutes from "./routes/stockRoutes.js";
import watchlistRoutes from "./routes/watchlistRoutes.js";
import portfolioRoutes from "./routes/portfolioRoutes.js";

dotenv.config();
connectDB(); // ✅ connect to MongoDB once

const app = express();
app.use(express.json());
app.use(cors());

// Routes
app.use("/api/users", userRoutes);
app.use("/api/stocks", stockRoutes);
app.use("/api/watchlists", watchlistRoutes);
app.use("/api/portfolio", portfolioRoutes);

// Test route
app.get("/", (req, res) => {
  res.send("API is running...");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
