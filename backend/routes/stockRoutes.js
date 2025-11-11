import express from "express";
import {
  addStock,
  getStocks,
  deleteStock,
} from "../controllers/stockController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router
  .route("/")
  .post(protect, addStock) // Add stock
  .get(protect, getStocks); // Get user stocks

router.route("/:id").delete(protect, deleteStock); // Delete stock

export default router;
