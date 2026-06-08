import request from '../utils/request.js';
import type { Customer, Order, ApiResponse } from '../../shared/types.js';

export const customerApi = {
  getAll: (params?: { search?: string; includeBlacklisted?: boolean }) => {
    return request.get<ApiResponse<Customer[]>>('/customers', { params }).then(r => r.data.data!);
  },

  getById: (id: number) => {
    return request.get<ApiResponse<Customer & { orderCount: number; recentOrders: Order[] }>>(`/customers/${id}`).then(r => r.data.data!);
  },

  getByPhone: (phone: string) => {
    return request.get<ApiResponse<Customer>>(`/customers/phone/${phone}`).then(r => r.data.data!);
  },

  create: (data: Omit<Customer, 'id' | 'createdAt'>) => {
    return request.post<ApiResponse<Customer>>('/customers', data).then(r => r.data.data!);
  },

  update: (id: number, data: Partial<Omit<Customer, 'id' | 'createdAt'>>) => {
    return request.put<ApiResponse<Customer>>(`/customers/${id}`, data).then(r => r.data.data!);
  },

  toggleBlacklist: (id: number) => {
    return request.put<ApiResponse<Customer>>(`/customers/${id}/toggle-blacklist`).then(r => r.data.data!);
  },

  getOrders: (id: number) => {
    return request.get<ApiResponse<Order[]>>(`/customers/${id}/orders`).then(r => r.data.data!);
  },
};
