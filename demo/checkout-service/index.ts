import express, { Request, Response } from 'express';
import winston from 'winston';
import axios from 'axios';

interface Item {
  productId: string;
  quantity: number;
  price: number;
}

interface ShippingAddress {
  country: string;
  street: string;
  city: string;
  postalCode: string;
}

interface PaymentResult {
  paymentId: string;
  status: string;
  amount: number;
  processedAt: string;
}

const app = express();
app.use(express.json());

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return `[CHECKOUT] ${timestamp} ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
        })
      )
    })
  ]
});

const ORDERS_SERVICE_URL = process.env.ORDERS_SERVICE_URL || 'http://localhost:3001';
const PAYMENT_DELAY_MS = parseInt(process.env.PAYMENT_DELAY_MS || '4000');
const SUPPORTED_COUNTRIES = ['US', 'CA', 'GB', 'DE'];

async function processPayment(amount: number, paymentMethod: string): Promise<PaymentResult> {
  const paymentId = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  logger.info('Processing payment', { paymentId, amount, paymentMethod });

  await new Promise(resolve => setTimeout(resolve, PAYMENT_DELAY_MS));

  logger.info('Payment processed successfully', { paymentId, amount });

  return {
    paymentId,
    status: 'success',
    amount,
    processedAt: new Date().toISOString()
  };
}

app.post('/api/checkout', async (req: Request, res: Response) => {
  const { userId, firstName, lastName, email, items, shippingAddress, paymentMethod } = req.body;

  logger.info('Checkout request received', {
    userId,
    firstName,
    lastName,
    email,
    itemCount: items?.length,
    country: shippingAddress?.country
  });

  if (shippingAddress && !SUPPORTED_COUNTRIES.includes(shippingAddress.country)) {
    logger.error('Unsupported shipping country', {
      country: shippingAddress.country,
      supportedCountries: SUPPORTED_COUNTRIES
    });

    return res.status(400).json({
      error: 'Shipping country not supported',
      country: shippingAddress.country,
      supportedCountries: SUPPORTED_COUNTRIES
    });
  }

  try {
    const orderPayload = {
      userId,
      firstName,
      lastName,
      email,
      items,
      shippingAddress
    };

    logger.info('Sending order to Orders service', {
      url: `${ORDERS_SERVICE_URL}/api/orders`,
      payload: orderPayload
    });

    const orderResponse = await axios.post(`${ORDERS_SERVICE_URL}/api/orders`, orderPayload);
    const { orderId, total } = orderResponse.data;

    logger.info('Order created', { orderId, total });

    const payment = await processPayment(total, paymentMethod);

    logger.info('Payment succeeded, notifying Orders service', {
      orderId,
      paymentId: payment.paymentId,
      status: payment.status
    });

    try {
      await axios.post(`${ORDERS_SERVICE_URL}/api/orders/${orderId}/payment`, {
        paymentId: payment.paymentId,
        status: payment.status
      });

      logger.info('Checkout completed successfully', { orderId, paymentId: payment.paymentId });

      res.json({
        success: true,
        orderId,
        paymentId: payment.paymentId,
        total
      });

    } catch (paymentUpdateError) {
      const err = paymentUpdateError as any;
      logger.error('Failed to update order with payment status', {
        orderId,
        paymentId: payment.paymentId,
        error: err.response?.data || err.message
      });

      res.status(500).json({
        error: 'Payment succeeded but order update failed',
        orderId,
        paymentId: payment.paymentId,
        details: err.response?.data
      });
    }

  } catch (error) {
    const err = error as any;
    if (err.response) {
      logger.error('Checkout failed - Orders service error', {
        status: err.response.status,
        error: err.response.data,
        url: err.config?.url
      });

      res.status(err.response.status).json({
        error: 'Checkout failed',
        details: err.response.data
      });
    } else {
      logger.error('Checkout failed - unexpected error', { error: err.message });
      res.status(500).json({ error: err.message });
    }
  }
});

app.post('/api/checkout/legacy', async (req: Request, res: Response) => {
  const { userId, fullName, email, items, shippingAddress, paymentMethod } = req.body;

  logger.info('Legacy checkout request received', {
    userId,
    fullName,
    email,
    itemCount: items?.length,
    country: shippingAddress?.country
  });

  if (shippingAddress && !SUPPORTED_COUNTRIES.includes(shippingAddress.country)) {
    logger.error('Unsupported shipping country', {
      country: shippingAddress.country,
      supportedCountries: SUPPORTED_COUNTRIES
    });

    return res.status(400).json({
      error: 'Shipping country not supported',
      country: shippingAddress.country,
      supportedCountries: SUPPORTED_COUNTRIES
    });
  }

  try {
    const orderPayload = {
      userId,
      fullName,
      email,
      items,
      shippingAddress
    };

    logger.info('Sending order to Orders service', {
      url: `${ORDERS_SERVICE_URL}/api/orders`,
      payload: orderPayload
    });

    const orderResponse = await axios.post(`${ORDERS_SERVICE_URL}/api/orders`, orderPayload);
    const { orderId, total } = orderResponse.data;

    logger.info('Order created', { orderId, total });

    const payment = await processPayment(total, paymentMethod);

    logger.info('Payment succeeded, notifying Orders service', {
      orderId,
      paymentId: payment.paymentId,
      status: payment.status
    });

    try {
      await axios.post(`${ORDERS_SERVICE_URL}/api/orders/${orderId}/payment`, {
        paymentId: payment.paymentId,
        status: payment.status
      });

      logger.info('Checkout completed successfully', { orderId, paymentId: payment.paymentId });

      res.json({
        success: true,
        orderId,
        paymentId: payment.paymentId,
        total
      });

    } catch (paymentUpdateError) {
      const err = paymentUpdateError as any;
      logger.error('Failed to update order with payment status', {
        orderId,
        paymentId: payment.paymentId,
        error: err.response?.data || err.message
      });

      res.status(500).json({
        error: 'Payment succeeded but order update failed',
        orderId,
        paymentId: payment.paymentId,
        details: err.response?.data
      });
    }

  } catch (error) {
    const err = error as any;
    if (err.response) {
      logger.error('Checkout failed - Orders service error', {
        status: err.response.status,
        error: err.response.data,
        url: err.config?.url
      });

      res.status(err.response.status).json({
        error: 'Checkout failed',
        details: err.response.data
      });
    } else {
      logger.error('Checkout failed - unexpected error', { error: err.message });
      res.status(500).json({ error: err.message });
    }
  }
});

app.get('/health', (req: Request, res: Response) => {
  res.json({ service: 'checkout', status: 'healthy' });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  logger.info(`Checkout service running on port ${PORT}`);
});
