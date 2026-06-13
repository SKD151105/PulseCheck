<p align="center">
	<img src="./assets/pulsecheck-banner.svg" alt="PulseCheck banner" />
</p>

<p align="center">
	<img src="https://img.shields.io/badge/Stack-MERN-0f766e?style=for-the-badge" alt="MERN" />
	<img src="https://img.shields.io/badge/Backend-Node%20%2B%20Express-111827?style=for-the-badge&logo=nodedotjs" alt="Backend" />
	<img src="https://img.shields.io/badge/Database-MongoDB-14532d?style=for-the-badge&logo=mongodb" alt="MongoDB" />
	<img src="https://img.shields.io/badge/Cache-Redis-7f1d1d?style=for-the-badge&logo=redis" alt="Redis" />
	<img src="https://img.shields.io/badge/Realtime-Socket.io-0f172a?style=for-the-badge&logo=socketdotio" alt="Socket.io" />
	<img src="https://img.shields.io/badge/Frontend-React%20%2B%20Vite-1e3a8a?style=for-the-badge&logo=react" alt="Frontend" />
</p>

## What Is PulseCheck

PulseCheck is a production-style uptime monitoring SaaS that tracks website health, logs response times, and delivers live status updates through WebSockets. The system is designed as a layered backend with clear separation of concerns, Redis-backed controls, and a client dashboard focused on clarity and speed.

## Table of Contents

1. Product Vision
2. Feature Highlights
3. Realtime Monitoring Flow
4. Tech Stack
5. Architecture
6. Project Structure
7. API Surface
8. Environment Variables
9. Local Setup
10. Stripe Subscription Notes
11. Operational Notes
12. Roadmap

## Product Vision

PulseCheck is built for makers who need a clean, reliable visibility layer for their services:

- Monitor uptime and response time with minimal configuration.
- Receive realtime status updates without dashboard refresh.
- Enforce plan limits and interval rules in a clear, auditable way.
- Personalize the workspace with interactive UI style toggles (Standard & Neumorphic).

## Feature Highlights

| Domain | Capability | Details |
| --- | --- | --- |
| Auth | JWT sessions with Google OAuth support | Email/password + Google sign-in, refresh, logout |
| Plans | FREE and PRO plan rules | Monitor limits and interval enforcement |
| Monitoring | Scheduled uptime checks | Background worker executes due monitors |
| Telemetry | Check logs with response timing | Status history and latency tracking |
| Realtime | Socket.io status updates | Live monitor status changes per user |
| Performance | Redis rate limiting and caching | Throttled auth and cached monitor lists |
| UI & Theming | Dashboard with style customization | Fast feedback, custom toasts, and a toggle between modern flat and Neumorphic design themes |

## Realtime Monitoring Flow

```mermaid
flowchart TD
	A[User creates monitor] --> B[Monitor stored in MongoDB]
	B --> C[Cron worker schedules checks]
	C --> D[HTTP request to target]
	D --> E[CheckLog stored]
	E --> F[Monitor status updated]
	F --> G[Socket.io event emitted]
	G --> H[Dashboard updates in realtime]
```

## Tech Stack

### Frontend (client)

- React
- Vite
- React Router
- Axios
- socket.io-client

### Backend (server)

- Node.js + Express
- MongoDB + Mongoose
- Redis + ioredis
- JWT + bcrypt
- node-cron
- Socket.io

## Architecture

### Backend Layering

- Controllers: HTTP request and response shaping
- Services: business rules, plan enforcement, cache invalidation
- Repositories: MongoDB data access
- Models: schema and persistence
- Workers: interval-driven uptime checks and status updates

### Realtime Updates

- User rooms are established on socket connection
- Status changes emit targeted events to the owning user room
- The client listens and patches the local state for instant UI feedback

## Project Structure

# Project Structure

```text
PulseCheck/
├── assets/                               # Static assets (icons, images, banners, etc.)
├── client/                               # Frontend application
└── server/
    └── src/
        ├── config/                       # App configuration files
        │   ├── db.js                     # Database connection setup
        │   └── redis.js                  # Redis client configuration
        │
        ├── middlewares/                  # Express middlewares
        │   ├── auth.middleware.js        # Authentication & authorization middleware
        │   ├── error.middleware.js       # Global error handling middleware
        │   ├── rateLimit.middleware.js   # API rate limiting
        │   └── request.middleware.js     # Request validation/logging middleware
        │
        ├── modules/                      # Feature-based modules
        │   ├── alerts/                   # Alert management system
        │   ├── analytics/                # Analytics & reporting
        │   ├── auth/                     # Authentication module
        │   ├── checks/                   # Health/status check logic
        │   ├── incidents/                # Incident tracking & management
        │   ├── monitors/                 # Monitoring services & uptime checks
        │   └── subscription/             # Subscription & billing module
        │
        ├── sockets/
        │   └── socket.js                 # WebSocket / Socket.IO configuration
        │
        ├── utils/                        # Utility/helper functions
        │   ├── ApiError.js               # Custom API error class
        │   ├── asyncHandler.js           # Async error wrapper
        │   ├── constants.js              # Application constants
        │   └── logger.js                 # Logging utility
        │
        ├── workers/
        │   └── monitor.worker.js         # Background monitoring worker
        │
        ├── app.js                        # Express app initialization
        └── server.js                     # Server entry point
```

## API Surface

Base URL (development): http://localhost:5000/api

### Auth

- POST /auth/register
- POST /auth/login
- POST /auth/google
- POST /auth/refresh
- POST /auth/logout
- GET /auth/me

### Monitors

- GET /monitors
- POST /monitors
- DELETE /monitors/:id

### Checks

- GET /checks/:monitorId

### Subscription

- POST /subscription/checkout
- POST /subscription/webhook

## Environment Variables

### Server (.env in server/)

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/pulsecheck
REDIS_URL=redis://127.0.0.1:6379
JWT_SECRET=replace_with_a_secure_secret
JWT_REFRESH_SECRET=replace_with_a_second_secure_secret
GOOGLE_CLIENT_ID=your_google_oauth_client_id
CLIENT_URL=http://localhost:5173
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
ALLOW_MANUAL_PLAN_UPDATES=false
```

### Client (.env in client/)

```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id
```

## Local Setup

### Prerequisites

- Node.js 18+
- MongoDB
- Redis
- Stripe account for subscription testing

### 1) Install dependencies

```bash
cd server
npm install

cd ../client
npm install
```

### 2) Start backend

```bash
cd server
npm run dev
```

### 3) Start frontend

```bash
cd client
npm run dev
```

Typical frontend dev URL: http://localhost:5173

## Stripe Subscription Notes

- Checkout endpoint: POST /api/subscription/checkout
- Webhook endpoint: POST /api/subscription/webhook
- Manual plan changes are blocked unless `ALLOW_MANUAL_PLAN_UPDATES=true`

### Stripe test checkout

```text
Card: 4242 4242 4242 4242
Expiry: Any future date, such as 12/34
CVC: Any 3 digits
ZIP/postal code: Any value
```

Webhook event types:

- checkout.session.completed
- customer.subscription.updated
- customer.subscription.deleted

## Operational Notes

- MongoDB and Redis must be running before the backend starts.
- The worker runs every minute and checks only due monitors.
- FREE plan: max 5 monitors, minimum 5 minute interval.
- PRO plan: max 50 monitors, minimum 1 minute interval.
- Sidebar navigation scrolls between dashboard sections without changing the URL.
- **UI Styling:** Users can toggle between standard and Neumorphic design themes, instantly altering the visual layout without requiring a page reload.

## Roadmap

- Add analytics filters and pagination on long lists
- Expand notification channels beyond dashboard updates
- Add tests for service and worker logic
