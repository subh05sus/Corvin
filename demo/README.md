# Corvin Demo

**See how Corvin debugs bugs across microservices in under 2 minutes.**

This demo shows Corvin investigating 3 realistic bugs: schema drift, missing config, and race conditions—across two independent services with one command.

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/corvin-ai/demo?quickstart=1)

---

## 🚀 Start Here

After clicking the Codespaces button above, **setup takes ~5 minutes**. You'll see progress in a terminal that automatically closes when ready.

**Once setup completes:**

A new terminal will open automatically. Run:
```bash
npm run demo
```

**💡 Tip:** Maximize the terminal for the best view.

This opens 3 labeled panes:
- **📦 Orders Service** - Live logs (top)
- **🛒 Checkout Service** - Live logs (middle)  
- **Interactive Menu** - Your controls (bottom)

Corvin Studio opens in your browser automatically. If it doesn't, click the link in the **Interactive Menu**.

**Debug your first bug:**
1. Type `1` in the menu to trigger Bug #1
2. Watch error logs appear in service panes above
3. Switch to Corvin Studio (browser tab)
4. Copy/paste the suggested question (or describe the issue your way)
5. Watch Corvin investigate across both services!

Press Enter to try more bugs. Type `q` to exit.

---

## 🐛 The Three Bugs

| Bug | What's Broken | What Corvin Finds |
|-----|---------------|-------------------|
| **1. Contract Drift** | Orders expects `fullName`, Checkout sends `firstName`/`lastName` | Schema mismatch + exact file locations |
| **2. Missing EU Tax** | Orders missing tax rates for DE, FR, IT, ES | Missing config entries + which countries |
| **3. Timeout Race** | Order cancels at 3s, payment succeeds at 4s | Timing mismatch + suggested fix |

Each bug takes ~60 seconds to investigate with Corvin vs 10+ minutes manually.

---

## 💡 What You'll Learn

- ✅ How Corvin investigates across multiple services
- ✅ How it correlates logs, code, and configs
- ✅ How it identifies root causes, not just symptoms
- ✅ How it works with real distributed systems

---

## 📚 Need Help?

<details>
<summary><b>Terminal looks cramped?</b></summary>

Maximize the terminal for the best experience:
- Click the `[]` icon in the terminal header
- Or drag the divider up
</details>

<details>
<summary><b>What are the pane labels?</b></summary>

The demo uses tmux with 3 labeled panes:
- **📦 Orders Service (3001)** - Top pane, logs prefixed with [ORDERS]
- **🛒 Checkout Service (3002)** - Middle pane, logs prefixed with [CHECKOUT]
- **Interactive Menu** - Bottom pane with Corvin Studio link

Pane titles are always visible at the top of each section.
</details>

<details>
<summary><b>How do I navigate tmux?</b></summary>

**Useful commands:**
- **Switch panes:** `Ctrl+B` then arrow keys
- **Scroll logs:** `Ctrl+B` then `[` (arrow keys to scroll, `q` to exit)
- **Zoom pane:** `Ctrl+B` then `z` (fullscreen toggle)
</details>

<details>
<summary><b>How do I exit?</b></summary>

**Normal exit:** Type `q` in the menu

**Manual cleanup if needed:**
```bash
npm run demo:cleanup
```

**Check if still running:**
```bash
tmux ls                    # List tmux sessions
ps aux | grep debug        # Check for debug processes
```
</details>

<details>
<summary><b>Want to run without tmux?</b></summary>

Open 5 terminals manually:

**Terminal 1:** `debug` (starts the Corvin server)
**Terminal 2:** `cd orders-service && debug npm run dev`
**Terminal 3:** `cd checkout-service && debug npm run dev`
**Terminal 4:** `debug studio`
**Terminal 5:** `npm run demo:bug1` (or bug2, bug3)
</details>

<details>
<summary><b>Running locally instead of Codespaces?</b></summary>
```bash
git clone https://github.com/USERNAME/REPO
cd REPO
npm run install:all && npm run build:all

# Get your auth key from https://usecorvin.space
debug login <your-auth-key>

npm run demo
```
</details>

---

## 🔧 What's Inside

**Architecture:**
- Two independent TypeScript services (Orders, Checkout)
- Each has its own package.json, tsconfig, codebase
- Services communicate via HTTP (like production microservices)
- Corvin connects to both and investigates across them

**The bugs are realistic:**
- **Schema drift** - API contracts fall out of sync between services
- **Missing config** - Incomplete configuration files causing failures
- **Race conditions** - Timing issues under concurrent load

**What Corvin does:**
1. Streams logs from both services in real-time
2. Reads codebase and configuration files
3. Traces requests across service boundaries
4. Identifies root cause with file/line precision
5. Suggests fixes based on the investigation

---

## 📖 Bug Details

### Bug #1: Contract Drift 🔌

**What's broken:** Orders service expects `fullName`, Checkout sends `firstName` + `lastName`

**What you'll see in logs:**
- Orders: `"Validation error: fullName is required"`
- Checkout: `"Sending order with firstName/lastName"`

**Ask Corvin:** `"Checkout is failing with fullName validation error"`

**What Corvin finds:**
- Schema mismatch between services
- Orders expects: `{ fullName: string }`
- Checkout sends: `{ firstName: string, lastName: string }`
- Exact file locations: `orders-service/index.ts:27` vs `checkout-service/index.ts:57`
- Suggests: Align schemas or add backward compatibility

---

### Bug #2: Missing EU Tax Config 🇪🇺

**What's broken:** Orders service missing tax rates for Germany, France, Italy, Spain

**What you'll see in logs:**
- Orders: `"Tax calculation failed - no config for country DE"`
- Orders: `"Available countries: US, CA, GB"`

**Ask Corvin:** `"Tax calculation failing for German orders"`

**What Corvin finds:**
- Missing configuration in `orders-service/config/tax-config.json`
- Config has: US (8%), CA (13%), GB (20%)
- Missing: DE, FR, IT, ES
- Suggests: Add missing countries with appropriate VAT rates

---

### Bug #3: Payment Timeout Race ⏱️

**What's broken:** Orders cancels after 3 seconds, Payment takes 4 seconds

**What you'll see in logs:**
- T+0s: Orders: `"Order created, setting 3s timeout"`
- T+3s: Orders: `"Timeout reached - cancelling order"`
- T+4s: Checkout: `"Payment succeeded"`
- T+4s: Checkout: `"Failed to update order - already cancelled"`

**Ask Corvin:** `"Order was cancelled but payment succeeded"`

**What Corvin finds:**
- Timeout configuration mismatch
- Orders timeout: 3000ms (`orders-service/index.ts:68`)
- Payment delay: 4000ms (`checkout-service/index.ts:27`)
- Suggests: Increase order timeout to 30s or optimize payment processing

---

## 🤝 Using Corvin with Your Services

This demo uses a shared Corvin account (rate-limited).

**For production use:**
1. Sign up at [usecorvin.space](https://usecorvin.space)
2. Get your auth key
3. Run: `debug login <your-key>`
4. Connect to your own services: `debug npm run dev`
5. Open Studio: `debug studio`
6. Start debugging!

---

## 📄 License

MIT

---

**Questions or issues?** Open an issue on this repo or reach out at [your contact info]