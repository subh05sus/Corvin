const axios = require('axios');

async function testMissingTax() {
  console.log('\n=== Testing International Shipping ===\n');

  const checkoutPayload = {
    userId: 'user-456',
    fullName: 'Hans Mueller',
    email: 'hans@example.de',
    items: [
      { productId: 'prod-2', quantity: 1, price: 99.99 }
    ],
    shippingAddress: {
      country: 'DE',
      street: 'Hauptstraße 1',
      city: 'Berlin',
      postalCode: '10115'
    },
    paymentMethod: 'credit_card'
  };

  try {
    console.log('Creating checkout for a customer in Germany...\n');
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

testMissingTax();
