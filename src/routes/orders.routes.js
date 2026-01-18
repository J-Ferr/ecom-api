import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { createOrder, listMyOrders, listAllOrders } from "../controllers/orders.controller.js";

const router = Router();

// customer
router.post("/", auth, createOrder);
router.get("/me", auth, listMyOrders);

// admin
router.get("/", auth, requireAdmin, listAllOrders);

export default router;
