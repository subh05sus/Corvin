"use client"

import { useState, useEffect } from "react"

const DIAG = "repeating-linear-gradient(-45deg, rgba(255,255,255,0.09), rgba(255,255,255,0.09) 1px, transparent 1px, transparent 10px)"

function Divider({ height = 60 }: { height?: number }) {
  return (
    <div
      aria-hidden
      className="w-full pointer-events-none"
      style={{
        height,
        backgroundImage: DIAG,
        borderTop: "1px solid rgba(255,255,255,0.09)",
        borderBottom: "1px solid rgba(255,255,255,0.09)",
      }}
    />
  )
}

const TOOLS = [
  { name: "listServices", desc: "List all services connected to your Corvin session.", params: "—" },
  { name: "tailLogs", desc: "Get the last N lines from a service's in-memory logs.", params: "serviceId, n" },
  { name: "grepLogs", desc: "Search logs for a pattern with before/after context.", params: "serviceId, pattern, before, after" },
  { name: "getRecentErrors", desc: "Most recent N lines containing ERROR, WARN, FATAL, EXCEPTION.", params: "serviceId, n" },
  { name: "readLogs", desc: "Paginated log reading (50 lines per page).", params: "serviceId, pageNumber" },
  { name: "grepCodeBase", desc: "Ripgrep through source code. Returns file path and matching line.", params: "serviceId, searchTerm" },
  { name: "readFileContents", desc: "Read lines around a specific line number in any source file.", params: "serviceId, filePath, lineNumber, before, after" },
  { name: "generateYamlName", desc: "Generate a concise project name from a plain-language description.", params: "description" },
]

const CLIENTS = [
  {
    name: "Claude Code",
    badge: "CLI",
    file: ".claude/settings.json",
    config: `{
  "mcpServers": {
    "corvin": {
      "type": "http",
      "url": "https://api.usecorvin.space/v2/mcp",
      "headers": {
        "Authorization": "Bearer <your-api-key>"
      }
    }
  }
}`,
    cli: `claude mcp add --transport http \\
  --header "Authorization: Bearer <key>" \\
  corvin https://api.usecorvin.space/v2/mcp`,
    note: "Or add via CLI command above. The server can be local or remote (use HTTPS for production).",
  },
  {
    name: "Claude Desktop",
    badge: "Desktop",
    file: "claude_desktop_config.json",
    config: `{
  "mcpServers": {
    "corvin": {
      "url": "https://api.usecorvin.space/v2/mcp",
      "headers": {
        "Authorization": "Bearer <your-api-key>"
      }
    }
  }
}`,
    cli: null,
    note: "macOS: ~/Library/Application Support/Claude/  ·  Windows: %APPDATA%\\Claude\\",
  },
  {
    name: "VS Code Copilot",
    badge: "Editor",
    file: ".vscode/mcp.json",
    config: `{
  "servers": {
    "corvin": {
      "type": "http",
      "url": "https://api.usecorvin.space/v2/mcp",
      "headers": {
        "Authorization": "Bearer <your-api-key>"
      }
    }
  }
}`,
    cli: null,
    note: "Commit .vscode/mcp.json to share the config with your team (use env vars for keys).",
  },
  {
    name: "Cursor",
    badge: "Editor",
    file: "~/.cursor/mcp.json",
    config: `{
  "mcpServers": {
    "corvin": {
      "url": "https://api.usecorvin.space/v2/mcp",
      "headers": {
        "Authorization": "Bearer <your-api-key>"
      }
    }
  }
}`,
    cli: null,
    note: "Restart Cursor after editing to pick up the new server.",
  },
]

const DEMO_STEPS = [
  {
    n: "01",
    title: "Get your API key",
    body: "Run corvin login to sign in via the browser. Your key is saved to ~/.corvin/config. Or create one at the dashboard.",
    cmd: "corvin login",
  },
  {
    n: "02",
    title: "Start your services",
    body: "Wrap each service with corvin <cmd>. Logs stream to the local cluster on :4466. The MCP server connects to this.",
    cmd: "corvin npm run dev",
  },
  {
    n: "03",
    title: "Configure your client",
    body: "Pick the config for your client below. Paste your API key from ~/.corvin/config. Point the URL at your Corvin server.",
    cmd: "~/.corvin/config",
  },
  {
    n: "04",
    title: "Ask about bugs",
    body: "Open your client and start asking. Tools execute against your live services in real time — no copy-pasting logs.",
    cmd: "corvin:tailLogs()",
  },
]

export default function McpPage() {
  const [activeClient, setActiveClient] = useState(0)
  const [scrolled, setScrolled] = useState(false)
  const [copiedClient, setCopiedClient] = useState<number | null>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  function copyConfig(i: number) {
    navigator.clipboard?.writeText(CLIENTS[i].config)
    setCopiedClient(i)
    setTimeout(() => setCopiedClient(null), 2200)
  }

  return (
    <div className="bg-background min-h-screen text-foreground overflow-x-clip relative 2xl:px-16">
      <div aria-hidden className="pointer-events-none fixed top-0 bottom-0 left-0 hidden 2xl:block" style={{ width: "64px", backgroundImage: DIAG, borderRight: "1px solid rgba(255,255,255,0.05)" }} />
      <div aria-hidden className="pointer-events-none fixed top-0 bottom-0 right-0 hidden 2xl:block" style={{ width: "64px", backgroundImage: DIAG, borderLeft: "1px solid rgba(255,255,255,0.05)" }} />

      {/* NAV */}
      <nav
        className="sticky top-0 z-50 transition-all duration-300"
        style={{ background: scrolled ? "rgba(8,10,8,0.95)" : "transparent" }}
      >
        <div className="max-w-[1280px] mx-auto px-8 md:px-14">
          <div
            className="flex items-center gap-4 h-[60px]"
            style={{ borderBottom: !scrolled ? "none" : "1px solid rgba(255,255,255,0.06)" }}
          >
            <a href="/" className="font-heading font-medium leading-none" style={{ fontSize: "32px", color: "var(--primary)", letterSpacing: "0.02em" }}>
              Corvin
            </a>
            <span
              className="font-mono text-[10px] tracking-[0.14em] px-1.5 py-px border uppercase self-center mt-1"
              style={{ color: "var(--primary-dim)", borderColor: "rgba(255,255,255,0.08)", background: "transparent" }}
            >
              MCP
            </span>
            <div className="ml-auto flex items-center gap-3">
              <a
                href="/"
                className="font-mono text-[11px] px-2 tracking-[0.08em] transition-colors duration-150"
                style={{ color: "rgba(255,255,255,0.3)" }}
                onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
              >
                Home
              </a>
              <a
                href="https://app.usecorvin.space"
                className="font-heading text-[15px] tracking-[0.06em] px-4 py-2 transition-colors duration-150"
                style={{ border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.45)" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--primary-dim)"; e.currentTarget.style.color = "var(--primary)" }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "rgba(255,255,255,0.45)" }}
              >
                Get started
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="max-w-[1280px] mx-auto px-4 md:px-14 pt-16 md:pt-24 pb-0">
        <div className="mb-8 flex items-center gap-3">
          <span
            className="font-mono text-[9px] tracking-[0.2em] px-2 py-0.5 border uppercase"
            style={{ color: "var(--primary)", borderColor: "var(--primary-dim)", background: "var(--primary-faint)" }}
          >
            MCP server
          </span>
          <span className="font-mono text-[10px] text-muted-foreground/30">
            Streamable HTTP · Model Context Protocol
          </span>
        </div>

        <h1
          className="font-heading text-foreground leading-[1.0] tracking-tight mb-8"
          style={{ fontSize: "clamp(52px, 7vw, 100px)" }}
        >
          Debug with any
          <br /><span style={{ color: "var(--primary)" }}>AI client.</span>
        </h1>

        <p
          className="font-sans leading-[1.80] mb-12 max-w-[52ch]"
          style={{ fontSize: "clamp(14px, 1.4vw, 17px)", color: "rgba(255,255,255,0.65)" }}
        >
          Corvin exposes an MCP server at <span className="font-mono text-[0.9em]" style={{ color: "rgba(255,255,255,0.45)" }}>/v2/mcp</span>.
          Connect Claude Code, Claude Desktop, Cursor, or VS Code Copilot.
          Every tool call runs against your live services in real time.
        </p>

        <div className="flex flex-wrap gap-4 font-mono text-[12px] text-muted-foreground/35 mb-4">
          <span><span className="text-foreground/20 mr-2">transport</span>Streamable HTTP (2025)</span>
          <span><span className="text-foreground/20 mr-2">auth</span>Bearer token</span>
          <span><span className="text-foreground/20 mr-2">endpoint</span>POST /v2/mcp</span>
          <span><span className="text-foreground/20 mr-2">tools</span>{TOOLS.length} available</span>
        </div>
      </section>

      <Divider height={60} />

      {/* HOW TO CONNECT */}
      <section>
        <div className="max-w-[1280px] mx-auto px-4 md:px-14 py-12 md:py-24">
          <h2
            className="font-heading text-foreground leading-[1.0] tracking-tight mb-16"
            style={{ fontSize: "clamp(36px, 4vw, 52px)" }}
          >
            Connect in
            <br /><span style={{ color: "var(--primary)" }}>four steps.</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 border-t border-l border-border">
            {DEMO_STEPS.map((step) => (
              <div key={step.n} className="border-r border-b border-border px-8 py-10">
                <div
                  className="font-extrabold leading-none mb-8 tracking-tight"
                  style={{ fontSize: "clamp(56px, 5vw, 80px)", color: "var(--primary)" }}
                >
                  {step.n}
                </div>
                <div
                  className="font-mono text-[10px] mb-4 inline-block border px-2 py-1"
                  style={{ color: "var(--primary)", borderColor: "var(--primary-dim)", background: "var(--primary-faint)" }}
                >
                  {step.cmd}
                </div>
                <div className="font-sans font-semibold text-foreground text-[16px] mb-3 tracking-tight">
                  {step.title}
                </div>
                <p className="font-sans text-muted-foreground text-[13px] leading-[1.72]">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Divider height={60} />

      {/* CLIENT CONFIGS */}
      <section>
        <div className="max-w-[1280px] mx-auto px-4 md:px-14 py-12 md:py-24">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
            <h2
              className="font-heading text-foreground leading-[1.0] tracking-tight"
              style={{ fontSize: "clamp(36px, 4vw, 52px)" }}
            >
              Client
              <br /><span style={{ color: "var(--primary)" }}>configurations.</span>
            </h2>
            <p className="font-sans text-muted-foreground text-[14px] leading-relaxed max-w-[38ch] sm:text-right">
              Get your API key from <span className="font-mono text-[13px] text-foreground/50">~/.corvin/config</span> after{" "}
              <span className="font-mono text-[13px] text-foreground/50">corvin login</span>, or from the dashboard.
            </p>
          </div>

          {/* client tabs */}
          <div className="flex flex-wrap gap-2 mb-8">
            {CLIENTS.map((c, i) => (
              <button
                key={i}
                onClick={() => setActiveClient(i)}
                className="font-mono text-[11px] tracking-[0.08em] px-4 py-2 border transition-colors duration-150"
                style={{
                  borderColor: activeClient === i ? "var(--primary-dim)" : "rgba(255,255,255,0.07)",
                  color: activeClient === i ? "var(--primary)" : "rgba(255,255,255,0.3)",
                  background: activeClient === i ? "var(--primary-faint)" : "transparent",
                }}
              >
                {c.name}
                <span
                  className="ml-2 text-[9px] tracking-[0.14em] uppercase opacity-50"
                >
                  {c.badge}
                </span>
              </button>
            ))}
          </div>

          {/* config block */}
          <div className="border border-border bg-card">
            <div className="px-5 py-3 border-b border-border flex items-center justify-between gap-4">
              <span className="font-mono text-[10.5px] text-muted-foreground/50 tracking-wide">
                {CLIENTS[activeClient].file}
              </span>
              <button
                onClick={() => copyConfig(activeClient)}
                className="font-mono text-[10px] tracking-[0.08em] px-3 py-1 border transition-colors duration-150"
                style={{
                  borderColor: "rgba(255,255,255,0.08)",
                  color: copiedClient === activeClient ? "var(--primary)" : "rgba(255,255,255,0.3)",
                }}
              >
                {copiedClient === activeClient ? "copied ✓" : "copy"}
              </button>
            </div>
            <pre
              className="px-5 py-5 font-mono text-[12.5px] leading-[1.85] overflow-auto"
              style={{ color: "oklch(0.62 0.05 155)" }}
            >
              {CLIENTS[activeClient].config}
            </pre>
          </div>

          {/* CLI command if available */}
          {CLIENTS[activeClient].cli && (
            <div className="mt-4 border border-border bg-card">
              <div className="px-5 py-2 border-b border-border">
                <span className="font-mono text-[10px] text-muted-foreground/35 tracking-wide">or via CLI</span>
              </div>
              <pre className="px-5 py-4 font-mono text-[12px] leading-[1.85] overflow-auto text-foreground/55">
                <span style={{ color: "var(--primary-dim)" }}>$ </span>{CLIENTS[activeClient].cli}
              </pre>
            </div>
          )}

          {/* note */}
          <p className="mt-4 font-sans text-[12.5px] text-muted-foreground/40 leading-relaxed">
            {CLIENTS[activeClient].note}
          </p>
        </div>
      </section>

      <Divider height={60} />

      {/* TOOLS REFERENCE */}
      <section>
        <div className="max-w-[1280px] mx-auto px-4 md:px-14 py-12 md:py-24">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
            <h2
              className="font-heading text-foreground leading-[1.0] tracking-tight"
              style={{ fontSize: "clamp(36px, 4vw, 52px)" }}
            >
              {TOOLS.length} tools.
              <br /><span style={{ color: "var(--primary)" }}>Zero setup.</span>
            </h2>
            <p className="font-sans text-muted-foreground text-[14px] leading-relaxed max-w-[38ch] sm:text-right">
              Tools are scoped to your session — only services connected under your API key are accessible.
            </p>
          </div>

          <div className="border-t border-border">
            {TOOLS.map((t) => (
              <div
                key={t.name}
                className="group border-b border-border py-5 grid items-start gap-x-8 gap-y-2"
                style={{ gridTemplateColumns: "clamp(160px, 18%, 220px) 1fr" }}
              >
                <span
                  className="font-mono text-[12px] pt-[2px]"
                  style={{ color: "var(--primary)", opacity: 0.85 }}
                >
                  {t.name}
                </span>
                <div className="min-w-0">
                  <p className="font-sans text-foreground/70 text-[13.5px] leading-[1.65] mb-1.5">
                    {t.desc}
                  </p>
                  <span
                    className="font-mono text-[10.5px] opacity-40"
                    style={{ color: "var(--primary)" }}
                  >
                    {t.params}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Divider height={60} />

      {/* SECURITY */}
      <section>
        <div className="max-w-[1280px] mx-auto px-4 md:px-14 py-12 md:py-24">
          <h2
            className="font-heading text-foreground leading-[1.0] tracking-tight mb-12"
            style={{ fontSize: "clamp(36px, 4vw, 52px)" }}
          >
            Security
            <br /><span style={{ color: "var(--primary)" }}>model.</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 border-t border-l border-border">
            {[
              {
                title: "Scoped to your session",
                body: "MCP tools only reach services connected under your API key. Requesting another user's serviceId returns an access-denied error.",
              },
              {
                title: "Same key, two paths",
                body: "The Corvin CLI API key authorises both WebSocket connections and MCP requests. Revoke it in the dashboard to immediately block both.",
              },
              {
                title: "Local by default",
                body: "The MCP server runs on your machine at api.usecorvin.space. Nothing is forwarded to a third party. Use HTTPS + a reverse proxy for remote access.",
              },
            ].map((item) => (
              <div key={item.title} className="border-r border-b border-border px-8 py-10">
                <div
                  className="w-[6px] h-[6px] mb-7 shrink-0"
                  style={{ background: "var(--primary)" }}
                />
                <div className="font-sans font-semibold text-foreground text-[15px] mb-3">
                  {item.title}
                </div>
                <p className="font-sans text-muted-foreground text-[13px] leading-[1.72]">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Divider height={80} />

      {/* CTA */}
      <section>
        <div className="max-w-[1280px] mx-auto px-4 md:px-14 py-16 md:py-28">
          <div className="max-w-[560px]">
            <h2
              className="font-heading text-foreground leading-[1.0] tracking-tight mb-6"
              style={{ fontSize: "clamp(40px, 5vw, 64px)" }}
            >
              Start asking.
              <br />
              <span style={{ color: "var(--primary)" }}>From your editor.</span>
            </h2>
            <p className="font-sans text-muted-foreground text-[15px] leading-[1.75] mb-10 max-w-[44ch]">
              Install Corvin, run your services wrapped, add the MCP config, and your AI client can tail logs and read your code.
            </p>
            <div className="flex flex-wrap gap-4 items-center">
              <a
                href="https://app.usecorvin.space"
                className="font-sans font-semibold text-[13px] px-7 py-3.5 text-primary-foreground transition-opacity hover:opacity-90"
                style={{ background: "var(--primary)" }}
              >
                Get started →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div
          className="max-w-[1280px] mx-auto px-8 md:px-14 py-5 flex flex-wrap items-center justify-between gap-4"
        >
          <span className="font-mono text-[10px]" style={{ color: "rgba(255,255,255,0.18)" }}>
            © 2026 Corvin
          </span>
          <a
            href="https://x.com/that_webdev_guy"
            className="font-sans text-[11px] transition-colors duration-150"
            style={{ color: "rgba(255,255,255,0.22)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.22)")}
          >
            X(Twitter)
          </a>
        </div>
      </footer>
    </div>
  )
}
