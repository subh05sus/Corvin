# Corvin

AI debugging copilot for running applications. Wrap your services with the Corvin CLI; ask questions about errors in plain English; get root-cause analysis grounded in live logs and your actual codebase.

```
You ──► Corvin CLI (TUI) ──ws──► Local Cluster ──ws──► Corvin Server ──► Gemini
                                                          │
                                                          ├── Redis (tool coordination)
                                                          └── Web Dashboard ──► Postgres
                                                              (auth, API keys)
```

## Repository layout

| Path | What lives here |
|------|-----------------|
| [`cli/`](./cli) | The `corvin` CLI: TUI, WebSocket client, log streaming, project init |
| [`server/`](./server) | Fastify backend: AI query orchestration, WebSocket plugin, Redis tool coordination |
| [`web/`](./web) | Next.js dashboard: NextAuth (Google + GitHub), API key management, CLI auth flow |
| [`demo/`](./demo) | Sample microservices with intentional bugs for testing the debugger |
| [`USAGE_GUIDE.md`](./USAGE_GUIDE.md) | Day-to-day CLI usage |
| [`RUNBOOK.md`](./RUNBOOK.md) | Full deployment runbook including the demo bug walkthrough |

## How it fits together

1. **You start the server** — `server/` (Fastify on `:3000`) connects to Redis and Gemini, exposes the WebSocket the CLI talks to.
2. **You start the dashboard** — `web/` (Next.js on `:3001`) owns user accounts and API keys. The Fastify server validates every CLI connection by asking the dashboard.
3. **You sign in via the CLI** — `corvin login` opens your browser, you authorize on the dashboard, the key is delivered back to your terminal and saved to `~/.corvin/config`.
4. **You wrap your services** — `corvin npm run dev` (or whatever your start command is). Logs stream into the local cluster; the TUI shows them.
5. **You ask questions** — type in the TUI. The AI sees logs from every wrapped service plus the source code in each registered project directory.

## Quick start

### Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | ≥ 20 | `node -v` |
| Postgres | any recent | local install, Docker, or hosted (Neon/Supabase/Railway) |
| Redis | any recent | local install, Docker, Upstash, etc. |
| Gemini API key | — | https://aistudio.google.com |
| Google OAuth app | — | callback `http://localhost:3001/api/auth/callback/google` |
| GitHub OAuth app | — | callback `http://localhost:3001/api/auth/callback/github` |

### 1. Install dependencies

```bash
cd web && npm install
cd ../server && npm install
cd ../cli && npm install
```

### 2. Configure environment

**`web/.env`** — fill in the placeholders:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
NEXTAUTH_SECRET="..."        # openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3001"
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
GITHUB_CLIENT_ID="..."
GITHUB_CLIENT_SECRET="..."
```

**`server/.env`** — already has placeholders; just supply your `GEMINI_API_KEY`. The `WEB_DASHBOARD_URL` defaults to `http://localhost:3001`.

### 3. Apply the database schema

```bash
cd web
npx prisma migrate dev --name init
```

### 4. Start the three services

Open three terminals.

```bash
# Terminal 1 — dashboard (also serves the CLI auth endpoints)
cd web && npm run dev          # http://localhost:3001

# Terminal 2 — Fastify backend
cd server && npm run dev       # http://localhost:3000

# Terminal 3 — try the CLI
cd cli && npm link             # makes `corvin` global
corvin login                   # opens browser → sign in → approve
```

After `corvin login`, your API key is saved to `~/.corvin/config`. The key is also visible (and revocable) at `http://localhost:3001/dashboard`.

### 5. Use it

In any project directory:

```bash
corvin init                    # creates corvin.yaml describing the service
corvin npm run dev             # wraps your start command, streams logs to Corvin
```

In a separate terminal, start the TUI:

```bash
corvin                         # interactive chat
```

When something breaks, ask questions in the TUI:

> "Why is checkout returning 500 for German orders?"

For day-to-day usage details, see [`USAGE_GUIDE.md`](./USAGE_GUIDE.md). For the full deployment runbook including the demo bug walkthrough, see [`RUNBOOK.md`](./RUNBOOK.md).

## Authentication flow

`corvin login` runs an OAuth-style loopback flow against the dashboard:

```
CLI                          web/ (dashboard)              Postgres
 │                                  │                          │
 ├─ POST /api/cli/start ───────────►│                          │
 │  { state, callbackPort }         │                          │
 │◄─ { authUrl } ───────────────────┤                          │
 │                                  │                          │
 ├─ opens browser ────────────────► /cli/authorize?state=...  │
 │                                  ├─ user signs in (Google/GitHub)
 │                                  ├─ user approves ────────► creates ApiKey
 │◄─ 302 to http://127.0.0.1:PORT/callback?state=&code=        │
 │                                  │                          │
 ├─ POST /api/cli/exchange ────────►│                          │
 │  { state, code }                 │                          │
 │◄─ { apiKey, email } ─────────────┤                          │
 │                                  │                          │
 │  saves to ~/.corvin/config       │                          │
```

Security properties:
- Plaintext API keys are never persisted — only `sha256(key)`. The full key is shown to the user once on creation.
- The one-time `code` is single-use with a 5-minute TTL, keeping the long-lived key out of browser history.
- A `state` token (32 hex chars) is checked at both the loopback callback and the exchange step.
- Revoking a key in the dashboard (`/dashboard`) takes effect on the CLI's next reconnect.
- Headless fallback: `corvin login --key <api-key>` skips the browser and directly validates a key generated from the dashboard.

## Development

| Project | Lives at | Build / typecheck |
|---------|----------|-------------------|
| `cli/` | `bin/corvin.js` (entry) | `npm run build` |
| `server/` | `src/server.ts` | `npm run dev` (uses `nodemon` + `tsx`) |
| `web/` | Next.js app dir | `npm run dev` / `npm run typecheck` |

### Useful scripts

```bash
# Web — Prisma helpers
cd web
npm run db:migrate     # create + apply a migration
npm run db:push        # apply schema without a migration file (dev only)
npm run db:studio      # GUI for browsing rows
npm run db:generate    # regenerate Prisma client

# CLI — rebuild dist/ from helpers + ts source
cd cli && npm run build
```

## Ports

| Port | Service |
|------|---------|
| 3000 | Fastify backend (`server/`) |
| 3001 | Next.js dashboard (`web/`) |
| 4466 | Local cluster WebSocket (started by `corvin` CLI) |
| 5432 | Postgres (default; varies by your setup) |
| 6379 | Redis (default) |

## License

See `LICENSE` in each subproject (`cli/`, `server/`).
