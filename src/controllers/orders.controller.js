import { pool } from "../config/db.js";

export async function createOrder(req, res, next) {
  const client = await pool.connect();

  try {
    const userId = Number(req.user.sub);
    const items = req.body?.items;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "items must be a non-empty array" });
    }

    // Validate & normalize items, and ALSO combine duplicates
    // (prevents unique constraint error on (order_id, product_id))
    const qtyByProduct = new Map();

    for (const it of items) {
      const pid = Number(it.product_id);
      const qty = Number(it.quantity);

      if (!Number.isInteger(pid) || pid <= 0 || !Number.isInteger(qty) || qty <= 0) {
        return res.status(400).json({ error: "Each item needs valid product_id and quantity" });
      }

      qtyByProduct.set(pid, (qtyByProduct.get(pid) ?? 0) + qty);
    }

    const normalizedItems = Array.from(qtyByProduct.entries()).map(([product_id, quantity]) => ({
      product_id,
      quantity,
    }));

    await client.query("BEGIN");

    // Create order first
    const orderResult = await client.query(
      `INSERT INTO orders (user_id, status, total_cents)
       VALUES ($1, 'pending', 0)
       RETURNING id, user_id, status, total_cents, created_at`,
      [userId]
    );
    const order = orderResult.rows[0];

    let total = 0;

    // ATOMIC inventory decrement + price lookup per item
    for (const it of normalizedItems) {
      const pid = Number(it.product_id);
      const qty = Number(it.quantity);

      // Atomic update:
      // - Must exist
      // - Must be active
      // - Must have enough inventory
      // - Decrement happens in same statement
      const upd = await client.query(
        `UPDATE products
         SET inventory = inventory - $1,
             updated_at = NOW()
         WHERE id = $2
           AND is_active = TRUE
           AND inventory >= $1
         RETURNING id, price_cents`,
        [qty, pid]
      );

      if (upd.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          error: `Product ${pid} not available or insufficient inventory`,
        });
      }

      const unitPrice = Number(upd.rows[0].price_cents);
      total += unitPrice * qty;

      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price_cents)
         VALUES ($1, $2, $3, $4)`,
        [order.id, pid, qty, unitPrice]
      );
    }

    // Update order total
    const updatedOrder = await client.query(
      `UPDATE orders
       SET total_cents = $1
       WHERE id = $2
       RETURNING id, user_id, status, total_cents, created_at`,
      [total, order.id]
    );

    await client.query("COMMIT");
    res.status(201).json(updatedOrder.rows[0]);
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    next(err);
  } finally {
    client.release();
  }
}


export async function listMyOrders(req, res, next) {
  try {
    const userId = Number(req.user.sub);

    const { rows } = await pool.query(
      `SELECT id, status, total_cents, created_at
       FROM orders
       WHERE user_id = $1
       ORDER BY id DESC`,
      [userId]
    );

    res.json({ count: rows.length, data: rows });
  } catch (err) {
    next(err);
  }
}

export async function listAllOrders(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT o.id, o.user_id, u.email, o.status, o.total_cents, o.created_at
       FROM orders o
       JOIN users u ON u.id = o.user_id
       ORDER BY o.id DESC`
    );

    res.json({ count: rows.length, data: rows });
  } catch (err) {
    next(err);
  }
}

export async function getOrderById(req, res, next) {
  try {
    const orderId = Number(req.params.id);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({ error: "Invalid order id" });
    }

    const requesterId = Number(req.user.sub);
    const isAdmin = req.user.role === "admin";

    // Fetch order (and enforce ownership unless admin)
    const orderQuery = isAdmin
      ? `SELECT o.id, o.user_id, u.email, o.status, o.total_cents, o.created_at
         FROM orders o
         JOIN users u ON u.id = o.user_id
         WHERE o.id = $1`
      : `SELECT o.id, o.user_id, u.email, o.status, o.total_cents, o.created_at
         FROM orders o
         JOIN users u ON u.id = o.user_id
         WHERE o.id = $1 AND o.user_id = $2`;

    const orderParams = isAdmin ? [orderId] : [orderId, requesterId];
    const orderResult = await pool.query(orderQuery, orderParams);

    if (orderResult.rows.length === 0) {
      // Either doesn't exist, or user doesn't own it
      return res.status(404).json({ error: "Order not found" });
    }

    const order = orderResult.rows[0];

    // Fetch items for this order
    const itemsResult = await pool.query(
      `SELECT 
         oi.id,
         oi.product_id,
         p.name AS product_name,
         oi.quantity,
         oi.unit_price_cents,
         (oi.quantity * oi.unit_price_cents) AS line_total_cents
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = $1
       ORDER BY oi.id`,
      [orderId]
    );

    res.json({
      ...order,
      items: itemsResult.rows,
    });
  } catch (err) {
    next(err);
  }
}

