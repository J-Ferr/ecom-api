import { pool } from "../config/db.js";

export async function createOrder(req, res, next) {
  const client = await pool.connect();

  try {
    const userId = Number(req.user.sub);
    const items = req.body?.items;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "items must be a non-empty array" });
    }

    // Validate items
    for (const it of items) {
      const pid = Number(it.product_id);
      const qty = Number(it.quantity);
      if (!Number.isInteger(pid) || pid <= 0 || !Number.isInteger(qty) || qty <= 0) {
        return res.status(400).json({ error: "Each item needs valid product_id and quantity" });
      }
    }

    await client.query("BEGIN");

    // Create order first
    const orderResult = await client.query(
      `INSERT INTO orders (user_id, status, total_cents)
       VALUES ($1, 'pending', 0)
       RETURNING id, user_id, status, total_cents, created_at`,
      [userId]
    );
    const order = orderResult.rows[0];

    // Fetch product info for all requested product_ids
    const productIds = items.map(i => Number(i.product_id));
    const productsResult = await client.query(
      `SELECT id, price_cents, inventory, is_active
       FROM products
       WHERE id = ANY($1::bigint[])`,
      [productIds]
    );

    const productMap = new Map(productsResult.rows.map(p => [Number(p.id), p]));

    let total = 0;

    // Insert order items + compute totals + check inventory
    for (const it of items) {
      const pid = Number(it.product_id);
      const qty = Number(it.quantity);

      const p = productMap.get(pid);
      if (!p) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: `Product ${pid} not found` });
      }
      if (!p.is_active) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: `Product ${pid} is not active` });
      }
      if (p.inventory < qty) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: `Not enough inventory for product ${pid}` });
      }

      total += p.price_cents * qty;

      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price_cents)
         VALUES ($1, $2, $3, $4)`,
        [order.id, pid, qty, p.price_cents]
      );

      // Reduce inventory (simple approach)
      await client.query(
        `UPDATE products
         SET inventory = inventory - $1, updated_at = NOW()
         WHERE id = $2`,
        [qty, pid]
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
    try { await client.query("ROLLBACK"); } catch {}
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

