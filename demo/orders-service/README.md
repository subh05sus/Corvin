# Corvin Demo - Debugging Scenarios

This project demonstrates three common production debugging scenarios that the Corvin copilot can help resolve. The demo features **two completely independent microservices** (Orders and Checkout) in **separate repositories** with separate codebases and logs that Corvin must correlate to identify and fix bugs.

## Architecture

```
┌──────────────────┐         ┌───────────────────┐
│                  │         │                   │
│  checkout-service│────────>│  orders-service   │
│  (Port 3002)     │         │  (Port 3001)      │
│  Separate repo   │         │  This repo        │
│                  │         │                   │
└──────────────────┘         └───────────────────┘
```

## Key Demo Feature

Unlike monorepo examples, these services are **completely independent projects in separate repositories**:
- Separate Git repositories (checkout-service and corvin-demo)
- Independent dependencies and configurations
- Different log formats and structures
- **Corvin must work across both repositories to debug issues**

This simulates real-world microservice debugging where you need to correlate logs and code from multiple services across different repositories.

## Bugs Demonstrated

### Bug #1: Contract Drift (fullName → firstName + lastName)

**Scenario**: Orders service expects `fullName` field, but Checkout service sends `firstName` + `lastName`

**Signals**:
- `[CHECKOUT]` logs show outgoing payload with `firstName` and `lastName`
- `[ORDERS]` logs show validation error: `"fullName" is required`
- `orders-service/index.js:27` - schema expects `fullName`

**Fix Options**:
1. Update Orders service to accept new schema with `firstName` + `lastName`
2. Add backward compatibility to accept both schemas
3. Update Checkout to send `fullName`

### Bug #2: Missing EU Tax Configuration

**Scenario**: Tax calculation fails for EU countries (DE, FR, IT, ES) because they're not in the config file

**Signals**:
- `[ORDERS]` logs show "tax calculation failed" for country code
- `[ORDERS]` logs list available countries (only US, CA, GB)
- `orders-service/config/tax-config.json` is missing EU entries
- `orders-service/index.js:47` - `calculateTax` function throws error

**Fix Options**:
1. Add EU countries to `tax-config.json`
2. Add default tax rate fallback
3. Fail earlier with clearer error message in Checkout

### Bug #3: Payment Timeout Race Condition

**Scenario**: Order gets cancelled due to hardcoded 3-second timeout while payment (4 seconds) is still processing

**Signals**:
- `[ORDERS]` logs show timeout cancellation after 3 seconds
- `[CHECKOUT]` logs show payment success after 4 seconds
- `[CHECKOUT]` logs show error: "Order already cancelled"
- `orders-service/index.js:68` - `ORDER_TIMEOUT_MS = 3000` (hardcoded)
- `checkout-service/index.js:27` - `PAYMENT_DELAY_MS = 4000`

**Fix Options**:
1. Increase timeout to reasonable value (e.g., 30 seconds)
2. Check payment status before cancelling order
3. Make cancellation reversible if payment succeeds later
4. Use configurable timeouts instead of hardcoded values

## Setup

### Prerequisites
- Node.js 18+ installed
- npm 9+

### Installation

Both services are in separate repositories. Clone both repositories:

```bash
# Clone this repository (Orders service + test scenarios)
git clone <this-repo-url> corvin-demo
cd corvin-demo
npm install

# Build and start Orders service
npm run build
npm start
```

In a separate directory, clone and set up the Checkout service:

```bash
# Clone the Checkout service repository
git clone <checkout-service-repo-url> checkout-service
cd checkout-service
npm install

# Build and start Checkout service
npm run build
npm start
```

### Running the Services

**You must run each service in a separate terminal** to see their independent logs:

```bash
# Terminal 1 - Orders service (from corvin-demo directory)
cd corvin-demo
npm start

# Terminal 2 - Checkout service (from checkout-service directory)
cd checkout-service
npm start
```

Services will start on:
- Orders: http://localhost:3001
- Checkout: http://localhost:3002

## Testing the Bugs

Run test scripts from the **corvin-demo directory** (this repository) while both services are running:

### Test Bug #1: Contract Drift
```bash
npm run test:contract-drift
```

**Expected behavior**: Checkout fails with validation error because Checkout sends `firstName` + `lastName` but Orders expects `fullName`.

**What to look for**:
1. Watch both service logs side-by-side
2. See `[CHECKOUT]` log the outgoing payload structure
3. See `[ORDERS]` log the validation failure
4. Note the schema mismatch

### Test Bug #2: Missing Tax Config
```bash
npm run test:missing-tax
```

**Expected behavior**: Order creation fails when shipping to Germany (DE) because tax config is missing.

**What to look for**:
1. See `[ORDERS]` log "tax calculation failed"
2. See list of available countries (US, CA, GB only)
3. Compare with successful US order

### Test Bug #3: Payment Timeout
```bash
npm run test:payment-timeout
```

**Expected behavior**: Order gets cancelled after 3 seconds while payment is still processing (takes 4 seconds).

**What to look for**:
1. Order created successfully
2. After 3 seconds: `[ORDERS]` logs timeout cancellation
3. After 4 seconds: `[CHECKOUT]` logs payment success
4. Payment update fails because order already cancelled

### Run All Tests
```bash
npm run test:all
```

## Manual Testing with curl

### Bug #1: Contract Drift
```bash
# This will fail - Checkout sends new schema to Orders
curl -X POST http://localhost:3002/api/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "items": [{"productId": "prod-1", "quantity": 1, "price": 29.99}],
    "shippingAddress": {
      "country": "US",
      "street": "123 Main St",
      "city": "New York",
      "postalCode": "10001"
    },
    "paymentMethod": "credit_card"
  }'
```

### Bug #2: Missing Tax Config
```bash
# This will fail - Germany not in tax config
curl -X POST http://localhost:3001/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-456",
    "fullName": "Hans Mueller",
    "email": "hans@example.de",
    "items": [{"productId": "prod-2", "quantity": 1, "price": 99.99}],
    "shippingAddress": {
      "country": "DE",
      "street": "Hauptstraße 1",
      "city": "Berlin",
      "postalCode": "10115"
    }
  }'
```

### Bug #3: Payment Timeout
```bash
# Create order, then wait and check status
ORDER_ID=$(curl -s -X POST http://localhost:3001/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-789",
    "fullName": "Jane Smith",
    "email": "jane@example.com",
    "items": [{"productId": "prod-3", "quantity": 1, "price": 149.99}],
    "shippingAddress": {
      "country": "US",
      "street": "456 Oak Ave",
      "city": "San Francisco",
      "postalCode": "94102"
    }
  }' | grep -o '"orderId":"[^"]*' | cut -d'"' -f4)

echo "Order ID: $ORDER_ID"
echo "Waiting 5 seconds for timeout..."
sleep 5

# Check status (should be cancelled)
curl http://localhost:3001/api/orders/$ORDER_ID
```

## Project Structure

### This Repository (corvin-demo)
```
corvin-demo/
├── package.json                      # Orders service + test scripts
├── tsconfig.json                     # TypeScript configuration
├── index.ts                          # Orders service code
├── config/
│   └── tax-config.json               # Tax rates (missing EU - bug #2)
└── test-scenarios/                   # Test scripts
    ├── contract-drift.js             # Test bug #1
    ├── missing-tax.js                # Test bug #2
    └── payment-timeout.js            # Test bug #3
```

### Checkout Service Repository (separate repo)
```
checkout-service/
├── package.json                      # Checkout dependencies
├── tsconfig.json                     # TypeScript configuration
└── index.ts                          # Checkout service code
```

## Key Files for Debugging

### Bug #1 Locations
- `index.ts:58` (this repo) - orderSchema definition (expects fullName)
- `index.ts` (checkout-service repo) - orderPayload creation (sends firstName/lastName)

### Bug #2 Locations
- `config/tax-config.json` (this repo) - Tax configuration (missing EU)
- `index.ts:79` (this repo) - calculateTax function

### Bug #3 Locations
- `index.ts:99` (this repo) - ORDER_TIMEOUT_MS constant (3000ms)
- `index.ts:101` (this repo) - setupOrderTimeout function
- `index.ts` (checkout-service repo) - PAYMENT_DELAY_MS (4000ms)

## Environment Variables

### Orders Service
- `PORT` - Service port (default: 3001)

### Checkout Service
- `PORT` - Service port (default: 3002)
- `ORDERS_SERVICE_URL` - Orders service URL (default: http://localhost:3001)
- `PAYMENT_DELAY_MS` - Payment processing delay (default: 4000ms)

## Tips for Using with Corvin Copilot

1. **Start both services in separate terminals** and watch the logs
2. **Run a test scenario** to trigger a bug
3. **Ask Corvin to debug** the failure by analyzing:
   - Service logs from both independent services
   - Code in both service codebases
   - Configuration files in respective services
4. **Corvin should identify**:
   - The root cause by correlating cross-service information
   - Which service has the issue
   - Specific file and line numbers
   - Suggested fixes

### Example Queries for Corvin
- "Why is the checkout failing with a validation error?"
- "The order creation is failing for Germany - what's wrong?"
- "Payment succeeded but the order was cancelled - why?"
- "Debug this cross-service issue by looking at both codebases"

## The Corvin Challenge

Corvin must demonstrate its ability to:
1. **Work across separate Git repositories** (not a monorepo)
2. **Correlate logs from different services** with different formats
3. **Navigate separate repository structures** to find relevant code
4. **Understand service interactions** and dependencies
5. **Suggest fixes in the correct repository and file**

## Health Checks

```bash
# Check if services are running
curl http://localhost:3001/health
curl http://localhost:3002/health
```

## Stopping Services

Press `Ctrl+C` in each terminal running the services.

## Clean Reset

```bash
# Stop both services (Ctrl+C in each terminal)
# Restart them - orders are stored in memory only

# Terminal 1 - Orders service
cd corvin-demo && npm start

# Terminal 2 - Checkout service
cd checkout-service && npm start
```

## Why Separate Repositories?

This structure showcases Corvin's real-world capabilities:
- **Realistic**: Production environments have separate service repos
- **Challenging**: Requires cross-repository analysis
- **Practical**: Tests Corvin's ability to handle distributed systems
- **Impressive**: Shows AI debugging across repository boundaries
