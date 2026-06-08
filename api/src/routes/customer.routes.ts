import { Router } from 'express';
import { customerController } from '../controllers/customer.controller.js';

const router = Router();

router.get('/phone/:phone', customerController.getCustomerByPhone);
router.get('/:id/orders', customerController.getCustomerOrders);
router.get('/:id', customerController.getCustomerById);
router.get('/', customerController.getAllCustomers);
router.post('/', customerController.createCustomer);
router.put('/:id', customerController.updateCustomer);
router.put('/:id/toggle-blacklist', customerController.toggleBlacklist);

export default router;
