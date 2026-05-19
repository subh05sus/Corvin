# Connecting MCP Clients to Corvin

The Corvin server exposes an MCP (Model Context Protocol) endpoint at `/v2/mcp` using the Streamable HTTP transport. Any MCP-compatible client can connect to it using your Corvin API key as a Bearer token.

## Prerequisites

1. Corvin server running on `http://localhost:3000` (or your deployed URL).
2. Your Corvin API key — find it in `~/.corvin/config` after running `corvin login`, or create one at `http://localhost:3001/dashboard`.
3. At least one service running with `corvin <cmd>` so the MCP tools have something to query.

## Available Tools

| Tool | Description |
|------|-------------|
| `listServices` | List connected services in your session |
| `tailLogs` | Last N lines from a service's logs |
| `grepLogs` | Search logs with surrounding context |
| `getRecentErrors` | Recent ERROR/WARN/FATAL lines |
| `readLogs` | Paginated log reading |
| `grepCodeBase` | Search source code for a pattern |
| `readFileContents` | Read file lines around a line number |
| `generateYamlName` | Generate a project name from a description |

## Client Configurations

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "corvin": {
      "url": "http://localhost:3000/v2/mcp",
      "headers": {
        "Authorization": "Bearer <your-corvin-api-key>"
      }
    }
  }
}
```

Restart Claude Desktop after saving.

### VS Code (GitHub Copilot)

Create or edit `.vscode/mcp.json` in your workspace:

```json
{
  "servers": {
    "corvin": {
      "type": "http",
      "url": "http://localhost:3000/v2/mcp",
      "headers": {
        "Authorization": "Bearer <your-corvin-api-key>"
      }
    }
  }
}
```

### Cursor

Same format as Claude Desktop — edit `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "corvin": {
      "url": "http://localhost:3000/v2/mcp",
      "headers": {
        "Authorization": "Bearer <your-corvin-api-key>"
      }
    }
  }
}
```

### Antigravity

Settings → MCP Servers → Add Custom Server:

```json
{
  "name": "corvin",
  "serverUrl": "http://localhost:3000/v2/mcp",
  "headers": {
    "Authorization": "Bearer <your-corvin-api-key>"
  }
}
```

## Security

- Only services connected under **your** Corvin API key are accessible. Cross-user access is blocked at the server.
- For production/hosted deployments, use HTTPS and replace `http://localhost:3000` with your server's URL.
- Revoke your API key at `/dashboard` to immediately block all MCP (and CLI) access.
