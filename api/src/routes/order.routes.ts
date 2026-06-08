import { Router } from 'express';
import { orderController } from '../controllers/order.controller.js';

const router = Router();

router.get('/bookings', orderController.getBookings);
router.get('/:id', orderController.getOrderById);
router.get('/', orderController.getAllOrders);
router.post('/', orderController.createOrder);
router.put('/:id/status', orderController.updateOrderStatus);
router.post('/:id/return', orderController.processReturn);

export default router;
