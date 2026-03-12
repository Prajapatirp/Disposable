# Disposable Admin — Product Management System

A modern, responsive admin dashboard for managing disposable products, clients, orders, and billing.

## Tech Stack

- **Frontend:** Next.js 14 (App Router) + TypeScript
- **UI:** TailwindCSS + custom ShadCN-style components
- **Backend:** Next.js API routes
- **Database:** MongoDB with Mongoose
- **Auth:** Single admin login (JWT cookie)

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)

### Setup

1. **Clone and install**

   ```bash
   cd Disposable
   npm install
   ```

2. **Environment**

   Copy `.env.local.example` to `.env.local` and set `MONGODB_URI` and `JWT_SECRET`.

3. **Seed admin (optional)**

   To create the default admin in the database:

   ```bash
   npm run seed
   ```

   Default credentials:
   - **Email:** `admin123@yopmail.com`
   - **Password:** `Admin@123`

   (Alternatively, on first login with the same email/password from `.env.local`, the admin is created automatically.)

4. **Run**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000). You are redirected to `/admin/login`. After login you land on the dashboard.

## Routes

| Route | Description |
|-------|-------------|
| `/admin/login` | Admin login |
| `/admin/dashboard` | Dashboard overview |
| `/admin/products` | Product list (add/edit/delete, variants) |
| `/admin/products/new` | New product form |
| `/admin/clients` | Client list (add/edit/delete) |
| `/admin/clients/[id]` | Client profile + order history |
| `/admin/orders` | Orders (create, mark completed) |
| `/admin/orders/[id]` | Order detail |
| `/admin/billing` | Bills (generate, mark paid) |

## API Endpoints

- `POST/GET /api/auth/login` — Login (POST), session (GET via cookie)
- `POST /api/auth/logout` — Logout
- `GET /api/auth/me` — Current session
- `GET/POST /api/products` — List, create products
- `GET/PUT/DELETE /api/products/:id` — Get, update, delete product
- `GET/POST /api/clients` — List, create clients
- `GET/PUT/DELETE /api/clients/:id` — Get, update, delete client
- `GET/POST /api/orders` — List (optional `?status=Dispatch Stage`), create order
- `GET/PATCH /api/orders/:id` — Get order, update status
- `GET/POST /api/bills` — List (optional `?clientId=`), create bill
- `GET /api/bills/dispatched-orders?clientId=` — Dispatched orders for a client (for bill generation)
- `GET/PATCH /api/bills/:id` — Get bill, mark paid

## Workflows

- **Orders:** New order → status **Dispatch Stage**. After billing (see below), admin can mark **Completed** (or it’s set when a bill is generated for that order).
- **Billing:** Choose client → see dispatched orders → select orders → generate bill (bill number auto, total computed). Bill status **Pending** → admin marks **Paid** (and `paidDate` is set). Generating a bill sets those orders to **Completed**.

## Features

- Responsive layout (sidebar collapses on mobile)
- Reusable components: DataTable, Pagination, Filters, Modal, Buttons, Inputs, Select, StatusBadge
- Form validation with Zod + React Hook Form
- Toasts (Sonner) and loading states
- Protected admin routes; login required for dashboard and APIs
