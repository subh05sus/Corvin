# Corvin

<p align="center">
  <a href="https://usecorvin.space">
    <img src="https://raw.githubusercontent.com/subh05sus/Corvin/main/cli/assets/corvin-logo.png" alt="Corvin" width="500">
  </a>
</p>

> Real-time AI debugging for running applications

[![Beta](https://img.shields.io/badge/status-beta-orange.svg)](https://github.com/subh05sus/Corvin)
[![npm](https://img.shields.io/npm/v/corvin-cli?style=flat-square)](https://www.npmjs.com/package/corvin-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

Capture logs automatically, search your codebase in natural language, and chat with an AI that understands your entire system.

---

## Status

Beta - Corvin is actively developed and maintained. We ship updates regularly and welcome feedback.

---

## Installation

```bash
npm install -g corvin-cli
```

## Quick Start

**First time setup:**

```bash
# Terminal 1: Start the AI assistant
corvin
```

You'll be prompted to log in and paste an API key from [app.usecorvin.space](https://app.usecorvin.space).

**Start debugging:**

```bash
# Terminal 2: Run any command with debugging
corvin npm run dev
corvin python app.py
corvin docker-compose up
```

Your application runs normally with logs visible. Behind the scenes, Corvin captures logs, accesses your codebase locally, and makes everything available to the AI assistant running in Terminal 1.

---

## Why Corvin?

**Stop context-switching between logs and code**

Ask "why is the auth endpoint failing?" and get answers based on actual runtime logs plus relevant code from your codebase—not generic suggestions.

**Debug across multiple services**

No more grepping through logs in 5 different terminals. Corvin sees logs from all connected services and can trace issues across your entire stack.

**Understand unfamiliar codebases**

Search in natural language: "where do we handle payment webhooks?" The AI searches your actual codebase, not the internet.

---

## How It Works

```
Terminal 1: AI Assistant          Terminal 2: Your Service
┌─────────────────────────┐       ┌──────────────────────────┐
│ $ corvin                │       │ $ corvin npm run dev     │
│                         │       │ Server running on :3000  │
│ You: "Why is auth       │       │ [logs stream normally]   │
│      failing?"          │       │                          │
│                         │◄──────┤ Logs captured            │
│ AI: [analyzes logs +    │       │ Code accessed locally    │
│      searches codebase] │       │ Connected to cluster     │
└─────────────────────────┘       └──────────────────────────┘
          ▲                                  ▲
          │                                  │
          └────────── Local Cluster ─────────┘
                   (ws://127.0.0.1:4466)
                            │
                            │ WebSocket
                            ↓
                ┌────────────────────────────┐
                │   Corvin AI Server         │
                │                            │
                │  ┌──────────────────────┐  │
                │  │   Agent Graph        │  │
                │  │  • Analyze logs      │  │
                │  │  • Search codebase   │  │
                │  │  • Generate insights │  │
                │  └──────────────────────┘  │
                └────────────────────────────┘
```

1. `corvin` starts the AI assistant and connects to a local cluster server
2. `corvin <command>` runs your service and streams logs to the cluster
3. Local cluster connects to Corvin AI server via WebSocket
4. Agent Graph processes queries, searches code, and analyzes logs
5. Responses flow back through cluster to your terminal

Run multiple services in different terminals—they all connect to the same cluster, so the AI can debug across your entire system.

---

## Privacy & Security

**Your code stays local**

Your codebase is accessed locally and never uploaded. Only specific code snippets that the AI queries are sent to the server.

**Selective log sharing**

Logs are streamed to the server only when the AI needs them to answer your questions. You control what runs with `corvin <command>`.

**API key authentication**

All requests are authenticated with your personal API key from [app.usecorvin.space](https://app.usecorvin.space).

---

## Self-Hosting

To run your own Corvin server:

1. Clone the [server repository](https://github.com/subh05sus/Corvin)
2. Configure with your Gemini API key
3. Point the CLI to your server:

```bash
export WEB_SOCKET_URL=ws://localhost:3000/v2/ws
export API_BASE_URL=http://localhost:3000/v2/api
```

---

## Typical Workflow

**Multi-service debugging:**

```bash
# Terminal 1: AI Assistant
corvin

# Terminal 2: Backend
cd backend
corvin npm run dev

# Terminal 3: Frontend
cd frontend
corvin npm start

# Back to Terminal 1 (AI)
> "Users can't log in, what's wrong?"
> "Show me logs from the last auth request"
> "Where do we validate JWT tokens?"
```

The AI sees logs from both services and can search code in both repos.

---

## Corvin vs AI Coding Assistants

| Feature | Corvin | Cursor/Copilot/Windsurf |
|---------|---------|-------------------------|
| Sees runtime logs | ✓ | ✗ |
| Multi-service debugging | ✓ | ✗ |
| Natural language log analysis | ✓ | ✗ |
| Works with running apps | ✓ | Static analysis only |

Corvin coordinates debugging agents that see what's actually happening when your code runs.

---

## Commands

**Start AI assistant:**
```bash
corvin
```

**Run with debugging:**
```bash
corvin <any-command>
```

**Open browser UI:**
```bash
corvin studio
```

---

## Configuration

### First-Time Project Setup

When you run `corvin <command>` for the first time in a directory, Corvin will:

1. Prompt for a project description
2. Create a `corvin.yaml` file
3. Register the service with the local cluster

Example `corvin.yaml`:

```yaml
id: "my-api-service"
name: "api-service"
description: "Express API with PostgreSQL"
logs_available: true
code_available: true
```

On subsequent runs, Corvin uses the existing configuration automatically.

### Environment Variables

Override defaults by setting these in `~/.corvin/config` or as environment variables:

```bash
API_BASE_URL=https://api.usecorvin.space/v2/api
WEB_SOCKET_URL=wss://api.usecorvin.space/v2/ws
CORVIN_CLUSTER_URL=ws://127.0.0.1:4466
```

---

## Keyboard Shortcuts

**Terminal UI:**
- `Ctrl+C` – Exit
- `Ctrl+D` – Toggle chat/logs view
- `Ctrl+R` – Reconnect/reload

**Browser UI:**
- `Ctrl+O` – Toggle full/trimmed chat history

Current shortcuts are shown in the bottom status bar.

---

## Requirements

- Node.js 20+
- npm, yarn, or bun

---

## Contributing

The codebase is designed to be readable and hackable:

- Entry point: `bin/corvin.js`
- TUI components: `index.tsx` and `src/components/*`
- Utilities: `helpers/*` and `src/utils/*`

Pull requests and issues welcome!

---

## Support

- [GitHub Issues](https://github.com/subh05sus/Corvin/issues)

---

## License

[MIT](LICENSE)
