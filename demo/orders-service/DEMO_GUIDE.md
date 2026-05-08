# Corvin Demo Guide

This guide helps you demonstrate Corvin's debugging capabilities across **independent microservices** using three bug scenarios.

## Key Selling Point

Unlike typical demos with monorepos, this showcases Corvin working across **completely separate codebases** - a real-world microservices scenario where bugs span multiple independent projects.

## Quick Start

```bash
# 1. Install dependencies for each service independently
npm install  # Root (for test scripts)
cd orders-service && npm install && cd ..
cd checkout-service && npm install && cd ..

# 2. Start Orders service (Terminal 1)
cd orders-service
npm start

# 3. Start Checkout service (Terminal 2)
cd checkout-service
npm start

# 4. Run test scenario (Terminal 3 - from root directory)
cd /path/to/corvin-demo
npm run test:contract-drift
```

## Demo Flow for Each Bug

### Demo 1: Contract Drift (Best for First Demo)

**Why start here**: Clearest signal, easiest to understand, perfect intro to cross-service debugging

**Setup** (2 minutes):
```bash
# Terminal 1
cd orders-service
npm start

# Terminal 2
cd checkout-service
npm start

# Terminal 3 (from root)
npm run test:contract-drift
```

**What happens**:
- Checkout service sends `firstName` + `lastName` (new schema)
- Orders service expects `fullName` (old schema)
- Request fails with validation error

**Demo narrative**:
1. "Notice we have two independent services with separate codebases"
2. "The checkout fails - let's see what Corvin finds..."
3. Point to both terminal windows showing different services

**Ask Corvin**:
```
"Why is checkout failing with a validation error?"
```

**Corvin should identify**:
- `[CHECKOUT]` logs show it's sending `firstName`/`lastName`
- `[ORDERS]` logs show validation error for missing `fullName`
- Schema in `orders-service/index.js:27` expects `fullName`
- **Key point**: Corvin navigated both separate service codebases

**Expected Fix Suggestions**:
- Update Orders schema to accept `firstName` + `lastName`
- Or add backward compatibility
- Or update Checkout to send `fullName`

**Demo highlight**: "Notice Corvin correlated logs from TWO independent services and found the schema mismatch in separate codebases"

---

### Demo 2: Missing EU Tax Config (Config-Driven Bug)

**Why second**: Shows Corvin can handle configuration issues across services

**Setup**:
```bash
# Keep services running from Demo 1
# Terminal 3 (from root)
npm run test:missing-tax
```

**What happens**:
- Order creation for Germany (DE) fails
- Tax calculation can't find DE in Orders service config
- Error shows available countries

**Ask Corvin**:
```
"Why can't we process orders for Germany?"
```

**Corvin should identify**:
- Orders logs: "no config for country DE"
- Config file `orders-service/config/tax-config.json` only has US, CA, GB
- Code in `orders-service/index.js:47` looks up country in config
- Missing DE entry in independent config file

**Expected Fix Suggestions**:
- Add EU countries to tax-config.json
- Add default tax rate fallback
- Better error message earlier in the flow

**Demo highlight**: "Corvin found a missing configuration in a separate service's config file"

---

### Demo 3: Payment Timeout Race (Most Impressive)

**Why last**: Most complex - requires temporal reasoning across services

**Setup**:
```bash
# Keep services running
# Terminal 3 (from root)
npm run test:payment-timeout
```

**What happens** (watch logs carefully in both terminals):
- Order created successfully in Orders service
- After 3 seconds: Orders service cancels order (timeout)
- After 4 seconds: Checkout service payment succeeds
- Payment update fails because order already cancelled

**Ask Corvin**:
```
"Payment succeeded but the order was cancelled - what happened?"
```

**Corvin should identify**:
- **Temporal sequence of events** across TWO services
- Orders has 3-second timeout (`ORDER_TIMEOUT_MS = 3000`)
- Checkout payment takes 4 seconds (`PAYMENT_DELAY_MS = 4000`)
- Race condition: timeout wins, payment arrives late
- Code in `orders-service/index.js:68` shows hardcoded timeout
- Code in `checkout-service/index.js:27` shows payment delay

**Expected Fix Suggestions**:
- Increase timeout to reasonable value (30+ seconds)
- Check payment status before cancelling
- Make timeout configurable
- Add reversibility if payment succeeds after cancellation

**Demo highlight**: "Corvin analyzed the timing between two independent services and identified a race condition by reading code in both codebases"

---

## Corvin Debugging Queries

### For Bug #1:
```
"The checkout is failing with a validation error. Can you debug this?"
"Why is the Orders service rejecting the request from Checkout?"
"Debug the validation error by looking at both services"
```

### For Bug #2:
```
"Orders for Germany are failing. What's wrong?"
"Why is tax calculation failing for EU countries?"
"Check both services - why can't we ship to Germany?"
```

### For Bug #3:
```
"Payment succeeded but the order shows as cancelled. What happened?"
"There's a race condition between payment and order timeout. Can you find it?"
"Why are orders getting cancelled even though payments succeed?"
"Analyze the logs from both services and find the timing issue"
```

## Expected Corvin Capabilities

Corvin should demonstrate:

1. **Cross-codebase analysis**:
   - Navigate between `orders-service/` and `checkout-service/` directories
   - Read files from both independent projects
   - Understand the relationship between services

2. **Log correlation**:
   - Match `[CHECKOUT]` and `[ORDERS]` log messages
   - Understand sequence of events across services
   - Identify cause-and-effect across service boundaries

3. **Code understanding**:
   - Read schema definitions in Orders service
   - Read payload construction in Checkout service
   - Understand configuration loading
   - Analyze timeout logic and timing

4. **Root cause identification**:
   - Contract drift between independent services
   - Missing configuration in one service
   - Race conditions across services
   - Hardcoded values causing issues

5. **Accurate fixes** with:
   - Specific file paths in correct service
   - Line numbers
   - Multiple solution options
   - Trade-offs for each approach

---

## Demo Presentation Tips

### Opening (2 minutes)
1. **Show the structure**: "We have two independent microservices - like separate repos"
2. **Point out key files**:
   - `orders-service/package.json` - "Independent dependencies"
   - `checkout-service/package.json` - "Completely separate project"
3. **Set expectations**: "Corvin will need to debug issues spanning both codebases"

### Running the Demo (5 minutes per bug)
1. **Terminal setup**: Show both services running in separate terminals
2. **Trigger the bug**: Run test script, show the failure
3. **Show the signals**: Point to logs in both service terminals
4. **Ask Corvin**: Use one of the queries above
5. **Highlight the analysis**: "Notice it's reading files from both services"
6. **Review the fix**: "It found the exact line in the right service"

### Closing
"Corvin successfully debugged production-like issues across independent microservices by:
- Correlating logs from different services
- Reading code in separate projects
- Understanding cross-service interactions
- Suggesting accurate fixes in the right codebase"

---

## Advanced Demo Techniques

### Show the "Independent Services" Advantage

```bash
# Show each service has its own dependencies
cat orders-service/package.json | grep express
cat checkout-service/package.json | grep express

# Show they can be versioned independently
# Orders uses joi for validation, Checkout doesn't
cat orders-service/package.json | grep joi
cat checkout-service/package.json | grep joi
```

### Multi-Bug Scenario

```bash
# Fix Bug #1, then trigger Bug #3
# Shows Corvin can handle sequential debugging

# After fixing contract drift, run:
npm run test:payment-timeout
```

### Custom Queries

Challenge Corvin with:
```
"I'm seeing errors in my checkout flow. Can you investigate both services?"
"Something's wrong between Orders and Checkout - debug it"
"Find all the bugs in this demo project"
```

---

## Troubleshooting the Demo

### Services won't start
```bash
# Check if ports are in use
lsof -i :3001
lsof -i :3002

# Kill processes if needed
kill -9 <PID>
```

### Tests fail to connect
```bash
# Verify services are running
curl http://localhost:3001/health
curl http://localhost:3002/health

# Check you're in the root directory for tests
pwd  # Should be /path/to/corvin-demo
```

### Want to see more detailed logs
```bash
# Services already log detailed info
# Just watch the terminal windows while tests run
```

### Want to reset state
```bash
# Just restart the services (all state is in-memory)
# Press Ctrl+C in each terminal
# Run npm start again
```

---

## Metrics to Highlight

After each demo, emphasize:

1. **Time to identify root cause**: How long did Corvin take?
2. **Accuracy**: Did it find the right issue?
3. **Cross-service awareness**: Did it look at both codebases?
4. **Fix quality**: Are the suggested fixes correct?
5. **Code precision**: Did it reference exact files and lines?
6. **Independence**: It worked across separate projects!

---

## Common Questions from Audience

**Q: "Why not use a monorepo?"**
A: "Real production environments often have separate repos per service. This demo shows Corvin can handle that reality."

**Q: "Can Corvin handle more than 2 services?"**
A: "Yes! This is just a demo. The same approach scales to N services."

**Q: "Does Corvin need special setup for multiple services?"**
A: "No special setup - it naturally navigates directory structures and correlates information."

**Q: "What if services have different languages?"**
A: "This demo uses Node.js for both, but Corvin can handle polyglot architectures."

---

## Extended Demo: Live Fixing

If you have time, show live fixing:

1. Run test, see it fail
2. Ask Corvin to debug
3. Ask Corvin to implement the fix
4. Verify the fix works

Example flow:
```bash
# Show bug
npm run test:missing-tax

# Ask Corvin: "Debug this and fix it"

# Corvin adds EU countries to tax-config.json

# Test again
npm run test:missing-tax  # Now passes!
```

This shows the complete debugging → fixing workflow.
