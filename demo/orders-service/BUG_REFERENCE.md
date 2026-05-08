# Bug Reference Card

Quick reference for where each bug is located in the **independent service codebases**.

## Bug #1: Contract Drift

### The Mismatch
| Service | Location | What it does |
|---------|----------|--------------|
| Orders | `orders-service/index.js:27` | Expects `fullName` in schema |
| Checkout | `checkout-service/index.js:57` | Sends `firstName` + `lastName` |

### Key Code Snippets

**Orders expects:**
```javascript
// orders-service/index.js:27
const orderSchema = Joi.object({
  fullName: Joi.string().required(),  // Old schema
  // ...
});
```

**Checkout sends:**
```javascript
// checkout-service/index.js:57
const orderPayload = {
  firstName,  // New schema
  lastName,   // New schema
  // ...
};
```

### Log Signals
```
[CHECKOUT] Sending order to Orders service { payload: { firstName: "John", lastName: "Doe" } }
[ORDERS] Order validation failed { error: "fullName is required" }
```

---

## Bug #2: Missing EU Tax Config

### The Missing Data
| File | Line | Issue |
|------|------|-------|
| `orders-service/config/tax-config.json` | N/A | Only has US, CA, GB |
| `orders-service/index.js` | 47 | `calculateTax()` throws on missing country |

### Key Code Snippets

**Tax Config (Missing EU):**
```json
// orders-service/config/tax-config.json
{
  "countries": {
    "US": 0.08,
    "CA": 0.13,
    "GB": 0.20
    // DE, FR, IT, ES missing!
  }
}
```

**Code that fails:**
```javascript
// orders-service/index.js:47
function calculateTax(items, country) {
  const taxRate = taxConfig.countries[country];

  if (taxRate === undefined) {
    throw new Error(`Tax calculation failed: no configuration for country ${country}`);
  }
  // ...
}
```

### Log Signals
```
[ORDERS] Calculating tax { country: "DE" }
[ORDERS] Tax calculation failed - no config for country { country: "DE", availableCountries: ["US", "CA", "GB"] }
```

---

## Bug #3: Payment Timeout Race

### The Timing Issue
| Service | Location | Value | Effect |
|---------|----------|-------|--------|
| Orders | `orders-service/index.js:68` | `ORDER_TIMEOUT_MS = 3000` | Cancels after 3s |
| Checkout | `checkout-service/index.js:27` | `PAYMENT_DELAY_MS = 4000` | Payment takes 4s |

### Key Code Snippets

**Orders timeout (3 seconds):**
```javascript
// orders-service/index.js:68
const ORDER_TIMEOUT_MS = 3000; // Hardcoded 3 second timeout

// orders-service/index.js:71
function setupOrderTimeout(orderId) {
  const timeoutId = setTimeout(() => {
    const order = orders.get(orderId);
    if (order && order.status === 'pending_payment') {
      order.status = 'cancelled';
      order.cancellationReason = 'payment_timeout';
      // No check if payment is processing!
    }
  }, ORDER_TIMEOUT_MS);
}
```

**Checkout payment (4 seconds):**
```javascript
// checkout-service/index.js:27
const PAYMENT_DELAY_MS = parseInt(process.env.PAYMENT_DELAY_MS || '4000');

// checkout-service/index.js:37
async function processPayment(amount, paymentMethod) {
  await new Promise(resolve => setTimeout(resolve, PAYMENT_DELAY_MS));
  return { paymentId, status: 'success' };
}
```

### Log Signals (Timeline)
```
T+0s  [ORDERS] Order created { orderId: "ORD-123", status: "pending_payment" }
T+0s  [ORDERS] Setting up order timeout { orderId: "ORD-123", timeoutMs: 3000 }
T+0s  [CHECKOUT] Processing payment { delayMs: 4000 }
T+3s  [ORDERS] Order timeout reached - cancelling order { orderId: "ORD-123" }
T+3s  [ORDERS] Order cancelled due to timeout { orderId: "ORD-123" }
T+4s  [CHECKOUT] Payment processed successfully { paymentId: "PAY-456", status: "success" }
T+4s  [CHECKOUT] Failed to update order with payment status { error: "Order already cancelled" }
```

---

## Fix Cheat Sheet

### Bug #1 Fixes

**Option A: Update Orders to accept new schema**
```javascript
// orders-service/index.js:27
const orderSchema = Joi.object({
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  // Remove fullName
});
```

**Option B: Backward compatibility**
```javascript
// orders-service/index.js:27
const orderSchema = Joi.object({
  fullName: Joi.string(),
  firstName: Joi.string(),
  lastName: Joi.string()
}).or('fullName', 'firstName'); // At least one required
```

**Option C: Fix Checkout**
```javascript
// checkout-service/index.js:57
const orderPayload = {
  fullName: `${firstName} ${lastName}`,
  // Remove firstName, lastName
};
```

### Bug #2 Fixes

**Option A: Add EU countries to config**
```json
// orders-service/config/tax-config.json
{
  "countries": {
    "US": 0.08,
    "CA": 0.13,
    "GB": 0.20,
    "DE": 0.19,
    "FR": 0.20,
    "IT": 0.22,
    "ES": 0.21
  }
}
```

**Option B: Add default fallback**
```javascript
// orders-service/index.js:47
function calculateTax(items, country) {
  const taxRate = taxConfig.countries[country] || taxConfig.defaultRate || 0.20;
  // ...
}
```

**Option C: Validate earlier in Checkout**
```javascript
// checkout-service/index.js - add validation before calling Orders
const supportedCountries = ['US', 'CA', 'GB'];
if (!supportedCountries.includes(shippingAddress.country)) {
  throw new Error(`Shipping to ${shippingAddress.country} not supported`);
}
```

### Bug #3 Fixes

**Option A: Increase timeout**
```javascript
// orders-service/index.js:68
const ORDER_TIMEOUT_MS = 30000; // 30 seconds
```

**Option B: Check payment before cancelling**
```javascript
// orders-service/index.js:71
function setupOrderTimeout(orderId) {
  const timeoutId = setTimeout(async () => {
    const order = orders.get(orderId);
    if (order && order.status === 'pending_payment') {
      // Check if payment is being processed
      if (!order.paymentProcessing) {
        order.status = 'cancelled';
        order.cancellationReason = 'payment_timeout';
      }
    }
  }, ORDER_TIMEOUT_MS);
}
```

**Option C: Make timeout configurable**
```javascript
// orders-service/index.js:68
const ORDER_TIMEOUT_MS = parseInt(process.env.ORDER_TIMEOUT_MS || '30000');
```

**Option D: Add reversibility**
```javascript
// orders-service/index.js - in payment update endpoint
if (order.status === 'cancelled' && order.cancellationReason === 'payment_timeout') {
  // Allow reverting cancellation if payment succeeded
  order.status = 'confirmed';
  delete order.cancellationReason;
  logger.warn('Reverted timeout cancellation after successful payment', { orderId });
}
```

---

## Testing Each Fix

### Verify Bug #1 Fix
```bash
# From root directory
npm run test:contract-drift
# Should succeed after fix
```

### Verify Bug #2 Fix
```bash
# From root directory
npm run test:missing-tax
# Should succeed for DE orders after fix
```

### Verify Bug #3 Fix
```bash
# From root directory
npm run test:payment-timeout
# Order should be confirmed, not cancelled
```

---

## Debugging Commands

```bash
# Check what Orders expects
grep -A 10 "orderSchema" orders-service/index.js

# Check what Checkout sends
grep -A 10 "orderPayload" checkout-service/index.js

# Check tax config
cat orders-service/config/tax-config.json

# Check timeout values
grep "TIMEOUT_MS\|DELAY_MS" orders-service/index.js checkout-service/index.js

# Show independent package files
ls -la orders-service/package.json checkout-service/package.json

# Show they're different projects
diff orders-service/package.json checkout-service/package.json
```

---

## Quick Navigation

### Orders Service Files
```
orders-service/
├── index.js              # Main service code (bugs #1, #2, #3)
├── config/
│   └── tax-config.json   # Tax rates (bug #2)
├── package.json          # Independent dependencies
└── README.md             # Service-specific docs
```

### Checkout Service Files
```
checkout-service/
├── index.js              # Main service code (triggers bugs)
├── package.json          # Independent dependencies
└── README.md             # Service-specific docs
```

### Test Scripts (run from root)
```
test-scenarios/
├── contract-drift.js     # Tests bug #1
├── missing-tax.js        # Tests bug #2
└── payment-timeout.js    # Tests bug #3
```

---

## Cross-Service Bug Matrix

| Bug | Orders Service Issue | Checkout Service Behavior | Fix Location |
|-----|---------------------|---------------------------|--------------|
| #1 Contract Drift | Expects `fullName` | Sends `firstName`/`lastName` | Either service |
| #2 Missing Tax | Missing EU in config | Works fine | Orders service |
| #3 Timeout Race | 3s timeout too short | 4s payment delay | Orders service |

This shows how bugs span independent codebases and require Corvin to understand both services.
