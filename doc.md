# Corvin - Setup & Development Guide

## What is Corvin?

Corvin is an AI-powered debugging platform with 3 components:

- **Server** (`server/`) - Fastify backend that connects to Gemini AI, coordinates tool execution via Redis
- **CLI** (`cli/`) - Terminal UI (React + Ink) that captures logs, runs commands, and provides a chat interface
- **Demo** (`demo/`) - Two sample microservices with planted bugs for testing

```
You (CLI TUI) --> Local Cluster (ws://4466) --> Corvin Server (:3000) --> Gemini API
                                                     |
                                                   Redis (tool coordination)
```

---

## Prerequisites

| Requirement | Status | How to get it |
|---|---|---|
| Node.js 20+ | Installed (v20.20.0) | https://nodejs.org |
| npm | Installed (v11.10.0) | Comes with Node.js |
| Redis | **YOU NEED TO INSTALL** | See below |
| Gemini API Key | **YOU NEED TO GET** | https://aistudio.google.com |

---

## Step 1: Install Redis

Redis is required for the server to coordinate tool execution between the AI and CLI.

### Option A: Docker (recommended for Windows)
```bash
docker run -d --name corvin-redis -p 6379:6379 redis
```

### Option B: WSL
```bash
# In WSL terminal
sudo apt update && sudo apt install redis-server
sudo service redis-server start
```

### Option C: Memurai (native Windows Redis alternative)
Download from https://www.memurai.com/ and install.

### Verify Redis is running:
```bash
redis-cli ping
# Should respond: PONG
```

---

## Step 2: Get a Gemini API Key

1. Go to https://aistudio.google.com
2. Click "Get API Key" -> "Create API key"
3. Copy the key
4. Paste it in `server/.env`:

```
GEMINI_API_KEY=your-key-here
```

The `.env` file is already created at `server/.env` - you just need to fill in the key.

---

## Step 3: Dependencies (already done)

Dependencies have been installed. If you ever need to reinstall:

```bash
# From project root
cd server && npm install
cd ../cli && npm install
cd ../demo && npm install
```

For the demo sub-services:
```bash
cd demo/orders-service && npm install
cd ../checkout-service && npm install
```

---

## Step 4: Start the Server

```bash
cd server
npm run dev
```

This starts the Fastify server on `http://localhost:3000` with hot reload.

You should see:
```
Server listening on port 3000
Server Running in development mode
```

---

## Step 5: Start the CLI

Open a **new terminal**:

```bash
cd cli

# Option A: Start the AI chat interface (starts local cluster on :4466)
npx tsx start-ui.tsx

# Option B: Start via the bin entry point
node bin/corvin.js
```

The CLI starts a WebSocket server on port 4466 (local cluster) and shows the chat UI.

---

## Step 6: Run a Service with Debugging

Open a **third terminal**:

```bash
cd cli

# Run any command with log capture
npx tsx index.tsx npm run dev

# Or for the demo:
cd ../demo/orders-service
npx tsx ../../cli/index.tsx npm run dev
```

---

## Testing with the Demo

The demo has two microservices with 3 planted bugs. Here's how to test:

### Quick Test (manual terminals)

**Terminal 1** - Start Corvin server:
```bash
cd server
npm run dev
```

**Terminal 2** - Start Corvin CLI (AI chat):
```bash
cd cli
npx tsx start-ui.tsx
```

**Terminal 3** - Start Orders service:
```bash
cd demo/orders-service
npm install && npm run build && npm start
```

**Terminal 4** - Start Checkout service:
```bash
cd demo/checkout-service
npm install && npm run build && npm start
```

**Terminal 5** - Trigger a bug:
```bash
cd demo

# Bug 1: Contract Drift (fullName vs firstName/lastName)
npm run demo:bug1

# Bug 2: Missing EU Tax Config
npm run demo:bug2

# Bug 3: Payment Timeout Race Condition
npm run demo:bug3
```

Then go to the CLI chat (Terminal 2) and ask about the error.

### Example Questions to Ask Corvin:
- "Checkout is failing with fullName validation error" (Bug 1)
- "Tax calculation failing for German orders" (Bug 2)
- "Order was cancelled but payment succeeded" (Bug 3)

---

## Project Structure

```
Corvin/
|-- server/                  # AI backend (Fastify + Gemini)
|   |-- src/
|   |   |-- services/        # AI SDK query, system prompt
|   |   |-- plugins/         # WebSocket handler
|   |   |-- apis/            # REST endpoints
|   |   |-- config/          # Environment config
|   |   +-- utils/           # Redis, socket manager
|   |-- .env                 # YOUR CONFIG HERE
|   +-- package.json
|
|-- cli/                     # Terminal UI (React + Ink)
|   |-- bin/corvin.js        # Main entry point
|   |-- src/                 # Components, hooks, context
|   |-- helpers/             # Config, YAML helpers
|   |-- start-ui.tsx         # Chat-only UI entry
|   |-- index.tsx            # Log capture UI entry
|   +-- websocket-server.ts  # Local cluster server
|
+-- demo/                    # Bug demo
    |-- orders-service/      # Express service (port 3001)
    |-- checkout-service/    # Express service (port 3002)
    +-- test-scenarios/      # Bug trigger scripts
```

---

## Configuration Files

### `server/.env`
```bash
NODE_ENV=development
PORT=3000
REDIS_HOST=localhost
REDIS_PORT=6379
GEMINI_API_KEY=        # <-- YOU FILL THIS
```

### `~/.corvin/config` (created by CLI on first run)
```
API_KEY=               # Your Corvin API key (for hosted service)
```

### `corvin.yaml` (per-service, in each project root)
```yaml
id: "corvin-service"
description: "my service description"
name: "ServiceName"
window_id: 1234567890
logs_available: true
code_available: true
```

---

## Available Scripts

### Server
| Command | Description |
|---|---|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Build with SWC to `dist/` |
| `npm run build:tsc` | Build with TypeScript to `build/` |
| `npm start` | Run production build |

### CLI
| Command | Description |
|---|---|
| `npx tsx start-ui.tsx` | Start chat-only interface |
| `npx tsx index.tsx <cmd>` | Run command with log capture |
| `npm run build` | Build to `dist/` |

### Demo
| Command | Description |
|---|---|
| `npm run demo:bug1` | Trigger Contract Drift bug |
| `npm run demo:bug2` | Trigger Missing Tax Config bug |
| `npm run demo:bug3` | Trigger Payment Timeout Race bug |

---

## Ports Used

| Port | Service |
|---|---|
| 3000 | Corvin Server (Fastify) |
| 4466 | Local Cluster (WebSocket) |
| 3001 | Demo Orders Service |
| 3002 | Demo Checkout Service |

---

## Environment Variables

| Variable | Where | Description |
|---|---|---|
| `GEMINI_API_KEY` | server/.env | Required. Your Gemini API key |
| `REDIS_HOST` | server/.env | Redis host (default: localhost) |
| `REDIS_PORT` | server/.env | Redis port (default: 6379) |
| `PORT` | server/.env | Server port (default: 3000) |
| `CORVIN_CLUSTER_URL` | CLI env | Override cluster URL (default: ws://127.0.0.1:4466) |
| `CORVIN_WS_PORT` | CLI env | Override cluster port (default: 6111) |

---

## Troubleshooting

### "GEMINI_API_KEY is required"
You haven't set the API key in `server/.env`. Get one from https://aistudio.google.com.

### "Redis connection refused"
Redis isn't running. Start it with `docker run -d -p 6379:6379 redis` or install it locally.

### "Port 4466 already in use"
Another Corvin CLI instance is running. Kill it or use a different port.

### CLI `npm install` fails with `node-pty` error
`node-pty` is a native module that needs C++ build tools on Windows. Fix:
```bash
# Option 1: Install with --ignore-scripts (already done)
cd cli && npm install --ignore-scripts

# Option 2: Install Windows build tools (enables full node-pty support)
npm install -g windows-build-tools
# Then retry: cd cli && npm install
```
Note: Without `node-pty`, the CLI log capture (`index.tsx`) won't work, but the chat UI (`start-ui.tsx`) will.

### CLI can't connect to server
Make sure the server is running on port 3000. Check that `WEB_SOCKET_URL` in CLI config points to `ws://localhost:3000/v2/ws`.

### Demo services won't start
Run `npm install` and `npm run build` in each service directory first.

---

## What YOU Need To Do

1. **Install Redis** (Docker recommended: `docker run -d -p 6379:6379 redis`)
2. **Get a Gemini API key** from https://aistudio.google.com
3. **Paste the key** into `server/.env` at the `GEMINI_API_KEY=` line
4. **Start the server**: `cd server && npm run dev`
5. **Start the CLI**: `cd cli && npx tsx start-ui.tsx` (in a new terminal)
6. **Test with demo**: Follow the "Testing with the Demo" section above
