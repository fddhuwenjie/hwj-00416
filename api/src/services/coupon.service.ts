import dayjs from 'dayjs';
import { couponRepository } from '../repositories/coupon.repository.js';
import { customerCouponRepository } from '../repositories/customerCoupon.repository.js';
import { customerRepository } from '../repositories/customer.repository.js';
import type {
  Coupon,
  CustomerCoupon,
  CreateCouponRequest,
  DistributeCouponRequest,
  ApplyCouponRequest,
  CouponDiscountResult,
  CouponStatus,
} from '../../../shared/types.js';

function generateCouponCode(): string {
  const timestamp = Date.now();
  return `CP${timestamp}`;
}

export class CouponService {
  async getAllCoupons(status?: CouponStatus): Promise<Coupon[]> {
    let coupons = couponRepository.findAll();

    if (status) {
      coupons = coupons.filter(c => c.status === status);
    }

    return coupons;
  }

  async getCouponById(id: number): Promise<Coupon | null> {
    return couponRepository.findById(id);
  }

  async createCoupon(request: CreateCouponRequest): Promise<Coupon> {
    if (request.value <= 0) {
      throw new Error('优惠值必须大于0');
    }

    if (request.type === 'percentage' && request.value > 100) {
      throw new Error('百分比折扣不能超过100%');
    }

    if (request.totalQuantity <= 0) {
      throw new Error('发放数量必须大于0');
    }

    if (dayjs(request.validFrom).isAfter(dayjs(request.validTo))) {
      throw new Error('有效期开始时间不能晚于结束时间');
    }

    const code = generateCouponCode();

    return couponRepository.create({
      code,
      name: request.name,
      type: request.type,
      value: request.value,
      minOrderAmount: request.minOrderAmount,
      validFrom: request.validFrom,
      validTo: request.validTo,
      status: 'active',
      totalQuantity: request.totalQuantity,
      description: request.description,
    });
  }

  async distributeCoupon(request: DistributeCouponRequest): Promise<{ distributed: number; message: string }> {
    const coupon = couponRepository.findById(request.couponId);
    if (!coupon) {
      throw new Error('优惠券不存在');
    }

    if (coupon.status !== 'active') {
      throw new Error('优惠券未启用');
    }

    const remaining = coupon.totalQuantity - coupon.usedQuantity;
    if (remaining <= 0) {
      throw new Error('优惠券已发放完毕');
    }

    let customerIds: number[] = [];

    if (request.allCustomers) {
      const allCustomers = customerRepository.findAll();
      customerIds = allCustomers.map(c => c.id);
    } else if (request.customerIds && request.customerIds.length > 0) {
        customerIds = request.customerIds;
      } else {
        throw new Error('请指定发放客户或选择全部客户');
      }

    if (customerIds.length > remaining) {
      throw new Error(`优惠券剩余数量不足，剩余 ${remaining} 张，需要发放 ${customerIds.length} 张`);
    }

    let distributed = 0;
    const errors: string[] = [];

    for (const customerId of customerIds) {
      try {
        const customer = customerRepository.findById(customerId);
        if (!customer) {
          errors.push(`客户ID ${customerId} 不存在`);
          continue;
        }

        if (customer.isBlacklisted) {
          errors.push(`客户 ${customer.name} 已被加入黑名单`);
          continue;
        }

        customerCouponRepository.distribute(customerId, request.couponId);
        distributed++;
      } catch (error) {
        errors.push(`客户ID ${customerId} 发放失败: ${(error as Error).message}`);
      }
    }

    const message = distributed > 0
      ? `成功发放 ${distributed} 张优惠券`
      : '发放失败';

    return { distributed, message: errors.length > 0 ? `${message}，${errors.join('；')}` : message };
  }

  async validateCoupon(customerId: number, couponId: number, orderAmount: number): Promise<{ valid: boolean; message: string; coupon?: Coupon }> {
    const customerCoupon = customerCouponRepository.findByCustomerAndCoupon(customerId, couponId);

    if (!customerCoupon) {
      return { valid: false, message: '您没有该优惠券或优惠券已使用' };
    }

    const coupon = customerCoupon.coupon;
    if (!coupon) {
      return { valid: false, message: '优惠券信息不存在' };
    }

    if (coupon.status !== 'active') {
      return { valid: false, message: '优惠券未启用' };
    }

    const now = dayjs();
    if (now.isBefore(dayjs(coupon.validFrom), 'day')) {
      return { valid: false, message: '优惠券还未生效' };
    }
    if (now.isAfter(dayjs(coupon.validTo), 'day')) {
      return { valid: false, message: '优惠券已过期' };
    }

    if (orderAmount < coupon.minOrderAmount) {
      return { valid: false, message: `订单金额不满足最低消费要求，最低消费 ${coupon.minOrderAmount} 元` };
    }

    if (coupon.usedQuantity >= coupon.totalQuantity) {
      return { valid: false, message: '优惠券已用完' };
    }

    return { valid: true, message: '优惠券可用', coupon };
  }

  async applyCoupon(request: ApplyCouponRequest): Promise<CouponDiscountResult> {
    const validation = await this.validateCoupon(request.customerId, request.couponId, request.orderAmount);

    if (!validation.valid || !validation.coupon) {
      throw new Error(validation.message);
    }

    const coupon = validation.coupon;
    let discountAmount = 0;

    if (coupon.type === 'fixed') {
      discountAmount = coupon.value;
    } else {
      discountAmount = Math.round(request.orderAmount * coupon.value / 100 * 100) / 100;
    }

    if (discountAmount > request.orderAmount) {
      discountAmount = request.orderAmount;
    }

    const finalAmount = Math.round((request.orderAmount - discountAmount) * 100) / 100;

    return {
      discountAmount,
      finalAmount,
      coupon,
    };
  }

  async getCustomerCoupons(customerId: number, availableOnly: boolean = false): Promise<(CustomerCoupon & { coupon?: Coupon })[]> {
    if (availableOnly) {
      return customerCouponRepository.findAvailable(customerId);
    }
    return customerCouponRepository.findByCustomerId(customerId);
  }
}

export const couponService = new CouponService();
