import request from '../utils/request.js';
import type { Device, Category, ApiResponse } from '../../shared/types.js';

export const deviceApi = {
  getAll: (params?: { categoryId?: number; status?: string }) => {
    return request.get<ApiResponse<Device[]>>('/devices', { params }).then(r => r.data.data!);
  },

  getById: (id: number) => {
    return request.get<ApiResponse<Device>>(`/devices/${id}`).then(r => r.data.data!);
  },

  create: (data: Omit<Device, 'id' | 'createdAt'>) => {
    return request.post<ApiResponse<Device>>('/devices', data).then(r => r.data.data!);
  },

  update: (id: number, data: Partial<Omit<Device, 'id' | 'createdAt'>>) => {
    return request.put<ApiResponse<Device>>(`/devices/${id}`, data).then(r => r.data.data!);
  },

  delete: (id: number) => {
    return request.delete<ApiResponse>(`/devices/${id}`).then(r => r.data);
  },

  checkAvailability: (id: number, startDate: string, endDate: string, quantity?: number) => {
    return request.get<ApiResponse<{ available: boolean; rented: number; stock: number; remaining: number }>>(
      `/devices/${id}/availability`,
      { params: { startDate, endDate, quantity } }
    ).then(r => r.data.data!);
  },

  getCategories: () => {
    return request.get<ApiResponse<Category[]>>('/devices/categories').then(r => r.data.data!);
  },

  getLowStock: (threshold?: number) => {
    return request.get<ApiResponse<Device[]>>('/devices/low-stock', { params: { threshold } }).then(r => r.data.data!);
  },

  getAvailable: () => {
    return request.get<ApiResponse<Device[]>>('/devices/available').then(r => r.data.data!);
  },
};
