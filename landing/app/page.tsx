"use client"

import { useEffect, useState, useRef, useCallback } from "react"

// ─── data ─────────────────────────────────────────────────────────────────────

const INSTALL = "npm install -g corvin-cli"

const SVC: Record<string, string> = {
  orders:   "#60a5fa",
  checkout: "#a78bfa",
  gateway:  "#34d399",
}
const LVL: Record<string, string> = {
  error: "#f87171",
  warn:  "#fbbf24",
}

const LOGS = [
  { s: "gateway",  l: "info",  ts: "14:23:01", m: "POST /checkout  →  checkout:3002" },
  { s: "checkout", l: "info",  ts: "14:23:01", m: "charge()  timeout=3000ms" },
  { s: "orders",   l: "info",  ts: "14:23:02", m: "GET /orders/778  200  8ms" },
  { s: "checkout", l: "warn",  ts: "14:23:04", m: "2998ms elapsed, awaiting stripe" },
  { s: "checkout", l: "error", ts: "14:23:04", m: "Error: charge() timeout after 3001ms" },
  { s: "checkout", l: "error", ts: "14:23:04", m: "  at processPayment (src/index.ts:47)" },
  { s: "orders",   l: "warn",  ts: "14:23:04", m: "PUT /orders/778  status=failed" },
  { s: "gateway",  l: "error", ts: "14:23:04", m: "502 Bad Gateway  ←  checkout:3002" },
]

const CHAT = [
  { r: "user", t: "why is checkout 502ing?" },
  { r: "tool", t: "tailLogs",  d: "checkout · last 30 lines" },
  { r: "tool", t: "grepCode",  d: '"PAYMENT_TIMEOUT" src/' },
  { r: "tool", t: "readFile",  d: "src/index.ts · :40–55" },
  { r: "ai",   t: "processPayment() has PAYMENT_TIMEOUT=3000ms hardcoded at line 47. Stripe 3DS averages 3.8–4.2s, race on every 3DS payment.\n\nFix: PAYMENT_TIMEOUT=6000 in checkout/.env" },
]

const CAPABILITIES = [
  { n: "01", title: "Live multi-service logs",   body: "Every wrapped service streams into one pane. Color-coded by service, paginated, no terminal juggling.",                   cmd: "ws://4466"        },
  { n: "02", title: "Active code search",         body: "Ripgrep through your actual source. Reads files at specific line ranges. Follows the call stack depth by depth.",         cmd: "rg pattern src/"  },
  { n: "03", title: "20-step autonomous agent",   body: "Up to 20 tool calls per query: tail logs, grep code, read files, cross-reference, return a fix with line numbers.",       cmd: "maxSteps: 20"     },
  { n: "04", title: "Wrap any command",           body: "Replace any start command with corvin <cmd>. Node, Python, Go, Rust — if the process writes stdout, Corvin reads it.",   cmd: "corvin <cmd>"     },
  { n: "05", title: "Multi-service grouping",     body: "Shared id in corvin.yaml groups services together. The AI correlates logs and code across every connected process.",      cmd: "id: my-app"       },
  { n: "06", title: "Local by design",            body: "Nothing leaves your machine. No cloud ingestion, no log forwarding. Runs entirely on ws://localhost:4466.",              cmd: "~/.corvin/"       },
]

const TERMINALS = [
  {
    label: "Terminal A",
    badge: "TUI + server",
    cmd: "corvin",
    desc: "Start this first, leave it open. The TUI launches on :4466 and waits for services to connect. This is where you type questions.",
  },
  {
    label: "Terminal B",
    badge: "service 1",
    cmd: "corvin npm run dev",
    desc: "Wrap your first service. Logs stream to Terminal A automatically. The process itself runs normally — Corvin is a thin wrapper.",
  },
  {
    label: "Terminal C",
    badge: "service 2",
    cmd: "corvin python app.py",
    desc: "Add more services the same way. All logs land in Terminal A, color-coded by service. Repeat for as many services as you run.",
  },
]

const QUESTIONS = [
  "Orders service is returning 500 for /api/checkout — what's causing it?",
  "Payment succeeded but the order shows as cancelled — what happened and in what order?",
  "Why can't we process orders for the DE region? Check both services.",
  "There's a race condition between payment and order timeout — find it",
  "You found the schema mismatch — now tell me exactly what to change to fix it",
]

const STEPS = [
  {
    n: "01",
    cmd: "npm install -g corvin-cli",
    title: "Install",
    body: "One global install. Node 20+ required. Run corvin --version to verify.",
  },
  {
    n: "02",
    cmd: "corvin init",
    title: "Init",
    body: "Creates corvin.yaml in the project directory. Set a shared id to group services that should be debugged together.",
  },
  {
    n: "03",
    cmd: "corvin npm run dev",
    title: "Wrap",
    body: "Replace any start command with corvin <cmd>. Logs from every wrapped process stream to the TUI automatically.",
  },
  {
    n: "04",
    cmd: "> why did X fail?",
    title: "Ask",
    body: "Run corvin (no args) to open the TUI. Ask in plain English. The agent tails logs, greps code, reads files, returns a root-cause fix with line numbers.",
  },
]

const STACKS = [
  { lang: "Node.js",  cmd: "corvin npm run dev"        },
  { lang: "Python",   cmd: "corvin python app.py"       },
  { lang: "Go",       cmd: "corvin go run main.go"      },
  { lang: "Rust",     cmd: "corvin cargo run"           },
  { lang: "Ruby",     cmd: "corvin bundle exec rails s" },
  { lang: "Any",      cmd: "corvin <your-command>"      },
]

// ─── terminal demo ────────────────────────────────────────────────────────────

function TerminalDemo() {
  const [logCount, setLogCount]   = useState(0)
  const [chatCount, setChatCount] = useState(0)
  const [phase, setPhase]         = useState<"logs" | "chat" | "pause">("logs")
  const logRef = useRef<HTMLDivElement>(null)

  const reset = useCallback(() => {
    setLogCount(0); setChatCount(0); setPhase("logs")
  }, [])

  useEffect(() => {
    if (phase !== "logs") return
    let i = 0
    const t = setInterval(() => {
      i++; setLogCount(i)
      if (i >= LOGS.length) { clearInterval(t); setTimeout(() => setPhase("chat"), 500) }
    }, 220)
    return () => clearInterval(t)
  }, [phase])

  useEffect(() => {
    if (phase !== "chat") return
    let j = 0
    const t = setInterval(() => {
      j++; setChatCount(j)
      if (j >= CHAT.length) { clearInterval(t); setPhase("pause") }
    }, 860)
    return () => clearInterval(t)
  }, [phase])

  useEffect(() => {
    if (phase !== "pause") return
    const t = setTimeout(reset, 4500)
    return () => clearTimeout(t)
  }, [phase, reset])

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [logCount])

  return (
    <div className="w-full border border-border bg-card font-mono text-xs">
      {/* title bar */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-background/60">
        <div className="flex gap-1.5">
          <span className="w-3 h-3 block bg-border" />
          <span className="w-3 h-3 block bg-border" />
          <span className="w-3 h-3 block" style={{ background: "var(--primary)" }} />
        </div>
        <span className="text-muted-foreground text-[10px] tracking-wider ml-2">
          corvin — local cluster
        </span>
        <div className="ml-auto flex gap-4">
          {Object.entries(SVC).map(([name, color]) => (
            <span key={name} style={{ color, fontSize: 10 }}>● {name}</span>
          ))}
        </div>
      </div>

      {/* split pane */}
      <div className="grid grid-cols-2" style={{ minHeight: 300 }}>
        {/* logs */}
        <div className="border-r border-border flex flex-col">
          <div className="px-5 py-2 border-b border-border text-[9px] uppercase tracking-[0.2em] text-muted-foreground/50">
            live logs
          </div>
          <div
            ref={logRef}
            className="no-scrollbar flex-1 overflow-y-auto py-3 px-5 flex flex-col gap-0.5 leading-[1.8]"
          >
            {LOGS.slice(0, logCount).map((line, i) => (
              <div key={i} className="flex gap-3 min-w-0">
                <span className="shrink-0 text-muted-foreground/30 text-[10px] tabular-nums">
                  {line.ts}
                </span>
                <span className="shrink-0 text-[10px] w-[62px]" style={{ color: SVC[line.s], opacity: 0.85 }}>
                  [{line.s}]
                </span>
                <span className="truncate" style={{ color: LVL[line.l] ?? "oklch(0.52 0.008 286)" }}>
                  {line.m}
                </span>
              </div>
            ))}
            {phase === "logs" && (
              <span className="blink text-muted-foreground/40">▌</span>
            )}
          </div>
        </div>

        {/* chat */}
        <div className="flex flex-col">
          <div className="px-5 py-2 border-b border-border text-[9px] uppercase tracking-[0.2em] text-muted-foreground/50">
            debug chat
          </div>
          <div className="no-scrollbar flex-1 overflow-y-auto py-3 px-5 flex flex-col gap-3">
            {CHAT.slice(0, chatCount).map((msg, i) => {
              if (msg.r === "user") return (
                <div key={i} className="flex gap-2 items-start">
                  <span className="text-primary font-bold shrink-0 mt-px">›</span>
                  <span className="text-foreground/90 leading-[1.65]">{msg.t}</span>
                </div>
              )
              if (msg.r === "tool") return (
                <div key={i} className="flex gap-2 items-start opacity-40">
                  <span className="shrink-0 mt-[3px] text-[9px] text-primary">●</span>
                  <span className="text-muted-foreground text-[10.5px] leading-[1.65]">
                    <span className="text-foreground/50">{msg.t}</span>{" "}{msg.d}
                  </span>
                </div>
              )
              if (msg.r === "ai") return (
                <div
                  key={i}
                  className="border border-primary/20 bg-primary/5 text-foreground/85 leading-[1.72] text-[11px] p-3 whitespace-pre-line"
                >
                  {msg.t}
                </div>
              )
              return null
            })}
          </div>
          <div className="border-t border-border px-5 py-3 flex items-center gap-2">
            <span className="text-primary">›</span>
            <span className="text-muted-foreground/25 text-[11px]">ask anything...</span>
            <span
              className="blink inline-block w-[6px] h-[12px] ml-1"
              style={{ background: "var(--primary)", opacity: 0.5 }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function Page() {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard?.writeText(INSTALL)
    setCopied(true)
    setTimeout(() => setCopied(false), 2200)
  }

  return (
    <div className="bg-background min-h-screen text-foreground overflow-x-hidden">

      {/* ── NAV ─────────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/95">
        <div className="max-w-[1280px] mx-auto px-8 md:px-14 h-[52px] flex items-center gap-4">
          <span className="font-mono text-[13px] font-bold tracking-[0.06em] text-primary">
            CORVIN
          </span>
          <span
            className="font-mono text-[9px] tracking-[0.12em] px-2 py-0.5 border uppercase"
            style={{
              color: "var(--primary-dim)",
              borderColor: "var(--primary-dim)",
              background: "var(--primary-faint)",
            }}
          >
            v0.1
          </span>
          <div className="ml-auto flex items-center gap-1">
            {["Docs", "GitHub"].map((l) => (
              <a
                key={l}
                href="#"
                className="font-sans text-muted-foreground text-[13px] px-3 py-1.5 hover:text-foreground transition-colors duration-150"
              >
                {l}
              </a>
            ))}
            <button
              className="ml-3 font-sans text-[13px] font-semibold px-5 py-2 text-primary-foreground transition-opacity hover:opacity-90"
              style={{ background: "var(--primary)" }}
            >
              Get started
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section className="max-w-[1280px] mx-auto px-8 md:px-14 pt-20 pb-0">

        {/* classification strip — technical document header, Space Grotesk only */}
        <div className="fade-up-1 flex items-stretch border border-border font-sans text-[9px] font-semibold tracking-[0.18em] uppercase text-muted-foreground/25 mb-20">
          {["Corvin", "AI debugging agent", "Local-first", "v0.1"].map((label, i) => (
            <div key={label} className="px-5 py-3 border-r border-border">
              {label}
            </div>
          ))}
          <div className="ml-auto px-5 py-3 border-l border-border text-muted-foreground/15">
            2025
          </div>
        </div>

        {/* headline — Playfair Display, one decisive statement */}
        <h1
          className="fade-up-2 font-heading font-extrabold text-foreground leading-[1.0] tracking-tight mb-9"
          style={{ fontSize: "clamp(54px, 7.5vw, 108px)", maxWidth: "12ch" }}
        >
          The bug is
          <br />in the code.
        </h1>

        {/* body — one sentence, nothing more */}
        <p
          className="fade-up-3 font-sans text-muted-foreground leading-[1.80] mb-12"
          style={{ fontSize: "clamp(15px, 1.5vw, 18px)", maxWidth: "50ch" }}
        >
          Corvin wraps your services, reads logs and source code in real-time,
          and traces every failure down to the file and line number.
        </p>

        {/* install — quiet, no section label */}
        <div className="fade-up-4 flex items-center border border-border mb-5">
          <div className="flex-1 px-5 py-4 font-mono text-[13px] text-foreground/60 flex items-center gap-3 min-w-0">
            <span style={{ color: "var(--primary)" }}>$</span>
            <span className="truncate">{INSTALL}</span>
          </div>
          <button
            onClick={copy}
            className="px-5 py-4 font-sans text-[11px] font-medium border-l border-border text-muted-foreground/25 hover:text-foreground transition-colors duration-150 shrink-0"
          >
            {copied ? "copied ✓" : "copy"}
          </button>
        </div>

        <div className="fade-up-4 pb-6">
          <a
            href="#"
            className="font-sans text-[13px] text-muted-foreground/40 hover:text-foreground transition-colors duration-150"
          >
            Read docs →
          </a>
        </div>

      </section>

      {/* ── TERMINAL DEMO ─────────────────────────────────────────────────────── */}
      <section className="fade-up-5 max-w-[1280px] mx-auto px-8 md:px-14 pt-16 pb-0">
        <TerminalDemo />
      </section>

      {/* lime bloom below demo */}
      <div
        className="pointer-events-none"
        style={{
          height: 1,
          background: "var(--primary)",
          opacity: 0.12,
          boxShadow: "0 0 120px 40px var(--primary)",
          transform: "translateY(-1px)",
        }}
      />

      {/* ── WORKFLOW — the 3-terminal setup ──────────────────────────────────── */}
      <section className="border-t border-border">
        <div className="max-w-[1280px] mx-auto px-8 md:px-14 py-24">

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-16">
            <h2
              className="font-heading font-bold text-foreground leading-[1.0] tracking-tight"
              style={{ fontSize: "clamp(36px, 4vw, 52px)" }}
            >
              The 3-terminal setup.
            </h2>
            <p className="font-sans text-muted-foreground text-[14px] leading-relaxed max-w-[36ch] sm:text-right">
              One terminal runs the TUI and server.
              The rest wrap your services. Logs flow automatically.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 border-t border-l border-border">
            {TERMINALS.map((t, i) => (
              <div key={i} className="border-r border-b border-border px-8 py-10">
                <div className="flex items-center justify-between mb-6">
                  <span className="font-mono text-[11px] text-muted-foreground/40 tracking-wider">
                    {t.label}
                  </span>
                  <span
                    className="font-mono text-[9px] tracking-[0.16em] px-2 py-0.5 border uppercase"
                    style={{
                      color: "var(--primary)",
                      borderColor: "var(--primary-dim)",
                      background: "var(--primary-faint)",
                    }}
                  >
                    {t.badge}
                  </span>
                </div>
                <div className="font-mono text-[13px] mb-6 flex items-center gap-2">
                  <span style={{ color: "var(--primary-dim)" }}>$</span>
                  <span className="text-foreground/85">{t.cmd}</span>
                </div>
                <p className="font-sans text-muted-foreground text-[13px] leading-[1.72]">
                  {t.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-8 font-mono text-[11px] text-muted-foreground/35">
            <span>
              <span className="text-foreground/25 mr-2">Ctrl+C</span>
              exit Corvin
            </span>
            <span>
              <span className="text-foreground/25 mr-2">Ctrl+E</span>
              expand / collapse service list
            </span>
          </div>
        </div>
      </section>

      {/* ── CAPABILITIES ─────────────────────────────────────────────────────── */}
      <section className="border-t border-border">
        <div className="max-w-[1280px] mx-auto px-8 md:px-14 py-24">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
            <h2
              className="font-heading font-bold text-foreground leading-[1.0] tracking-tight"
              style={{ fontSize: "clamp(36px, 4vw, 52px)" }}
            >
              Not a chatbot.
              <br />A debugging agent.
            </h2>
            <p className="font-sans text-muted-foreground text-[14px] leading-relaxed max-w-[36ch] sm:text-right">
              Corvin takes up to 20 autonomous tool steps per query.
              Read, grep, infer, answer.
            </p>
          </div>

          <div className="border-t border-border">
            {CAPABILITIES.map((cap) => (
              <div
                key={cap.n}
                className="group border-b border-border py-5 grid items-start gap-x-8 gap-y-1"
                style={{ gridTemplateColumns: "2.5rem 1fr auto" }}
              >
                <span
                  className="font-mono text-[11px] tabular-nums pt-[3px]"
                  style={{ color: "var(--primary)" }}
                >
                  {cap.n}
                </span>
                <div>
                  <div className="font-sans font-semibold text-foreground text-[15px] mb-1">
                    {cap.title}
                  </div>
                  <p className="font-sans text-muted-foreground text-[13px] leading-relaxed">
                    {cap.body}
                  </p>
                </div>
                <span
                  className="font-mono text-[10.5px] whitespace-nowrap pt-[3px] opacity-60 group-hover:opacity-100 transition-opacity"
                  style={{ color: "var(--primary)" }}
                >
                  {cap.cmd}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── REAL QUESTIONS ───────────────────────────────────────────────────── */}
      <section className="border-t border-border">
        <div className="max-w-[1280px] mx-auto px-8 md:px-14 py-24">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-16">
            <h2
              className="font-heading font-bold text-foreground leading-[1.0] tracking-tight"
              style={{ fontSize: "clamp(36px, 4vw, 52px)" }}
            >
              Ask it anything.
              <br />It will find it.
            </h2>
            <p className="font-sans text-muted-foreground text-[14px] leading-relaxed max-w-[38ch] sm:text-right">
              These are questions engineers actually ask. Corvin reads
              logs and source code across every connected service before answering.
            </p>
          </div>

          <div className="border-t border-border">
            {QUESTIONS.map((q, i) => (
              <div
                key={i}
                className="border-b border-border py-6 flex items-start gap-5 group"
              >
                <span
                  className="font-mono text-[15px] mt-[2px] shrink-0 opacity-40 group-hover:opacity-100 transition-opacity"
                  style={{ color: "var(--primary)" }}
                >
                  ›
                </span>
                <span className="font-mono text-[13.5px] text-foreground/65 leading-[1.65] group-hover:text-foreground/90 transition-colors">
                  {q}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MULTI-SERVICE ─────────────────────────────────────────────────────── */}
      <section className="border-t border-border">
        <div className="max-w-[1280px] mx-auto px-8 md:px-14 py-24">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-16 items-start">

            {/* left: explanation */}
            <div>
              <p
                className="font-sans text-[11px] font-semibold tracking-[0.22em] uppercase mb-7"
                style={{ color: "var(--primary)" }}
              >
                Multi-service
              </p>
              <h2
                className="font-heading font-bold text-foreground leading-[1.0] tracking-tight mb-7"
                style={{ fontSize: "clamp(36px, 4vw, 52px)" }}
              >
                One project.
                <br />Multiple services.
              </h2>
              <p className="font-sans text-muted-foreground text-[14px] leading-[1.78] mb-8 max-w-[44ch]">
                Set the same <span className="font-mono text-foreground/60 text-[13px]">id</span> in every
                service's <span className="font-mono text-foreground/60 text-[13px]">corvin.yaml</span>.
                When both are running wrapped, the AI sees them as one project.
                Logs correlate, stack traces link across service boundaries.
              </p>
              <div className="flex flex-col gap-2.5 font-mono text-[12px] text-muted-foreground/40">
                <span>commit corvin.yaml to your repo</span>
                <span>teammates pick up the same grouping automatically</span>
                <span>use corvin config --message to update descriptions without touching yaml</span>
              </div>
            </div>

            {/* right: two yaml files */}
            <div className="flex flex-col gap-4">
              {[
                {
                  file: "orders-service/corvin.yaml",
                  id: "ecom-app",
                  desc: "handles order creation, status, and cancellation",
                  name: "OrdersService",
                },
                {
                  file: "checkout-service/corvin.yaml",
                  id: "ecom-app",
                  desc: "handles cart, payment processing, and checkout flow",
                  name: "CheckoutService",
                },
              ].map((cfg) => (
                <div key={cfg.file} className="border border-border bg-card">
                  <div className="px-5 py-2.5 border-b border-border font-mono text-[10px] text-muted-foreground/40 tracking-wide">
                    {cfg.file}
                  </div>
                  <pre className="px-5 py-4 font-mono text-[12px] leading-[1.9] text-foreground/65 overflow-auto">
{`id: "${cfg.id}"
description: "${cfg.desc}"
name: "${cfg.name}"`}
                  </pre>
                </div>
              ))}
              <div className="flex items-center gap-3 mt-1">
                <span
                  className="w-[6px] h-[6px] block shrink-0"
                  style={{ background: "var(--primary)" }}
                />
                <span className="font-mono text-[11px] text-muted-foreground/40">
                  same id — same project group — AI correlates across both
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────────── */}
      <section className="border-t border-border">
        <div className="max-w-[1280px] mx-auto px-8 md:px-14 py-24">
          <h2
            className="font-heading font-bold text-foreground leading-[1.0] tracking-tight mb-16"
            style={{ fontSize: "clamp(36px, 4vw, 52px)" }}
          >
            Four commands.
            <br />Zero guesswork.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 border-t border-l border-border">
            {STEPS.map((step) => (
              <div key={step.n} className="border-r border-b border-border px-8 py-10">
                <div
                  className="font-heading font-extrabold leading-none mb-8 tracking-tight"
                  style={{
                    fontSize: "clamp(64px, 6vw, 88px)",
                    color: "var(--primary)",
                  }}
                >
                  {step.n}
                </div>
                <div
                  className="font-mono text-[10px] mb-4 inline-block border px-2 py-1"
                  style={{
                    color: "var(--primary)",
                    borderColor: "var(--primary-dim)",
                    background: "var(--primary-faint)",
                  }}
                >
                  {step.cmd}
                </div>
                <div className="font-sans font-semibold text-foreground text-[17px] mb-3 tracking-tight">
                  {step.title}
                </div>
                <p className="font-sans text-muted-foreground text-[14px] leading-[1.72]">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STACK ────────────────────────────────────────────────────────────── */}
      <section className="border-t border-border">
        <div className="max-w-[1280px] mx-auto px-8 md:px-14 py-24">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
            <h2
              className="font-heading font-bold text-foreground leading-[1.0] tracking-tight"
              style={{ fontSize: "clamp(32px, 3.5vw, 44px)" }}
            >
              Works with your stack.
            </h2>
            <p className="font-sans text-muted-foreground text-[14px] leading-relaxed max-w-[36ch] sm:text-right">
              If the process writes to stdout, Corvin can wrap it.
              No plugins, no SDKs.
            </p>
          </div>

          <div className="border-t border-border">
            {STACKS.map((s) => (
              <div
                key={s.lang}
                className="border-b border-border py-4 grid items-center gap-x-8"
                style={{ gridTemplateColumns: "96px 1fr" }}
              >
                <span className="font-sans font-semibold text-[13px] text-foreground">
                  {s.lang}
                </span>
                <span className="font-mono text-[12px] text-muted-foreground/55">
                  <span style={{ color: "var(--primary-dim)" }}>$ </span>
                  {s.cmd}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section className="border-t border-border">
        <div className="max-w-[1280px] mx-auto px-8 md:px-14 py-28">
          <div className="max-w-[640px]">
            <p
              className="font-sans text-[11px] font-semibold tracking-[0.22em] uppercase mb-7"
              style={{ color: "var(--primary)" }}
            >
              Open source
            </p>
            <h2
              className="font-heading font-bold text-foreground leading-[1.0] tracking-tight mb-6"
              style={{ fontSize: "clamp(40px, 5vw, 64px)" }}
            >
              Ship faster.
              <br />
              <span style={{ color: "var(--primary)" }}>Debug smarter.</span>
            </h2>
            <p className="font-sans text-muted-foreground text-[15px] leading-[1.75] mb-12 max-w-[48ch]">
              Free to run locally. Nothing leaves your machine.
              Wraps any process, reads any codebase.
            </p>
            <div className="flex flex-wrap gap-3 items-center">
              <button
                onClick={copy}
                className="font-mono font-semibold text-[13px] px-7 py-3.5 text-primary-foreground flex items-center gap-2.5 transition-opacity hover:opacity-90"
                style={{ background: "var(--primary)" }}
              >
                <span className="opacity-60">$</span>
                {INSTALL}
                <span className="opacity-50 text-xs">{copied ? "✓" : "⎘"}</span>
              </button>
              <a
                href="#"
                className="font-sans text-[13px] text-muted-foreground border border-border px-7 py-3.5 hover:text-foreground hover:border-border/80 transition-all duration-150"
              >
                View on GitHub →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <footer className="border-t border-border">
        <div className="max-w-[1280px] mx-auto px-8 md:px-14 py-7 flex flex-wrap items-center justify-between gap-4">
          <span
            className="font-mono font-bold text-[13px] tracking-[0.06em]"
            style={{ color: "var(--primary)" }}
          >
            CORVIN
          </span>
          <span className="font-mono text-muted-foreground/40 text-[11px]">
            © 2025 · local-first AI debugging
          </span>
          <div className="flex gap-6">
            {["GitHub", "Docs", "Twitter"].map((l) => (
              <a
                key={l}
                href="#"
                className="font-sans text-muted-foreground/50 text-xs hover:text-foreground transition-colors"
              >
                {l}
              </a>
            ))}
          </div>
        </div>
      </footer>

    </div>
  )
}
