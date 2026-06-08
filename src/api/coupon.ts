import request from '../utils/request.js';
import type {
  Coupon,
  CustomerCoupon,
  CouponStatus,
  CreateCouponRequest,
  DistributeCouponRequest,
  ApplyCouponRequest,
  CouponDiscountResult,
  ApiResponse,
} from '../../shared/types.js';

export const couponApi = {
  getAll: (params?: { status?: CouponStatus }) => {
    return request.get<ApiResponse<Coupon[]>>('/coupons', { params }).then(r => r.data.data!);
  },

  getById: (id: number) => {
    return request.get<ApiResponse<Coupon>>(`/coupons/${id}`).then(r => r.data.data!);
  },

  create: (data: CreateCouponRequest) => {
    return request.post<ApiResponse<Coupon>>('/coupons', data).then(r => r.data.data!);
  },

  distribute: (data: DistributeCouponRequest) => {
    return request.post<ApiResponse<{ success: number; failed: number; message: string }>>('/coupons/distribute', data).then(r => r.data.data!);
  },

  apply: (data: ApplyCouponRequest) => {
    return request.post<ApiResponse<CouponDiscountResult>>('/coupons/apply', data).then(r => r.data.data!);
  },

  validate: (data: { customerId: number; couponId: number; orderAmount: number }) => {
    return request.post<ApiResponse<{ valid: boolean; message?: string }>>('/coupons/validate', data).then(r => r.data.data!);
  },

  getCustomerCoupons: (customerId: number, availableOnly?: boolean) => {
    return request.get<ApiResponse<CustomerCoupon[]>>(`/coupons/customer/${customerId}`, {
      params: { availableOnly }
    }).then(r => r.data.data!);
  },
};
