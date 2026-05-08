# Corvin CLI — Daily Usage Guide

Corvin is an AI-powered debugger that wraps your running services, streams their logs, reads your code, and lets you ask questions about bugs — all from the terminal.

---

## Installation

```bash
npm install -g corvin-cli
```

Verify:

```bash
corvin --version
```

---

## First-Time Setup

### 1. Initialize the config directory

Run this once on a new machine:

```bash
corvin init
```

It creates `~/.corvin/config` where your API key lives. It also walks you through creating a `corvin.yaml` for the current project.

### 2. Add your API key

Edit `~/.corvin/config`:

```
API_KEY=your_api_key_here
```

Get your key from the Corvin web studio.

---

## Core Concepts

| Concept | What it is |
|---|---|
| **Corvin server** | A local WebSocket server (port 4466) that all your running services connect to. Run it once per machine session. |
| **Wrapped process** | Any process started with `corvin <command>`. Its logs are streamed to the server. |
| **corvin.yaml** | A file in each project directory that tells Corvin what the service is and which project group it belongs to. |
| **Project ID** | A shared identifier in `corvin.yaml`. Services with the same ID are grouped together in the debugger UI. |

---

## Daily Workflow

### Step 1 — Start the Corvin server + UI

Open a dedicated terminal and run:

```bash
corvin
```

This starts the local WebSocket server and opens the interactive TUI. Keep this terminal open as long as you're working.

### Step 2 — Start your services (wrapped)

In each service directory, replace your normal start command with `corvin <your-command>`:

```bash
# Instead of: npm run dev
corvin npm run dev

# Instead of: node server.js
corvin node server.js

# Instead of: python app.py
corvin python app.py
```

Each wrapped process automatically registers itself with the Corvin server. The TUI will show it as a connected service.

### Step 3 — Debug

When something breaks, go to the Corvin TUI terminal and ask a question:

```
Why is the checkout request failing with a validation error?
```

```
There's a race condition between payment and order timeout — find it
```

```
Tax calculation is failing for German orders, what's missing?
```

The AI reads logs from all connected services plus the codebase in each registered directory, then gives you a root-cause analysis with file paths and line numbers.

---

## Setting Up a New Project

When you run `corvin <command>` in a directory that has no `corvin.yaml`, Corvin will prompt you to describe the service and auto-generate the file.

To set it up manually beforehand:

```bash
cd my-service
corvin init
```

You'll be asked for:
- A **project ID** — use the same value across all services that should be debugged together
- A **description** — plain-language description of what this service does

This creates a `corvin.yaml` in the current directory:

```yaml
id: "my-app"
description: "REST API for user authentication, handles login and JWT issuance"
name: "AuthService"
window_id: 1234567890
logs_available: true
code_available: true
```

Commit `corvin.yaml` to your repo. Every teammate who uses Corvin will pick up the same project grouping automatically.

---

## Connecting Multiple Services Together

Use the **same `id`** in each service's `corvin.yaml`:

```yaml
# orders-service/corvin.yaml
id: "ecom-app"
description: "handles order creation, status, and cancellation"
name: "OrdersService"

# checkout-service/corvin.yaml
id: "ecom-app"
description: "handles cart, payment processing, and checkout flow"
name: "CheckoutService"
```

When both are running with `corvin npm run dev`, the Corvin TUI shows them together under the same project. The AI can then correlate logs and code across both.

---

## Keyboard Shortcuts (in the TUI)

| Shortcut | Action |
|---|---|
| `Ctrl+C` | Exit Corvin |
| `Ctrl+E` | Expand / collapse the service list |

---

## Updating the Project Description

If you want to update what Corvin knows about a service without regenerating the yaml:

```bash
cd my-service
corvin config --message "updated description of what this service does"
```

---

## Tips for Better Debugging

**Be specific in your questions.** Instead of "why is it broken?", ask:

```
Orders service is returning 500 for /api/checkout — what's causing it?
```

**Ask about timing and sequence:**

```
Payment succeeded but the order shows as cancelled — what happened and in what order?
```

**Ask about config issues:**

```
Why can't we process orders for the DE region? Check both services.
```

**Ask for fixes after finding the root cause:**

```
You found the schema mismatch — now tell me exactly what to change to fix it
```

---

## Typical Terminal Layout

For a microservices project, a clean setup looks like this:

```
Terminal A  →  corvin                        (server + TUI, stays open)
Terminal B  →  cd orders-service && corvin npm run dev
Terminal C  →  cd checkout-service && corvin npm run dev
Terminal D  →  your editor or other tools
```

When a bug fires in Terminal B or C, switch to Terminal A and ask about it.

---

## Configuration Reference

**`~/.corvin/config`** — global config, created by `corvin init`

```
API_KEY=your_key_here

# Optional: point to a self-hosted backend
# API_BASE_URL=https://your-server/v2/api
# WEB_SOCKET_URL=wss://your-server/v2/ws
```

**`corvin.yaml`** — per-project config, committed to the repo

| Field | Required | Description |
|---|---|---|
| `id` | yes | Groups services together. Share across services you debug as a unit. |
| `description` | yes | Plain-language description of the service. The AI uses this as context. |
| `name` | no | Display name shown in the TUI. |
| `window_id` | auto | Internal identifier, auto-assigned. Don't manually edit. |
| `logs_available` | no | Set to `false` to hide logs from the AI. Default: `true`. |
| `code_available` | no | Set to `false` to hide codebase from the AI. Default: `true`. |

---

## Troubleshooting

**"Corvin server is not running"**

You need to have `corvin` (no args) running in a separate terminal before you start wrapped processes.

**"Port 4466 is already in use"**

Another Corvin instance is already running. Either use it, or kill it:

```powershell
# Windows
netstat -ano | findstr :4466
taskkill /PID <pid> /F
```

**API_KEY error on startup**

Edit `~/.corvin/config` and make sure `API_KEY=` has your key with no spaces or quotes.

**Service not appearing in TUI**

Check that `corvin.yaml` exists in the service directory and that the Corvin server was running before you started the service.
