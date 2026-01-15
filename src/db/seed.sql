-- src/db/seed.sql
BEGIN;

-- Wipe existing rows (dev only)
TRUNCATE TABLE order_items RESTART IDENTITY CASCADE;
TRUNCATE TABLE orders RESTART IDENTITY CASCADE;
TRUNCATE TABLE products RESTART IDENTITY CASCADE;
TRUNCATE TABLE users RESTART IDENTITY CASCADE;

-- Admin user (password is temporary; we’ll create via API later too)
-- NOTE: this is NOT a real bcrypt hash. We'll generate real users via the /auth/register endpoint.
INSERT INTO users (email, password_hash, role)
VALUES
  ('admin@demo.com', 'TEMP_HASH_REPLACE_LATER', 'admin'),
  ('customer@demo.com', 'TEMP_HASH_REPLACE_LATER', 'customer');

-- Sample products
INSERT INTO products (name, description, price_cents, inventory, is_active)
VALUES
  ('Basic Tee', 'Soft cotton t-shirt', 1999, 50, TRUE),
  ('Hoodie', 'Cozy fleece hoodie', 4999, 25, TRUE),
  ('Cap', 'Adjustable strap cap', 1599, 100, TRUE),
  ('Sneakers', 'Everyday shoes', 7999, 10, TRUE),
  ('Sticker Pack', 'Set of 10 stickers', 599, 200, TRUE);

COMMIT;
