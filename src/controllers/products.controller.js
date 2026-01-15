import { pool } from "../config/db.js";

export async function listProducts(req, res, next) {
  try {
    const page = Math.max(parseInt(req.query.page ?? "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit ?? "10", 10), 1), 50);
    const offset = (page - 1) * limit;

    const isActive = req.query.active;
    const where = isActive === undefined ? "" : "WHERE is_active = $1";
    const params = isActive === undefined ? [limit, offset] : [isActive === "true", limit, offset];

    const query = isActive === undefined
      ? `SELECT id, name, description, price_cents, inventory, is_active
         FROM products
         ORDER BY id
         LIMIT $1 OFFSET $2`
      : `SELECT id, name, description, price_cents, inventory, is_active
         FROM products
         ${where}
         ORDER BY id
         LIMIT $2 OFFSET $3`;

    const { rows } = await pool.query(query, params);

    res.json({
      page,
      limit,
      count: rows.length,
      data: rows,
    });
  } catch (err) {
    next(err);
  }
}
