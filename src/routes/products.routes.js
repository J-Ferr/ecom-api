import { Router } from "express";
import {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/products.controller.js";

import { auth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/requireAdmin.js";

const router = Router();

router.get("/", listProducts);
router.get("/:id", getProductById);

// admin
router.post("/", auth, requireAdmin, createProduct);
router.put("/:id", auth, requireAdmin, updateProduct);
router.delete("/:id", auth, requireAdmin, deleteProduct);

export default router;

