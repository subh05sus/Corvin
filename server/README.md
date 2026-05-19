# Corvin Server

<p align="center">
  <a href="https://usecorvin.space">
    <img src="assets/corvin-logo.png" alt="Corvin Logo" width="400">
  </a>
</p>

> AI debugging agent backend for Corvin CLI

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)

Corvin Server powers intelligent debugging for running applications. It connects to the CLI's local cluster via WebSocket, processes debugging queries using AI, and coordinates tool execution for log analysis and code search.

---

## Status

🚧 **Beta** - Corvin is actively developed and maintained. We ship updates regularly and welcome feedback.

---

## Quick Start

**Try the hosted version:**

Install the [Corvin CLI](https://github.com/corvin-ai/cli), which connects to our hosted server by default:

```bash
npm install -g @corvin/cli
debug
```

**Run your own server:**

```bash
git clone https://github.com/corvin-ai/server.git
cd server
npm install

# Create .env file (see Configuration section)
cp .env.example .env

npm run dev
```

Server runs on `http://localhost:3000`. Point the CLI to your server:

```bash
export WEB_SOCKET_URL=ws://localhost:3000/v2/ws
export API_BASE_URL=http://localhost:3000/v2/api
```

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  CLI Local Cluster                                  │
│  • Captures logs from services                      │
│  • Executes tool calls (read_file, grep, etc.)      │
└──────────────────────┬──────────────────────────────┘
                       │
                       ↕ WebSocket
                       │
         ┌─────────────▼───────────────┐
         │                             │
         │     Corvin AI Server       │
         │     (Fastify + ai-sdk)      │
         │                             │
         │   ┌───────────────────┐     │
         │   │   Agent Graph     │     │
         │   └───────────────────┘     │
         │                             │
         │   ┌───────────────────┐     │
         │   │   Redis           │     │
         │   │   (Coordination)  │     │
         │   └───────────────────┘     │
         │                             │
         └─────────────┬───────────────┘
                       │
                       ↕
         ┌─────────────▼───────────────┐
         │         Gemini API          │
         └─────────────────────────────┘
```

**How it works:**

1. CLI local cluster connects via WebSocket
2. Server receives debugging query
3. Server sends tool call requests (read files, search logs, grep code)
4. CLI executes tools locally and returns results via Redis
5. Server processes results with Gemini using AI SDK
6. Response streams back to CLI through WebSocket

---

## Core Features

- **AI-powered analysis** - Uses Vercel AI SDK with Google Gemini for debugging assistance
- **Tool coordination via Redis** - Manages async tool execution between server and CLI
- **WebSocket-based debugging** - Real-time bidirectional communication with CLI

---

## Configuration

Create a `.env` file:

```bash
# Node Environment
NODE_ENV=development

# Server
PORT=3000

# Redis (required for tool coordination)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_USERNAME=
REDIS_PASSWORD=

# Gemini (required for AI debugging)
GEMINI_API_KEY=your-gemini-api-key

# CLI Version Check
MINIMUM_CLI_VERSION=1.0.12
```

### Required Services

**Redis** - Coordinates tool execution between server and CLI. Install locally:

```bash
# macOS
brew install redis
brew services start redis

# Linux
sudo apt-get install redis-server
sudo systemctl start redis

# Docker
docker run -d -p 6379:6379 redis
```

**Gemini API Key** - Get one at [aistudio.google.com](https://aistudio.google.com)

---

## API Documentation

**Swagger UI:**
```
http://localhost:3000/v2/api/docs
```

**WebSocket Endpoint:**
```
ws://localhost:3000/v2/ws
```

The CLI connects here to establish debugging sessions.

**HTTP Endpoints:**
- `GET /v2/api/health` - Health check
- `POST /v2/api/graph` - Execute agent graph (for testing)
- `POST /v2/api/tool` - Tool execution endpoint

---

## Development

**Start with hot reload:**
```bash
npm run dev
```

**Build for production:**
```bash
npm run build    # Compiles to dist/ using SWC
npm start        # Runs from build/
```

**Available scripts:**
- `npm run dev` - Development server with hot reload
- `npm run build` - Production build (SWC)
- `npm run build:tsc` - TypeScript compilation to build/
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Auto-fix linting errors

---

## Project Structure

```
server/
├── src/
│   ├── apis/           # HTTP route handlers
│   │   ├── graph.ts    # Agent graph endpoint
│   │   ├── health.ts   # Health check
│   │   └── tool.ts     # Tool execution
│   ├── config/         # App configuration & Swagger
│   ├── errors/         # Error definitions
│   ├── exception/      # Exception handling
│   ├── interface/      # TypeScript interfaces
│   ├── plugins/        # Fastify plugins (WebSocket, etc.)
│   ├── services/       # Business logic
│   │   ├── v2/         # Agent graph implementation
│   │   └── tools/      # Tool execution services
│   ├── utils/          # Redis, socket manager, helpers
│   ├── app.ts          # Fastify app setup
│   └── server.ts       # Entry point
└── package.json
```

---

## Privacy & Security

**Code stays on your machine**

The server requests file access through tool calls executed by the CLI. Only specific files or snippets queried by the AI are sent back to the server.

**No built-in authentication**

This open-source server doesn't include auth. The hosted service handles API key authentication. For production deployments, add your own authentication layer.

**CORS Configuration**

Configure allowed origins in `src/app.ts`:

```typescript
fastify.register(cors, {
  origin: ['http://localhost:3000'],
  credentials: true
})
```

**Environment isolation**

- Gemini keys stay on the server
- CLI users never see or need Gemini credentials
- Redis used only for ephemeral tool coordination

---

## Deployment

**Environment Variables:**

Set all required variables from the Configuration section.

**Production checklist:**

- Set `NODE_ENV=production`
- Use managed Redis (e.g., Redis Cloud, AWS ElastiCache)
- Add authentication middleware
- Configure CORS for your domains
- Set up monitoring and logging
- Use process manager (PM2, systemd)

**Docker:**

```bash
# Build
docker build -t corvin-server .

# Run
docker run -p 3000:3000 \
  -e GEMINI_API_KEY=your-gemini-api-key \
  -e REDIS_HOST=redis \
  corvin-server
```

---

## Requirements

- Node.js 18+
- Redis 6+
- Gemini API key

---

## Contributing

Contributions welcome! Please feel free to submit a Pull Request.

The codebase is designed to be hackable:
- Core services in `src/services/v2/`
- Tool coordination in `src/utils/redis.ts`
- WebSocket handling in `src/plugins/websockets.ts`

---

## Support

- [GitHub Issues](https://github.com/corvin-ai/server/issues)
- [CLI Repository](https://github.com/corvin-ai/cli)
- [Documentation](https://docs.usecorvin.space)

---

## License

MIT
