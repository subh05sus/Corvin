# Checkout Service

Independent microservice for checkout flow and payment processing.

## Overview

This service handles:
- Checkout request processing
- Communication with Orders service
- Payment processing (simulated)
- Payment status notifications

## Installation

```bash
npm install
```

## Running the Service

```bash
npm start
```

The service will start on port `3002` by default.

## Environment Variables

- `PORT` - Service port (default: 3002)
- `ORDERS_SERVICE_URL` - URL of Orders service (default: http://localhost:3001)
- `PAYMENT_DELAY_MS` - Simulated payment processing delay in milliseconds (default: 4000)

## API Endpoints

### Checkout
```
POST /api/checkout
```

Request body:
```json
{
  "userId": "string",
  "firstName": "string",
  "lastName": "string",
  "email": "string",
  "items": [
    {
      "productId": "string",
      "quantity": number,
      "price": number
    }
  ],
  "shippingAddress": {
    "country": "string",
    "street": "string",
    "city": "string",
    "postalCode": "string"
  },
  "paymentMethod": "string"
}
```

### Health Check
```
GET /health
```

## Dependencies

This service depends on the Orders service being available at the configured URL.
