/**
 * Bug #1: Contract Drift
 *
 * Checkout service sends firstName/lastName but Orders expects fullName
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
  console.log('  Bug #1: Contract Drift');
  console.log('='.repeat(50));
  console.log('\n');

  await waitForServices();

  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Sending checkout request...`);
  console.log('\n');

  const request = {
    userId: 'user-123',
    firstName: 'John',      // Checkout sends firstName
    lastName: 'Doe',        // Checkout sends lastName
    email: 'john@example.com',
    items: [
      { productId: 'WIDGET-001', quantity: 2, price: 29.99 }
    ],
    shippingAddress: {
      country: 'US',
      street: '123 Main St',
      city: 'San Francisco',
      postalCode: '94102'
    },
    paymentMethod: 'credit_card'
  };

  console.log('Request payload:');
  console.log(JSON.stringify(request, null, 2));
  console.log('\n');

  try {
    const response = await axios.post(`${CHECKOUT_URL}/api/checkout`, request);
    console.log('Unexpected success:', response.data);
  } catch (error: any) {
    const endTimestamp = new Date().toISOString();
    console.log(`[${endTimestamp}] Error received!\n`);

    if (error.response) {
      console.log('Error Response:');
      console.log(JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('Error:', error.message);
    }

    console.log('\n');
    console.log('='.repeat(50));
    console.log('  Bug triggered! Check service logs');
    console.log('='.repeat(50));
    console.log('\n');
    console.log('Ask Corvin:');
    console.log('  "Checkout is failing with fullName validation error"');
    console.log('\n');
    console.log('Root cause:');
    console.log('  - Checkout sends: { firstName, lastName }');
    console.log('  - Orders expects: { fullName }');
    console.log('\n');
  }
}

triggerBug().catch(console.error);
