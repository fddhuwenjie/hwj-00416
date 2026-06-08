import request from '../utils/request.js';
import type {
  Contract,
  ContractStatus,
  ContractSignatureRequest,
  ApiResponse,
} from '../../shared/types.js';

export const contractApi = {
  getAll: (params?: { status?: ContractStatus; customerId?: number }) => {
    return request.get<ApiResponse<Contract[]>>('/contracts', { params }).then(r => r.data.data!);
  },

  getById: (id: number) => {
    return request.get<ApiResponse<Contract>>(`/contracts/${id}`).then(r => r.data.data!);
  },

  generate: (orderId: number) => {
    return request.post<ApiResponse<Contract>>(`/contracts/generate/${orderId}`).then(r => r.data.data!);
  },

  sign: (id: number, data: ContractSignatureRequest) => {
    return request.post<ApiResponse<Contract>>(`/contracts/${id}/sign`, data).then(r => r.data.data!);
  },

  terminate: (id: number) => {
    return request.put<ApiResponse<Contract>>(`/contracts/${id}/terminate`).then(r => r.data.data!);
  },

  download: (id: number) => {
    return request.get<ApiResponse<string>>(`/contracts/${id}/download`).then(r => r.data.data!);
  },
};
