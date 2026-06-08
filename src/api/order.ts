import request from '../utils/request.js';
import type { Order, CreateOrderRequest, ReturnOrderRequest, BookingItem, ApiResponse, OrderStatus } from '../../shared/types.js';

export const orderApi = {
  getAll: (params?: { status?: OrderStatus; customerId?: number }) => {
    return request.get<ApiResponse<Order[]>>('/orders', { params }).then(r => r.data.data!);
  },

  getById: (id: number) => {
    return request.get<ApiResponse<Order & { items: unknown[] }>>(`/orders/${id}`).then(r => r.data.data!);
  },

  create: (data: CreateOrderRequest) => {
    return request.post<ApiResponse<Order & { items: unknown[] }>>('/orders', data).then(r => r.data.data!);
  },

  updateStatus: (id: number, status: OrderStatus) => {
    return request.put<ApiResponse<Order>>(`/orders/${id}/status`, { status }).then(r => r.data.data!);
  },

  processReturn: (id: number, data: ReturnOrderRequest) => {
    return request.post<ApiResponse<Order & { items: unknown[] }>>(`/orders/${id}/return`, data).then(r => r.data.data!);
  },

  getBookings: (startDate: string, endDate: string) => {
    return request.get<ApiResponse<BookingItem[]>>('/orders/bookings', {
      params: { startDate, endDate }
    }).then(r => r.data.data!);
  },
};
