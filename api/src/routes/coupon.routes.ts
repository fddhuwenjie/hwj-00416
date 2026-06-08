import { Router } from 'express';
import { couponController } from '../controllers/coupon.controller.js';

const router = Router();

router.get('/', couponController.getAllCoupons);
router.get('/:id', couponController.getCouponById);
router.post('/', couponController.createCoupon);
router.post('/distribute', couponController.distributeCoupon);
router.post('/apply', couponController.applyCoupon);
router.post('/validate', couponController.validateCoupon);
router.get('/customer/:customerId', couponController.getCustomerCoupons);

export default router;
