import "dotenv/config";
import express from "express";
import cors from "cors";

import productsRoutes from "./routes/products.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";

import authRoutes from "./routes/auth.routes.js";
import { auth } from "./middleware/auth.js";
import ordersRoutes from "./routes/orders.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/debug/headers", (req, res) => {
  res.json(req.headers);
});


app.get("/health", (req, res) => {
  res.json({ ok: true, message: "ecom-api is running" });
});

app.use("/api/products", productsRoutes);
app.use(errorHandler);

app.use("/api/auth", authRoutes);

app.get("/api/me", auth, (req, res) => {
  res.json({ user: req.user });
});

app.use("/api/orders", ordersRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API listening on port ${PORT}`));
