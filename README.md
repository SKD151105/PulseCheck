# PulseCheck

PulseCheck is a full-stack MERN uptime monitoring SaaS with a layered Node.js backend, Redis-backed request controls, WebSocket updates, and a production-style dashboard.

## Features

- JWT auth with bcrypt password hashing
- Layered backend architecture: Controller -> Service -> Repository -> Model
- Monitor creation, listing, deletion, and plan-based feature gating
- Background uptime checks with `node-cron`
- Check logs stored with response time and status history
- Redis rate limiting on auth and monitor creation
- Redis monitor list caching with short TTL
- Socket.io real-time monitor updates and status change events
- SaaS dashboard with skeleton loading and custom toast notifications

## Tech Stack

- Backend: Node.js, Express, MongoDB, Mongoose, Redis, ioredis, JWT, bcrypt, node-cron, Socket.io
- Frontend: React, Vite, Axios, React Router, socket.io-client

## Folder Structure

```text
PulseCheck/
|-- client/
|   |-- src/
|   |   |-- components/
|   |   |-- context/
|   |   |-- pages/
|   |   |-- services/
|   |   |-- App.jsx
|   |   |-- index.css
|   |   `-- main.jsx
|   |-- .env.example
|   `-- package.json
|-- server/
|   |-- src/
|   |   |-- config/
|   |   |-- middlewares/
|   |   |-- modules/
|   |   |   |-- auth/
|   |   |   |-- checks/
|   |   |   |-- monitors/
|   |   |   `-- subscription/
|   |   |-- sockets/
|   |   |-- utils/
|   |   |-- workers/
|   |   |-- app.js
|   |   `-- server.js
|   |-- .env.example
|   `-- package.json
`-- README.md
```

## Setup

### 1. Install dependencies

```bash
cd server
npm install

cd ../client
npm install
```

### 2. Configure environment variables

Create `server/.env`:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/pulsecheck
REDIS_URL=redis://127.0.0.1:6379
JWT_SECRET=replace_with_a_secure_secret
JWT_REFRESH_SECRET=replace_with_a_second_secure_secret
CLIENT_URL=http://localhost:5173
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Create `client/.env`:

```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

Stripe subscription upgrades use `POST /api/subscription/checkout` and Stripe webhooks at
`POST /api/subscription/webhook`. Manual plan PATCHes are blocked unless
`ALLOW_MANUAL_PLAN_UPDATES=true` is set for local/admin-only testing.

### Stripe test checkout

The app is configured for Stripe Checkout subscriptions. In test mode, clicking **Upgrade** opens a Stripe-hosted checkout page and no real money is charged. Use this test card for demos:

```text
Card: 4242 4242 4242 4242
Expiry: Any future date, such as 12/34
CVC: Any 3 digits
ZIP/postal code: Any value
```

For deployed demos, the backend must have `STRIPE_SECRET_KEY`, `STRIPE_PRO_PRICE_ID`, and `STRIPE_WEBHOOK_SECRET` set in Render, and the Stripe webhook endpoint should point to:

```text
https://your-render-backend.onrender.com/api/subscription/webhook
```

The webhook should listen for `checkout.session.completed`, `customer.subscription.updated`, and `customer.subscription.deleted`.

### 3. Run the backend

```bash
cd server
npm run dev
```

### 4. Run the frontend

```bash
cd client
npm run dev
```

## Architecture

- Controllers only shape HTTP request and response handling.
- Services contain validation, plan enforcement, cache invalidation, and monitoring logic.
- Repositories isolate MongoDB access.
- Models define the data layer.
- The cron worker processes due monitors, writes `CheckLog` entries, updates monitor status, and emits socket events to the owning user room.

## Environment Notes

- MongoDB and Redis must be running before the backend starts.
- To start Redis on your machine:

```powershell
cd C:\redis
.\redis-server.exe
```

- The worker runs every minute and only checks monitors whose interval window has elapsed.
- FREE plan: max 5 monitors, minimum 5 minute interval.
- PRO plan: max 50 monitors, minimum 1 minute interval.
- Sidebar navigation scrolls between dashboard sections and highlights the active section without changing the page URL.
