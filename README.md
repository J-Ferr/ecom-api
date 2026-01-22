# E-Commerce Backend API

A RESTful e-commerce backend built with **Node.js**, **Express**, and **PostgreSQL** featuring **JWT authentication**, **role-based authorization (admin/customer)**, and **atomic inventory control** during order creation.

---

## Features

- JWT auth: register/login
- Role-based access control:
  - **Admin**: manage products, view all orders
  - **Customer**: create orders, view own orders
- Products:
  - list + pagination + active filter
  - get by id
  - admin create/update/delete
- Orders:
  - create orders with line items
  - total calculation
  - **atomic inventory decrement** (prevents overselling)
  - list customer orders (`/orders/me`)
  - list all orders (admin)

---

## Tech Stack

- Node.js + Express
- PostgreSQL
- pg (node-postgres)
- JWT (`jsonwebtoken`)
- Password hashing (`bcrypt`)

---

## Getting Started

### 1) Install dependencies

```bash
npm install
2) Create .env
Create a .env file in the project root:

PORT=3000
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/ecom_api
JWT_SECRET=super_secret_change_me
Use your actual Postgres port (commonly 5432 or 5433).

3) Create DB + Tables
Using pgAdmin (recommended) or psql:

Create a database named: ecom_api

Run:

src/db/schema.sql

src/db/seed.sql (seeds sample products)

4) Start the server
npm run dev
Health check:

curl http://localhost:3000/health
API Overview
Base URL: http://localhost:3000

Auth
Register
POST /api/auth/register

curl -X POST "http://localhost:3000/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"test1@example.com","password":"password123"}'
Login
POST /api/auth/login

curl -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test1@example.com","password":"password123"}'
Use the token like:

Authorization: Bearer <TOKEN>
Current user (protected)
GET /api/me

curl "http://localhost:3000/api/me" \
  -H "Authorization: Bearer <TOKEN>"
Products
List products (public)
GET /api/products

Query params:

page (default 1)

limit (default 10, max 50)

active=true|false (optional)

curl "http://localhost:3000/api/products"
curl "http://localhost:3000/api/products?limit=2&page=1"
curl "http://localhost:3000/api/products?active=true"
Get product by id
GET /api/products/:id

curl "http://localhost:3000/api/products/1"
Create product (admin only)
POST /api/products

curl -X POST "http://localhost:3000/api/products" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -d '{"name":"Water Bottle","description":"24oz stainless steel","price_cents":2499,"inventory":20,"is_active":true}'
On Windows/Git Bash, run curl commands as a single line if headers get flaky.

Update product (admin only)
PUT /api/products/:id

curl -X PUT "http://localhost:3000/api/products/1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -d '{"price_cents":2199,"inventory":15}'
Delete product (admin only)
DELETE /api/products/:id

curl -X DELETE "http://localhost:3000/api/products/1" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
Orders
Create order (customer)
POST /api/orders

{
  "items": [
    { "product_id": 1, "quantity": 2 },
    { "product_id": 2, "quantity": 1 }
  ]
}
curl -X POST "http://localhost:3000/api/orders" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <CUSTOMER_TOKEN>" \
  -d '{"items":[{"product_id":1,"quantity":2},{"product_id":2,"quantity":1}]}'
Atomic Inventory
Inventory is decremented atomically using a single SQL statement per item:

prevents overselling under concurrent requests

fails the order if inventory is insufficient

List my orders (customer)
GET /api/orders/me

curl "http://localhost:3000/api/orders/me" \
  -H "Authorization: Bearer <CUSTOMER_TOKEN>"
List all orders (admin)
GET /api/orders

curl "http://localhost:3000/api/orders" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
Error Responses
{ "error": "message" }
Common codes:

400 invalid input

401 missing/invalid token

403 forbidden

404 not found

409 duplicate value

500 server error

Project Structure
src/
  config/
  controllers/
  middleware/
  routes/
  db/

---