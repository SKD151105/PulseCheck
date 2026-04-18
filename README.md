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
- Dark SaaS dashboard with skeleton loading and custom toast notifications

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
CLIENT_URL=http://localhost:5173
```

Create `client/.env`:

```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

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
