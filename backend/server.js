import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import userRoutes from "./routes/userRoutes.js";
import watchlistRoutes from "./routes/watchlistRoutes.js";
import portfolioRoutes from "./routes/portfolioRoutes.js";
import marketRoutes from "./routes/marketRoutes.js";
import instrumentRoutes from "./routes/instrumentRoutes.js";
import walletRoutes from "./routes/walletRoutes.js";
import streamRoutes from "./routes/streamRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import bodyParser from "body-parser";
import cors from "cors";

dotenv.config();
connectDB();

const app = express();

// CORS configuration
const isProd = (process.env.NODE_ENV || "development") === "production";
const corsOptions = {
  // In development, allow all origins (useful when accessing via LAN IP like http://192.168.x.x:5173)
  // In production, restrict to configured origins (comma-separated)
  origin: isProd
    ? process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim())
      : ["http://localhost:5173"]
    : true,
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/api/users", userRoutes);
app.use("/api/watchlists", watchlistRoutes);
app.use("/api/portfolio", portfolioRoutes);
app.use("/api/market", marketRoutes);
app.use("/api/instruments", instrumentRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/stream", streamRoutes);
app.use("/api/orders", orderRoutes);

// Health check endpoint
app.get("/", (req, res) =>
  res.json({
    message: "Stock Portfolio API is running",
    status: "success",
    timestamp: new Date().toISOString(),
  })
);

// API health check
app.get("/api/health", (req, res) =>
  res.json({
    message: "API is healthy",
    status: "success",
    timestamp: new Date().toISOString(),
  })
);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: "Something went wrong!",
    error:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Internal server error",
  });
});

// 404 handler (Express 5 + path-to-regexp v8: avoid '*' pattern)
app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
    status: "error",
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(
    `🌐 CORS enabled for: ${process.env.CORS_ORIGIN || "http://localhost:5173"}`
  );
});
