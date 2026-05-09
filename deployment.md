# Corvin — Deployment Guide

Two things to deploy:
- **Server** (`server/`) — Fastify backend, needs Redis and a Gemini API key
- **CLI** (`cli/`) — published to npm as `@corvin/cli`

---

## Table of Contents

1. [Server Deployment](#server-deployment)
   - [Option A: Railway (recommended)](#option-a-railway-recommended)
   - [Option B: Render](#option-b-render)
   - [Option C: Fly.io (Docker)](#option-c-flyio-docker)
   - [Option D: VPS with PM2](#option-d-vps-with-pm2)
2. [CLI — Publishing to npm](#cli--publishing-to-npm)
3. [Post-Deploy: Point CLI at Your Server](#post-deploy-point-cli-at-your-server)
4. [Environment Variables Reference](#environment-variables-reference)
5. [Verify Deployment](#verify-deployment)

---

## Server Deployment

### Build commands (any platform)

| Step | Command | Output |
|---|---|---|
| Install | `npm install --production=false` | `node_modules/` |
| Build | `npm run build:tsc` | `build/` |
| Start | `node build/src/server.js` | Server on `$PORT` |

The server listens on `0.0.0.0` and uses `process.env.PORT` (defaults to `3000`).

---

### Option A: Railway (recommended)

Railway gives you managed Redis, automatic GitHub deploys, and environment variable injection in one place.

#### 1. Create a Railway project

```
railway.app → New Project → Deploy from GitHub repo → select this repo
```

Set the root directory to `server/` when prompted.

#### 2. Add a Redis plugin

```
Railway dashboard → your project → + New → Database → Add Redis
```

Railway automatically injects `REDIS_URL` into your service. The server reads this variable first, so no manual config is needed.

#### 3. Set environment variables

In Railway: your service → Variables → add:

```
NODE_ENV=production
GEMINI_API_KEY=<your-key>
MINIMUM_CLI_VERSION=0.1.0
```

`PORT` and `REDIS_URL` are injected automatically by Railway.

#### 4. Set build and start commands

In Railway: Settings → Build & Deploy:

| Field | Value |
|---|---|
| Build Command | `npm run build:tsc` |
| Start Command | `node build/src/server.js` |

#### 5. Deploy

Railway redeploys automatically on every push to your connected branch. Trigger a manual deploy:

```
railway up
```

Or push to `main`.

---

### Option B: Render

#### 1. Create a Web Service

```
render.com → New → Web Service → connect GitHub repo
```

Set root directory to `server/`.

| Field | Value |
|---|---|
| Environment | Node |
| Build Command | `npm install && npm run build:tsc` |
| Start Command | `node build/src/server.js` |

#### 2. Add Redis

```
Render dashboard → New → Redis → (free tier available)
```

Copy the **Internal Redis URL** (starts with `redis://` or `rediss://`).

#### 3. Set environment variables

In Render: your service → Environment:

```
NODE_ENV=production
GEMINI_API_KEY=<your-key>
REDIS_URL=<redis-url-from-step-2>
MINIMUM_CLI_VERSION=0.1.0
```

Render injects `PORT` automatically.

---

### Option C: Fly.io (Docker)

Create a `Dockerfile` in `server/`:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build:tsc

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=builder /app/build ./build
EXPOSE 3000
CMD ["node", "build/src/server.js"]
```

#### Deploy

```bash
# Install flyctl: https://fly.io/docs/hands-on/install-flyctl/
cd server

fly launch          # creates fly.toml, follow prompts
fly secrets set \
  GEMINI_API_KEY=<your-key> \
  REDIS_URL=<your-redis-url> \
  NODE_ENV=production

fly deploy
```

#### Managed Redis on Fly

```bash
fly redis create     # creates a Fly Redis instance
# Copy the private URL (rediss://...) and set it:
fly secrets set REDIS_URL=rediss://<fly-redis-url>
```

---

### Option D: VPS with PM2

Use this for any Linux VPS (DigitalOcean, Linode, Hetzner, AWS EC2, etc.).

#### 1. Install dependencies on the server

```bash
# Node 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2
npm install -g pm2

# Redis (if not using a managed service)
sudo apt install redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server
```

#### 2. Clone and build

```bash
git clone <your-repo> /opt/corvin
cd /opt/corvin/server
npm install
npm run build:tsc
```

#### 3. Create the production `.env`

```bash
cat > /opt/corvin/server/.env << 'EOF'
NODE_ENV=production
PORT=3000
GEMINI_API_KEY=<your-key>
REDIS_URL=redis://localhost:6379
MINIMUM_CLI_VERSION=0.1.0
EOF
```

For a remote managed Redis (Upstash, Redis Cloud), use `rediss://` in `REDIS_URL`:
```
REDIS_URL=rediss://<username>:<password>@<host>:6380
```

#### 4. Start with PM2

The `ecosystem.config.js` is already configured:

```js
// server/ecosystem.config.js
module.exports = {
  apps: [{
    name: "clippy-api-v2",
    script: "./build/src/server.js",
    autorestart: true,
    watch: false,
    max_memory_restart: "2G",
  }],
};
```

```bash
cd /opt/corvin/server
pm2 start ecosystem.config.js
pm2 save
pm2 startup   # generates the command to run PM2 on boot — run that command
```

#### 5. Reverse proxy with Nginx (optional but recommended)

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";   # required for WebSocket
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400;                # keep WS alive
    }
}
```

```bash
sudo nginx -t && sudo systemctl reload nginx
# Then get a TLS cert:
sudo certbot --nginx -d api.yourdomain.com
```

#### Updating the server

```bash
cd /opt/corvin/server
git pull
npm install
npm run build:tsc
pm2 restart ecosystem.config.js
```

---

## CLI — Publishing to npm

The CLI is the `@corvin/cli` package. The binary is called `debug`.

### What gets published

From `cli/package.json` `files` array:
```
bin/          ← entry point (corvin.js)
dist/         ← compiled TypeScript
patches/      ← patch-package patches
studio/
README.md
LICENSE
```

### Steps

#### 1. Build

```bash
cd cli
npm run build
```

This runs `tsc` → `dist/`, copies JS helpers, and strips source maps.

#### 2. Bump the version

```bash
# patch: 0.1.4 → 0.1.5
npm version patch

# minor: 0.1.4 → 0.2.0
npm version minor

# major: 0.1.4 → 1.0.0
npm version major
```

#### 3. Dry run (verify what will be published)

```bash
npm publish --dry-run
```

Check that only the files in the `files` array appear in the output.

#### 4. Publish

```bash
# First time: login
npm login

# Publish (scoped package — public flag required)
npm publish --access public
```

#### 5. Verify installation

```bash
npm install -g @corvin/cli
debug --version
```

### Automating releases with GitHub Actions

Create `.github/workflows/publish-cli.yml`:

```yaml
name: Publish CLI

on:
  push:
    tags:
      - 'cli-v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: cli
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'
      - run: npm install
      - run: npm run build
      - run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

Trigger a release:
```bash
git tag cli-v0.1.5
git push origin cli-v0.1.5
```

---

## Post-Deploy: Point CLI at Your Server

By default the CLI connects to the hosted Corvin service (`wss://api.usecorvin.space/v2/ws`). To use your own deployed server, set these in `~/.corvin/config`:

```
WEB_SOCKET_URL=wss://api.yourdomain.com/v2/ws
API_BASE_URL=https://api.yourdomain.com/v2/api
```

Or pass them as environment variables per session:

```bash
WEB_SOCKET_URL=wss://api.usecorvin.space/v2/ws corvin
```

> **Important:** Use `wss://` (TLS) for a production server with a domain and TLS cert.
> Use `ws://` only for local/HTTP servers.

---

## Environment Variables Reference

### Server (`server/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `GEMINI_API_KEY` | Yes | — | Google Gemini API key |
| `NODE_ENV` | No | `development` | `production` in prod |
| `PORT` | No | `3000` | HTTP port |
| `REDIS_URL` | Preferred | — | Full Redis URL. Use `rediss://` for TLS. Takes precedence over individual fields. |
| `REDIS_HOST` | Fallback | `localhost` | Redis host (used if `REDIS_URL` not set) |
| `REDIS_PORT` | Fallback | `6379` | Redis port (used if `REDIS_URL` not set) |
| `REDIS_USERNAME` | Fallback | — | Redis username (used if `REDIS_URL` not set) |
| `REDIS_PASSWORD` | Fallback | — | Redis password (used if `REDIS_URL` not set) |
| `MINIMUM_CLI_VERSION` | No | `1.0.12` | Minimum CLI version to allow |

**Redis URL format:**
- Local: `redis://localhost:6379`
- With auth: `redis://username:password@host:6379`
- TLS (managed services): `rediss://username:password@host:6380`

### CLI (`~/.corvin/config`)

| Key | Default | Description |
|---|---|---|
| `WEB_SOCKET_URL` | `wss://api.usecorvin.space/v2/ws` | WebSocket URL of the Corvin server |
| `API_BASE_URL` | `https://api.usecorvin.space/v2/api` | REST API base URL of the Corvin server |

---

## Verify Deployment

Run these checks after any deployment.

### Server health

```bash
curl https://api.yourdomain.com/v2/api/health/
# Expected:
# {"success":true,"message":"Health check successful","uptime":...}
```

### Minimum CLI version endpoint

```bash
curl https://api.yourdomain.com/v2/api/minimum-cli-version
```

### WebSocket connection

```bash
# Install wscat if needed: npm install -g wscat
wscat -c wss://api.yourdomain.com/v2/ws
# Expected: {"type":"welcome","message":"WebSocket connection established..."}
```

### CLI connects

```bash
WEB_SOCKET_URL=wss://api.yourdomain.com/v2/ws debug
# Should open the chat UI without connection errors
```

### Server logs to check

After connecting a CLI, the server logs should show:
```
New WebSocket connection
Redis Client Connected
```

If you see `GEMINI_API_KEY is not set` in a WebSocket response, the env var is missing on the server.

---

## Troubleshooting

### Server crashes on start: `GEMINI_API_KEY is required`
Set `GEMINI_API_KEY` in your hosting platform's environment variables.

### Redis `ConnectionTimeoutError` with TLS
You're using `rediss://` but the server can't verify the cert, or you're using `redis://` for a service that requires TLS.
- For managed Redis (Railway, Upstash, Render): always use `rediss://`
- For local Redis: use `redis://`

### WebSocket disconnects immediately
Check that your reverse proxy (Nginx, Caddy) forwards WebSocket upgrade headers:
```nginx
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
proxy_read_timeout 86400;
```

### PM2 process not starting after reboot
Run `pm2 startup` and execute the printed command, then `pm2 save`.

### npm publish: `403 Forbidden`
- You're not logged in: `npm login`
- First publish of scoped package needs: `npm publish --access public`
- The package name is taken — update `name` in `cli/package.json`

### CLI version mismatch warning
The server's `MINIMUM_CLI_VERSION` is higher than the installed CLI version.
- Update the CLI: `npm install -g @corvin/cli`
- Or lower `MINIMUM_CLI_VERSION` in the server `.env`
