# Corvin Web Dashboard

Account dashboard + CLI auth backend for Corvin.

- Sign in with Google or GitHub (via NextAuth / Auth.js v5)
- Create, list, and revoke API keys
- Hosts the CLI authorization endpoints (`/cli/authorize`, `/api/cli/*`)

## Setup

### 1. Fill in `.env`

Copy `.env.example` over to `.env` (already done if you cloned this) and fill in:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"

NEXTAUTH_SECRET="..."             # openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3001"

GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
GITHUB_CLIENT_ID="..."
GITHUB_CLIENT_SECRET="..."
```

OAuth callback URLs to register with each provider:

- Google: `http://localhost:3001/api/auth/callback/google`
- GitHub: `http://localhost:3001/api/auth/callback/github`

### 2. Apply the schema

```bash
npm install
npx prisma migrate dev --name init
```

### 3. Run the app

```bash
npm run dev          # http://localhost:3001
```

## CLI authorization flow

```
CLI               web (this app)            Postgres
 │                       │                     │
 ├── POST /api/cli/start (state, callbackPort)─┤
 │←── { authUrl } ───────┤                     │
 │                       │                     │
 ├── opens browser ────► /cli/authorize?state= │
 │                       ├─ user signs in ───► │
 │                       ├─ user approves ───► │
 │                       │   create ApiKey, code
 │←── 302 redirect to http://127.0.0.1:PORT/callback?state=&code=
 │                       │                     │
 ├── POST /api/cli/exchange (state, code) ────►│
 │←── { apiKey, email } ─┤                     │
 │                       │                     │
 │  saves to ~/.corvin/config                  │
```

The `code` indirection keeps the long-lived API key out of browser history.

## Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /api/cli/start` | Register an in-flight CLI login (state + callback port) |
| `GET /cli/authorize` | User-facing approve/deny page |
| `POST /api/cli/exchange` | Trade one-time code for the actual API key |
| `POST /api/cli/validate` | Used by the Fastify server to validate keys on WS connect |

## Useful scripts

```bash
npm run db:migrate    # create/apply migrations
npm run db:push       # apply schema without a migration file (dev only)
npm run db:studio     # browse data
npm run db:generate   # regenerate Prisma client
```

## Notes

- API keys are stored only as `sha256` hashes — the plaintext key is shown
  to the user once at creation and never again.
- `CliAuthRequest` rows expire after 5 minutes.
- The plaintext API key for the browser-flow handshake is held in-memory
  (see `lib/cli-auth-store.ts`). For multi-instance deploys, swap that for
  Redis with the same 5-minute TTL.
