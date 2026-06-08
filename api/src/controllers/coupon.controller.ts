import { Request, Response } from 'express';
import { couponService } from '../services/coupon.service.js';
import type { ApiResponse, CouponStatus } from '../../../shared/types.js';

export class CouponController {
  async getAllCoupons(req: Request, res: Response) {
    try {
      const { status } = req.query;
      const coupons = await couponService.getAllCoupons(
        status as CouponStatus | undefined
      );
      res.json({ success: true, data: coupons } as ApiResponse);
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message } as ApiResponse);
    }
  }

  async getCouponById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const coupon = await couponService.getCouponById(Number(id));
      if (!coupon) {
        return res.status(404).json({ success: false, error: '优惠券不存在' } as ApiResponse);
      }
      res.json({ success: true, data: coupon } as ApiResponse);
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message } as ApiResponse);
    }
  }

  async createCoupon(req: Request, res: Response) {
    try {
      const coupon = await couponService.createCoupon(req.body);
      res.status(201).json({ success: true, data: coupon, message: '优惠券创建成功' } as ApiResponse);
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message } as ApiResponse);
    }
  }

  async distributeCoupon(req: Request, res: Response) {
    try {
      const result = await couponService.distributeCoupon(req.body);
      res.json({ success: true, data: result, message: result.message } as ApiResponse);
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message } as ApiResponse);
    }
  }

  async applyCoupon(req: Request, res: Response) {
    try {
      const result = await couponService.applyCoupon(req.body);
      res.json({ success: true, data: result, message: '优惠券应用成功' } as ApiResponse);
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message } as ApiResponse);
    }
  }

  async validateCoupon(req: Request, res: Response) {
    try {
      const { customerId, couponId, orderAmount } = req.body;
      const result = await couponService.validateCoupon(
        Number(customerId),
        Number(couponId),
        Number(orderAmount)
      );
      res.json({ success: true, data: result } as ApiResponse);
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message } as ApiResponse);
    }
  }

  async getCustomerCoupons(req: Request, res: Response) {
    try {
      const { customerId } = req.params;
      const { availableOnly } = req.query;
      const coupons = await couponService.getCustomerCoupons(
        Number(customerId),
        availableOnly === 'true'
      );
      res.json({ success: true, data: coupons } as ApiResponse);
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message } as ApiResponse);
    }
  }
}

export const couponController = new CouponController();
