# Corvin — Complete Deployment & Testing Runbook

Everything needed to go from zero to a fully running Corvin stack with all bugs verified.

---

## Architecture

```
You (CLI TUI) ──ws:4466──► Local Cluster ──ws:3000──► Corvin Server ──► Gemini AI
                                                             │
                                                           Redis (tool coordination)

Demo Services (independent):
  Orders Service  :3001
  Checkout Service :3002
```

---

## Prerequisites

| Requirement | Check | Notes |
|---|---|---|
| Node.js 20+ | `node -v` | Must be ≥ 20 |
| npm | `npm -v` | Comes with Node |
| Redis | `redis-cli ping` → `PONG` | See install options below |
| Gemini API Key | Already in `server/.env` | Get one at https://aistudio.google.com |

---

## Step 1 — Redis

Redis must be running before starting the server.

### Option A: Docker (recommended)
```bash
docker run -d --name corvin-redis -p 6379:6379 redis
```

### Option B: WSL
```bash
sudo apt update && sudo apt install redis-server
sudo service redis-server start
```

### Option C: Memurai (native Windows)
Download from https://www.memurai.com/ and install.

### Verify
```bash
redis-cli ping
# Expected: PONG
```

---

## Step 2 — Environment Variables

### `server/.env` (all values)

```env
NODE_ENV=development
PORT=3000
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_USERNAME=
REDIS_PASSWORD=
GEMINI_API_KEY=<your-key-here>
MINIMUM_CLI_VERSION=0.1.0
```

**How to get a Gemini API key:**
1. Go to https://aistudio.google.com
2. Click "Get API Key" → "Create API key"
3. Paste it at the `GEMINI_API_KEY=` line

The demo services and CLI have no additional `.env` files required for local operation.

---

## Step 3 — Known Bug Fix (Redis TLS)

`server/src/utils/redis.ts` shipped with `socket: { tls: true }` hardcoded, which causes a `ConnectionTimeoutError` against a local Redis instance.

**File:** `server/src/utils/redis.ts`

Replace the `createClient` call with:

```typescript
const redisUrl = config.redis_username && config.redis_password
  ? `redis://${config.redis_username}:${config.redis_password}@${config.redis_host}:${config.redis_port}`
  : `redis://${config.redis_host}:${config.redis_port}`;

const redisClient = createClient({ url: redisUrl });
```

This is already applied in this repo. If you ever see `ConnectionTimeoutError` with a `TLSSocket` in the server log, this is the cause.

---

## Step 4 — Install Dependencies

All `node_modules` are already installed. If you need to start fresh:

```bash
# Server
cd server && npm install

# CLI
cd cli && npm install --ignore-scripts   # --ignore-scripts skips node-pty native build

# Demo root
cd demo && npm install

# Demo sub-services
cd demo/orders-service && npm install
cd demo/checkout-service && npm install
```

> **Note on `node-pty`:** The CLI's `index.tsx` (log capture mode) requires `node-pty`, a native C++ module.
> Without it only `start-ui.tsx` (chat UI) works. To enable full support:
> ```bash
> npm install -g windows-build-tools
> cd cli && npm install
> ```

---

## Step 5 — Build Demo Services

The demo services must be compiled before they can run:

```bash
cd demo/orders-service && npm run build
cd demo/checkout-service && npm run build
```

Each outputs to its own `dist/` directory.

---

## Step 6 — Start Everything

Open **5 separate terminals** and run each command in its own terminal.

### Terminal 1 — Corvin Server
```bash
cd server
npm run dev
```
Expected output:
```
Redis Client Connected
Server listening on port 3000
Server Running in development mode
```

### Terminal 2 — Corvin CLI (AI Chat)
```bash
cd cli
npx tsx start-ui.tsx
```
This starts the local cluster WebSocket on `:4466` and shows the chat UI.

> To override the backend URL (point CLI at your local server instead of the hosted service):
> ```bash
> WEB_SOCKET_URL=ws://localhost:3000/v2/ws npx tsx start-ui.tsx
> ```

### Terminal 3 — Orders Service
```bash
cd demo/orders-service
node dist/index.js
```
Expected: `Orders service running on port 3001`

### Terminal 4 — Checkout Service
```bash
cd demo/checkout-service
node dist/index.js
```
Expected: `Checkout service running on port 3002`

### Terminal 5 — Bug Triggers / Testing
Use this terminal to trigger bugs and run health checks (see Step 7).

---

## Step 7 — Verify Everything is Up

Run these health checks before triggering bugs:

```bash
# Corvin server
curl http://localhost:3000/v2/api/health/
# Expected: {"success":true,"message":"Health check successful","uptime":...}

# Orders service
curl http://localhost:3001/health
# Expected: {"service":"orders","status":"healthy"}

# Checkout service
curl http://localhost:3002/health
# Expected: {"service":"checkout","status":"healthy"}

# Redis
redis-cli ping
# Expected: PONG
```

All four must pass before running tests.

---

## Step 8 — Test the Demo Bugs

All bug scripts live in `demo/test-scenarios/` and are run from the `demo/` directory.

### Bug 1 — Contract Drift (`fullName` vs `firstName`/`lastName`)

```bash
cd demo
npx tsx test-scenarios/contract-drift.ts
```

**What happens:** Checkout service sends `{ firstName, lastName }` but Orders service schema requires `{ fullName }`.

**Expected error:**
```json
{
  "error": "Checkout failed",
  "details": {
    "error": "Validation failed",
    "details": "\"fullName\" is required"
  }
}
```

**Ask Corvin:** `"Checkout is failing with fullName validation error"`

**Root cause:** Schema mismatch between services — a classic contract drift bug.

---

### Bug 2 — Missing EU Tax Configuration

```bash
cd demo
npx tsx test-scenarios/missing-tax.ts
```

**What happens:** A German (`DE`) order is placed, but `demo/orders-service/config/tax-config.json` only has entries for `US`, `CA`, and `GB`.

**Expected error:**
```json
{
  "error": "Checkout failed",
  "details": {
    "error": "Tax calculation failed: no configuration for country DE"
  }
}
```

**Ask Corvin:** `"Tax calculation failing for German orders"`

**Root cause:** `tax-config.json` is missing the `DE` key. Fix: add a `DE` entry to the config.

---

### Bug 3 — Payment Timeout Race Condition

```bash
cd demo
npx tsx test-scenarios/payment-timeout.ts
```

**What happens (takes ~4 seconds):**
```
T+0s  Order created (status: pending_payment)
T+0s  Payment processing starts
T+3s  Order timeout fires → order cancelled
T+4s  Payment completes → tries to update a cancelled order → fails
```

**Expected error:**
```json
{
  "error": "Payment succeeded but order update failed",
  "details": {
    "error": "Order already cancelled",
    "reason": "payment_timeout"
  }
}
```

**Ask Corvin:** `"Order was cancelled but payment succeeded"`

**Root cause:** `ORDER_TIMEOUT_MS = 3000` in orders-service, `PAYMENT_DELAY_MS = 4000` in checkout-service — the timeout is shorter than the payment processing time.

---

### Run All Bugs at Once

```bash
cd demo
npx tsx test-scenarios/contract-drift.ts
npx tsx test-scenarios/missing-tax.ts
npx tsx test-scenarios/payment-timeout.ts
```

---

## Ports Reference

| Port | Service |
|---|---|
| 3000 | Corvin Server (Fastify) |
| 4466 | Local Cluster WebSocket (started by CLI) |
| 3001 | Demo Orders Service |
| 3002 | Demo Checkout Service |
| 6379 | Redis |

---

## API Endpoints Reference

### Corvin Server (`localhost:3000`)
| Endpoint | Method | Description |
|---|---|---|
| `/v2/api/health/` | GET | Health check + uptime |
| `/v2/api/minimum-cli-version` | GET | Minimum CLI version requirement |
| `/v2/ws` | WebSocket | CLI ↔ Server communication channel |

### Orders Service (`localhost:3001`)
| Endpoint | Method | Description |
|---|---|---|
| `/health` | GET | Service health |
| `/api/orders` | POST | Create a new order |
| `/api/orders/:orderId` | GET | Get order by ID |
| `/api/orders/:orderId/payment` | POST | Update order with payment result |

### Checkout Service (`localhost:3002`)
| Endpoint | Method | Description |
|---|---|---|
| `/health` | GET | Service health |
| `/api/checkout` | POST | Process checkout (calls Orders internally) |

---

## Troubleshooting

### `Redis Client Error: ConnectionTimeoutError` with TLSSocket
The Redis client has `socket: { tls: true }` set. See **Step 3** above for the fix.

### `GEMINI_API_KEY is required`
The key is missing from `server/.env`. Fill in `GEMINI_API_KEY=your-key-here`.

### `Port 4466 already in use`
A previous CLI instance is still running. Find and kill it:
```bash
# Windows
netstat -ano | findstr :4466
taskkill /PID <pid> /F
```

### `Cannot find module './dist/index.js'`
The demo service hasn't been built. Run:
```bash
cd demo/orders-service && npm run build
cd demo/checkout-service && npm run build
```

### CLI can't connect to Corvin server
The CLI defaults to `wss://corvin-api.thatdevguy.in/v2/ws` (the hosted service). To point it at your local server:
```bash
WEB_SOCKET_URL=ws://localhost:3000/v2/ws npx tsx start-ui.tsx
```

### `node-pty` errors on `npm install`
Use `--ignore-scripts` to skip the native build:
```bash
cd cli && npm install --ignore-scripts
```
Note: log capture (`index.tsx`) won't work without `node-pty`, but the chat UI (`start-ui.tsx`) will.

### Demo services won't start
Ensure `npm install` and `npm run build` have been run in each sub-service directory.

---

## Quick Start (TL;DR)

```bash
# 1. Verify Redis is running
redis-cli ping

# 2. Start server (Terminal 1)
cd server && npm run dev

# 3. Build + start demo services (Terminals 3 & 4)
cd demo/orders-service && npm run build && node dist/index.js
cd demo/checkout-service && npm run build && node dist/index.js

# 4. Start CLI chat (Terminal 2)
cd cli && npx tsx start-ui.tsx

# 5. Verify all healthy
curl http://localhost:3000/v2/api/health/
curl http://localhost:3001/health
curl http://localhost:3002/health

# 6. Trigger bugs
cd demo
npx tsx test-scenarios/contract-drift.ts
npx tsx test-scenarios/missing-tax.ts
npx tsx test-scenarios/payment-timeout.ts
```
