const axios = require('axios');

async function testPaymentTimeout() {
  console.log('\n=== Testing Payment Flow ===\n');

  const checkoutPayload = {
    userId: 'user-789',
    fullName: 'Jane Smith',
    email: 'jane@example.com',
    items: [
      { productId: 'prod-3', quantity: 1, price: 149.99 }
    ],
    shippingAddress: {
      country: 'US',
      street: '456 Oak Ave',
      city: 'San Francisco',
      postalCode: '94102'
    },
    paymentMethod: 'credit_card'
  };

  try {
    console.log('Starting checkout...\n');
    const response = await axios.post('http://localhost:3002/api/checkout/legacy', checkoutPayload);
    console.log('Success:', response.data);
  } catch (error) {
    if (error.response) {
      console.log('Checkout failed');
      console.log('Status:', error.response.status);
      console.log('Error:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('Connection error:', error.message);
    }
  }
}

testPaymentTimeout();
