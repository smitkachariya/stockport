import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import userRoutes from "./routes/userRoutes.js";
import watchlistRoutes from "./routes/watchlistRoutes.js";
import portfolioRoutes from "./routes/portfolioRoutes.js";
import marketRoutes from "./routes/marketRoutes.js";
import instrumentRoutes from "./routes/instrumentRoutes.js"

dotenv.config();
connectDB();

const app = express();
app.use(express.json());

app.use("/api/users", userRoutes);
app.use("/api/watchlists", watchlistRoutes);
app.use("/api/portfolio", portfolioRoutes);
app.use("/api/market", marketRoutes);
app.use("/api/instruments",instrumentRoutes);

app.get("/", (req, res) => res.send("API running"));
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server ${PORT}`));
