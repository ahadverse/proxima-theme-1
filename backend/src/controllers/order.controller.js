import { asyncHandler } from '../middlewares/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import * as orderService from '../services/order.service.js';
import { getSettingsDoc } from '../services/settings.service.js';
import { getProvider } from '../services/payments/index.js';
import { readSessionId } from '../utils/sessionCookie.js';
import { env } from '../config/env.js';
import { completeDemoPayment } from '../services/demo.service.js';

export const create = asyncHandler(async (req, res) => {
  const order = await orderService.createOrder(req.body, {
    userId: req.user?._id?.toString(),
    // Ties the order to the browser's earlier product views / add-to-carts for the analytics funnel.
    sessionId: readSessionId(req),
    // The browser's address and user agent — Meta requires both on server-side website events.
    client: { ip: req.ip, userAgent: req.get('user-agent') },
  });
  sendSuccess(res, {
    statusCode: 201,
    message: 'Order placed successfully',
    data: { orderNumber: order.orderNumber, id: order._id },
  });
});

export const myOrders = asyncHandler(async (req, res) => {
  const orders = await orderService.getMyOrders(req.user._id);
  sendSuccess(res, { data: orders.map(orderService.presentOrder) });
});

export const myOrderDetail = asyncHandler(async (req, res) => {
  const order = await orderService.getOrderForCustomer(req.params.id, req.user._id);
  sendSuccess(res, { data: orderService.presentOrder(order) });
});

export const track = asyncHandler(async (req, res) => {
  const { orderNumber, phone } = req.query;
  if (!orderNumber || !phone) throw ApiError.badRequest('orderNumber and phone are required');

  const order = await orderService.trackOrder(orderNumber, phone);
  sendSuccess(res, { data: orderService.presentOrder(order) });
});

export const adminList = asyncHandler(async (req, res) => {
  const { items, meta } = await orderService.listOrdersAdmin(req.query);
  sendSuccess(res, { data: items, meta });
});

export const adminGetOne = asyncHandler(async (req, res) => {
  const order = await orderService.getOrderByIdAdmin(req.params.id);
  sendSuccess(res, { data: order });
});

export const adminUpdateStatus = asyncHandler(async (req, res) => {
  const order = await orderService.updateOrderStatus(req.params.id, req.body.status, req.body.note);
  sendSuccess(res, { message: 'Order status updated', data: order });
});

export const adminUpdatePayment = asyncHandler(async (req, res) => {
  const order = await orderService.updateOrderPayment(req.params.id, req.body);
  sendSuccess(res, { message: 'Payment status updated', data: order });
});

export const initPayment = asyncHandler(async (req, res) => {
  const order = await orderService.getOrderById(req.params.id);
  if (!order) throw ApiError.notFound('Order not found');
  if (order.paymentMethod !== req.params.provider) {
    throw ApiError.badRequest('This order was not placed with that payment method');
  }
  if (order.paymentStatus === 'paid') throw ApiError.badRequest('This order is already paid');
  if (['cancelled', 'returned'].includes(order.orderStatus)) {
    throw ApiError.badRequest('This order has been cancelled');
  }

  const provider = getProvider(req.params.provider);
  const settings = await getSettingsDoc();
  if (!provider?.initPayment || !provider.isConfigured(settings.paymentGateways)) {
    throw ApiError.badRequest('This payment method is not available');
  }

  // Demo store: no gateway is contacted — the order is simply marked paid and the shopper lands on the confirmation page.
  if (env.isDemo) {
    return sendSuccess(res, { data: { redirectUrl: await completeDemoPayment(order) } });
  }

  const { redirectUrl, reference } = await provider.initPayment({ order, settings, clientIp: req.ip });
  await orderService.setPendingPaymentReference(order, reference);

  sendSuccess(res, { data: { redirectUrl } });
});
