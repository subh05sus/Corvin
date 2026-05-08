const axios = require('axios');

async function testContractDrift() {
  console.log('\n=== Testing Checkout Flow ===\n');

  const checkoutPayload = {
    userId: 'user-123',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    items: [
      { productId: 'prod-1', quantity: 2, price: 29.99 }
    ],
    shippingAddress: {
      country: 'US',
      street: '123 Main St',
      city: 'New York',
      postalCode: '10001'
    },
    paymentMethod: 'credit_card'
  };

  try {
    console.log('Sending checkout request...\n');
    const response = await axios.post('http://localhost:3002/api/checkout', checkoutPayload);
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

testContractDrift();
