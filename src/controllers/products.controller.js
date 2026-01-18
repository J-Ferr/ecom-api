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

export async function getProductById(req, res, next) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "Invalid product id" });
    }

    const { rows } = await pool.query(
      `SELECT id, name, description, price_cents, inventory, is_active
       FROM products
       WHERE id = $1`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function createProduct(req, res, next) {
  try {
    const { name, description = null, price_cents, inventory = 0, is_active = true } = req.body;

    if (!name || typeof name !== "string") {
      return res.status(400).json({ error: "name is required" });
    }
    const price = Number(price_cents);
    const inv = Number(inventory);

    if (!Number.isInteger(price) || price < 0) {
      return res.status(400).json({ error: "price_cents must be a non-negative integer" });
    }
    if (!Number.isInteger(inv) || inv < 0) {
      return res.status(400).json({ error: "inventory must be a non-negative integer" });
    }

    const { rows } = await pool.query(
      `INSERT INTO products (name, description, price_cents, inventory, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, description, price_cents, inventory, is_active`,
      [name, description, price, inv, Boolean(is_active)]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function updateProduct(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "Invalid product id" });
    }

    const { name, description, price_cents, inventory, is_active } = req.body;

    const fields = [];
    const params = [];
    let i = 1;

    if (name !== undefined) { fields.push(`name = $${i++}`); params.push(name); }
    if (description !== undefined) { fields.push(`description = $${i++}`); params.push(description); }
    if (price_cents !== undefined) { fields.push(`price_cents = $${i++}`); params.push(Number(price_cents)); }
    if (inventory !== undefined) { fields.push(`inventory = $${i++}`); params.push(Number(inventory)); }
    if (is_active !== undefined) { fields.push(`is_active = $${i++}`); params.push(Boolean(is_active)); }

    if (fields.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    params.push(id);

    const { rows } = await pool.query(
      `UPDATE products
       SET ${fields.join(", ")}, updated_at = NOW()
       WHERE id = $${i}
       RETURNING id, name, description, price_cents, inventory, is_active`,
      params
    );

    if (rows.length === 0) return res.status(404).json({ error: "Product not found" });

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function deleteProduct(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "Invalid product id" });
    }

    const { rowCount } = await pool.query(`DELETE FROM products WHERE id = $1`, [id]);
    if (rowCount === 0) return res.status(404).json({ error: "Product not found" });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
