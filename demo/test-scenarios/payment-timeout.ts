/**
 * Bug #3: Payment Timeout Race Condition
 *
 * Orders cancels after 3s, Payment takes 4s
 */

import axios from 'axios';

const CHECKOUT_URL = process.env.CHECKOUT_URL || 'http://localhost:3002';
const ORDERS_URL = process.env.ORDERS_URL || 'http://localhost:3001';
const MAX_RETRIES = 10;
const RETRY_DELAY = 1000;

async function waitForServices(): Promise<void> {
  console.log('Waiting for services to be ready...');

  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      await Promise.all([
        axios.get(`${ORDERS_URL}/health`, { timeout: 2000 }),
        axios.get(`${CHECKOUT_URL}/health`, { timeout: 2000 })
      ]);
      console.log('Services are ready!\n');
      return;
    } catch {
      process.stdout.write('.');
      await new Promise(r => setTimeout(r, RETRY_DELAY));
    }
  }

  throw new Error('Services not available. Make sure both services are running with: debug npm run dev');
}

async function triggerBug(): Promise<void> {
  console.log('\n');
  console.log('='.repeat(50));
  console.log('  Bug #3: Payment Timeout Race Condition');
  console.log('='.repeat(50));
  console.log('\n');

  await waitForServices();

  console.log('Timeline:');
  console.log('  T+0s  Order created (pending_payment)');
  console.log('  T+0s  Payment processing starts...');
  console.log('  T+3s  Order timeout - order cancelled');
  console.log('  T+4s  Payment completes - tries to update cancelled order');
  console.log('\n');

  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Sending checkout request...`);
  console.log('(This will take ~4 seconds)\n');

  // Use legacy endpoint to avoid contract drift bug
  const request = {
    userId: 'user-789',
    fullName: 'Alice Smith',
    email: 'alice@example.com',
    items: [
      { productId: 'PREMIUM-001', quantity: 1, price: 299.99 }
    ],
    shippingAddress: {
      country: 'US',
      street: '456 Oak Ave',
      city: 'New York',
      postalCode: '10001'
    },
    paymentMethod: 'credit_card'
  };

  console.log('Request payload:');
  console.log(JSON.stringify(request, null, 2));
  console.log('\n');

  const startTime = Date.now();

  try {
    const response = await axios.post(`${CHECKOUT_URL}/api/checkout/legacy`, request);

    // Even "success" responses may contain error info
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const endTimestamp = new Date().toISOString();
    console.log(`[${endTimestamp}] Response received after ${elapsed}s\n`);

    if (response.data.error) {
      console.log('Error in response:');
      console.log(JSON.stringify(response.data, null, 2));
    } else {
      console.log('Response:', JSON.stringify(response.data, null, 2));
    }
  } catch (error: any) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const endTimestamp = new Date().toISOString();
    console.log(`[${endTimestamp}] Error after ${elapsed}s\n`);

    if (error.response) {
      console.log('Error Response:');
      console.log(JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('Error:', error.message);
    }
  }

  console.log('\n');
  console.log('='.repeat(50));
  console.log('  Bug triggered! Check service logs');
  console.log('='.repeat(50));
  console.log('\n');
  console.log('Ask Corvin:');
  console.log('  "Order was cancelled but payment succeeded"');
  console.log('\n');
  console.log('Root cause:');
  console.log('  - ORDER_TIMEOUT_MS = 3000 (orders-service)');
  console.log('  - PAYMENT_DELAY_MS = 4000 (checkout-service)');
  console.log('  - Payment finishes after order already cancelled');
  console.log('\n');
}

triggerBug().catch(console.error);
