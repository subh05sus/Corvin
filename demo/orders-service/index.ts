import express, { Request, Response } from 'express';
import winston from 'winston';
import Joi from 'joi';
import taxConfig from './config/tax-config.json';

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

interface Order {
  orderId: string;
  userId: string;
  fullName: string;
  email: string;
  items: Item[];
  shippingAddress: ShippingAddress;
  subtotal: number;
  taxAmount: number;
  total: number;
  status: string;
  createdAt: string;
  updatedAt?: string;
  paymentId?: string;
  cancellationReason?: string;
  cancelledAt?: string;
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
          return `[ORDERS] ${timestamp} ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
        })
      )
    })
  ]
});

const orderSchema = Joi.object({
  userId: Joi.string().required(),
  fullName: Joi.string().required(),
  email: Joi.string().email().required(),
  items: Joi.array().items(Joi.object({
    productId: Joi.string().required(),
    quantity: Joi.number().required(),
    price: Joi.number().required()
  })).required(),
  shippingAddress: Joi.object({
    country: Joi.string().required(),
    street: Joi.string().required(),
    city: Joi.string().required(),
    postalCode: Joi.string().required()
  }).required(),
  paymentId: Joi.string().optional()
});

const orders = new Map<string, Order>();
const orderTimeouts = new Map<string, NodeJS.Timeout>();

function calculateTax(items: Item[], country: string): { subtotal: number; taxAmount: number; total: number } {
  logger.info('Calculating tax', { country, itemCount: items.length });

  const taxRate = (taxConfig.countries as Record<string, number>)[country];

  if (taxRate === undefined) {
    logger.error('Tax calculation failed - no config for country', {
      country,
      availableCountries: Object.keys(taxConfig.countries)
    });
    throw new Error(`Tax calculation failed: no configuration for country ${country}`);
  }

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const taxAmount = subtotal * taxRate;

  logger.info('Tax calculated successfully', { country, taxRate, taxAmount });
  return { subtotal, taxAmount, total: subtotal + taxAmount };
}

const ORDER_TIMEOUT_MS = 3000;

function setupOrderTimeout(orderId: string): void {
  logger.info('Setting up order timeout', { orderId });

  const timeoutId = setTimeout(() => {
    const order = orders.get(orderId);

    if (order && order.status === 'pending_payment') {
      logger.warn('Order timeout reached - cancelling order', {
        orderId,
        currentStatus: order.status
      });

      order.status = 'cancelled';
      order.cancellationReason = 'payment_timeout';
      order.cancelledAt = new Date().toISOString();

      orders.set(orderId, order);

      logger.info('Order cancelled due to timeout', { orderId });
    }
  }, ORDER_TIMEOUT_MS);

  orderTimeouts.set(orderId, timeoutId);
}

app.post('/api/orders', (req: Request, res: Response) => {
  logger.info('Received order creation request', { body: req.body });

  const { error, value } = orderSchema.validate(req.body);

  if (error) {
    logger.error('Order validation failed', {
      error: error.details[0].message,
      receivedFields: Object.keys(req.body)
    });
    return res.status(400).json({
      error: 'Validation failed',
      details: error.details[0].message
    });
  }

  try {
    const pricing = calculateTax(value.items, value.shippingAddress.country);

    const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const order = {
      orderId,
      ...value,
      ...pricing,
      status: 'pending_payment',
      createdAt: new Date().toISOString()
    };

    orders.set(orderId, order);
    setupOrderTimeout(orderId);

    logger.info('Order created successfully', { orderId, status: order.status });

    res.status(201).json({
      orderId,
      status: order.status,
      total: pricing.total
    });

  } catch (err) {
    const error = err as Error;
    logger.error('Order creation failed', { error: error.message });
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/orders/:orderId/payment', (req: Request, res: Response) => {
  const { orderId } = req.params;
  const { paymentId, status } = req.body;

  logger.info('Received payment update', { orderId, paymentId, status });

  const order = orders.get(orderId);

  if (!order) {
    logger.error('Order not found', { orderId });
    return res.status(404).json({ error: 'Order not found' });
  }

  if (order.status === 'cancelled') {
    logger.error('Cannot update payment - order already cancelled', {
      orderId,
      cancellationReason: order.cancellationReason,
      cancelledAt: order.cancelledAt
    });
    return res.status(409).json({
      error: 'Order already cancelled',
      reason: order.cancellationReason
    });
  }

  const timeoutId = orderTimeouts.get(orderId);
  if (timeoutId) {
    clearTimeout(timeoutId);
    orderTimeouts.delete(orderId);
    logger.info('Cleared order timeout', { orderId });
  }

  order.paymentId = paymentId;
  order.status = status === 'success' ? 'confirmed' : 'payment_failed';
  order.updatedAt = new Date().toISOString();

  orders.set(orderId, order);

  logger.info('Payment status updated', { orderId, newStatus: order.status });

  res.json({ orderId, status: order.status });
});

app.get('/api/orders/:orderId', (req: Request, res: Response) => {
  const { orderId } = req.params;
  const order = orders.get(orderId);

  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  logger.info('Order status retrieved', { orderId, status: order.status });
  res.json(order);
});

app.get('/health', (req: Request, res: Response) => {
  res.json({ service: 'orders', status: 'healthy' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  logger.info(`Orders service running on port ${PORT}`);
});
