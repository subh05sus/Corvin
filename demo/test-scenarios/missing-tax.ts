/**
 * Bug #2: Missing EU Tax Configuration
 *
 * Orders service has no tax config for Germany (DE)
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
  console.log('  Bug #2: Missing EU Tax Configuration');
  console.log('='.repeat(50));
  console.log('\n');

  await waitForServices();

  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Sending German order...`);
  console.log('\n');

  // Use legacy endpoint to avoid contract drift bug
  const request = {
    userId: 'user-456',
    fullName: 'Hans Mueller',
    email: 'hans@example.de',
    items: [
      { productId: 'GADGET-001', quantity: 1, price: 99.99 }
    ],
    shippingAddress: {
      country: 'DE',           // Germany - not in tax config!
      street: 'Hauptstrasse 42',
      city: 'Berlin',
      postalCode: '10115'
    },
    paymentMethod: 'credit_card'
  };

  console.log('Request payload:');
  console.log(JSON.stringify(request, null, 2));
  console.log('\n');

  try {
    const response = await axios.post(`${CHECKOUT_URL}/api/checkout/legacy`, request);
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
    console.log('  "Tax calculation failing for German orders"');
    console.log('\n');
    console.log('Root cause:');
    console.log('  - tax-config.json has: US, CA, GB');
    console.log('  - Missing: DE (Germany)');
    console.log('\n');
  }
}

triggerBug().catch(console.error);
