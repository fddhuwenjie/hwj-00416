import request from '../utils/request.js';
import type {
  MaintenanceRecord,
  MaintenanceTimelineItem,
  MaintenanceReminderRule,
  CreateMaintenanceRequest,
  AssignMaintenanceRequest,
  CompleteMaintenanceRequest,
  MaintenanceStatus,
  MaintenanceType,
  ApiResponse,
} from '../../shared/types.js';

export const maintenanceApi = {
  getAll: (params?: { deviceId?: number; status?: MaintenanceStatus; type?: MaintenanceType }) => {
    return request.get<ApiResponse<MaintenanceRecord[]>>('/maintenance', { params }).then(r => r.data.data!);
  },

  getById: (id: number) => {
    return request.get<ApiResponse<MaintenanceRecord>>(`/maintenance/${id}`).then(r => r.data.data!);
  },

  create: (data: CreateMaintenanceRequest) => {
    return request.post<ApiResponse<MaintenanceRecord>>('/maintenance', data).then(r => r.data.data!);
  },

  assign: (id: number, data: AssignMaintenanceRequest) => {
    return request.put<ApiResponse<MaintenanceRecord>>(`/maintenance/${id}/assign`, data).then(r => r.data.data!);
  },

  start: (id: number) => {
    return request.put<ApiResponse<MaintenanceRecord>>(`/maintenance/${id}/start`).then(r => r.data.data!);
  },

  complete: (id: number, data: CompleteMaintenanceRequest) => {
    return request.put<ApiResponse<MaintenanceRecord>>(`/maintenance/${id}/complete`, data).then(r => r.data.data!);
  },

  cancel: (id: number) => {
    return request.put<ApiResponse<MaintenanceRecord>>(`/maintenance/${id}/cancel`).then(r => r.data.data!);
  },

  getTimeline: (id: number) => {
    return request.get<ApiResponse<MaintenanceTimelineItem[]>>(`/maintenance/${id}/timeline`).then(r => r.data.data!);
  },

  getReminderRules: () => {
    return request.get<ApiResponse<MaintenanceReminderRule[]>>('/maintenance/reminders/rules').then(r => r.data.data!);
  },

  createReminderRule: (data: Omit<MaintenanceReminderRule, 'id' | 'createdAt'>) => {
    return request.post<ApiResponse<MaintenanceReminderRule>>('/maintenance/reminders/rules', data).then(r => r.data.data!);
  },

  generateMaintenanceOrders: () => {
    return request.post<ApiResponse<MaintenanceRecord[]>>('/maintenance/reminders/generate').then(r => r.data.data!);
  },
};
