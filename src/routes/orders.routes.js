import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { createOrder, listMyOrders, listAllOrders, getOrderById } from "../controllers/orders.controller.js";

const router = Router();

// customer
router.post("/", auth, createOrder);
router.get("/me", auth, listMyOrders);
router.get("/:id", auth, getOrderById);

// admin
router.get("/", auth, requireAdmin, listAllOrders);

export default router;
