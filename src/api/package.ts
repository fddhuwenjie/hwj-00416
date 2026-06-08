import request from '../utils/request.js';
import type {
  Package,
  PackageStatus,
  CreatePackageRequest,
  ApiResponse,
} from '../../shared/types.js';

export const packageApi = {
  getAll: (params?: { status?: PackageStatus }) => {
    return request.get<ApiResponse<Package[]>>('/packages', { params }).then(r => r.data.data!);
  },

  getById: (id: number) => {
    return request.get<ApiResponse<Package>>(`/packages/${id}`).then(r => r.data.data!);
  },

  create: (data: CreatePackageRequest) => {
    return request.post<ApiResponse<Package>>('/packages', data).then(r => r.data.data!);
  },

  update: (id: number, data: Partial<CreatePackageRequest>) => {
    return request.put<ApiResponse<Package>>(`/packages/${id}`, data).then(r => r.data.data!);
  },

  toggle: (id: number) => {
    return request.put<ApiResponse<Package>>(`/packages/${id}/toggle`).then(r => r.data.data!);
  },
};
