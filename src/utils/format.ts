import dayjs from 'dayjs';
import type {
  DeviceStatus,
  OrderStatus,
  CustomerLevel,
  DeviceReturnStatus,
  MaintenanceStatus,
  MaintenancePriority,
  MaintenanceType,
  ContractStatus,
  CouponType,
  CouponStatus,
  PackageStatus,
} from '../../shared/types.js';

export function formatCurrency(amount: number): string {
  return `¥${amount.toFixed(2)}`;
}

export function formatDate(date: string | Date): string {
  return dayjs(date).format('YYYY-MM-DD');
}

export function formatDateTime(date: string | Date): string {
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss');
}

export function getDaysBetween(start: string, end: string): number {
  return dayjs(end).diff(dayjs(start), 'day') + 1;
}

export const deviceStatusMap: Record<DeviceStatus, { label: string; color: string }> = {
  available: { label: '可租', color: 'bg-green-100 text-green-800' },
  maintenance: { label: '维修中', color: 'bg-yellow-100 text-yellow-800' },
  offline: { label: '已下架', color: 'bg-gray-100 text-gray-800' },
};

export const orderStatusMap: Record<OrderStatus, { label: string; color: string }> = {
  pending: { label: '待确认', color: 'bg-blue-100 text-blue-800' },
  out: { label: '已出库', color: 'bg-purple-100 text-purple-800' },
  in_use: { label: '使用中', color: 'bg-indigo-100 text-indigo-800' },
  returned: { label: '已归还', color: 'bg-green-100 text-green-800' },
  overdue: { label: '逾期', color: 'bg-red-100 text-red-800' },
};

export const customerLevelMap: Record<CustomerLevel, { label: string; color: string }> = {
  normal: { label: '普通客户', color: 'bg-gray-100 text-gray-800' },
  vip: { label: 'VIP', color: 'bg-amber-100 text-amber-800' },
  svip: { label: 'SVIP', color: 'bg-rose-100 text-rose-800' },
};

export const deviceReturnStatusMap: Record<DeviceReturnStatus, { label: string; color: string }> = {
  good: { label: '完好', color: 'bg-green-100 text-green-800' },
  damaged: { label: '损坏', color: 'bg-orange-100 text-orange-800' },
  lost: { label: '丢失', color: 'bg-red-100 text-red-800' },
};

export function getVipDiscount(level: CustomerLevel): number {
  if (level === 'svip') return 0.9;
  if (level === 'vip') return 0.95;
  return 1;
}

export function getCreditScoreColor(score: number): string {
  if (score >= 90) return 'text-green-600';
  if (score >= 70) return 'text-blue-600';
  if (score >= 60) return 'text-yellow-600';
  return 'text-red-600';
}

export const maintenanceStatusMap: Record<MaintenanceStatus, { label: string; color: string }> = {
  pending: { label: '待处理', color: 'bg-yellow-100 text-yellow-800' },
  assigned: { label: '已分配', color: 'bg-blue-100 text-blue-800' },
  in_progress: { label: '维修中', color: 'bg-purple-100 text-purple-800' },
  completed: { label: '已完成', color: 'bg-green-100 text-green-800' },
  cancelled: { label: '已取消', color: 'bg-gray-100 text-gray-800' },
};

export const maintenancePriorityMap: Record<MaintenancePriority, { label: string; color: string }> = {
  high: { label: '高', color: 'bg-red-100 text-red-800' },
  medium: { label: '中', color: 'bg-yellow-100 text-yellow-800' },
  low: { label: '低', color: 'bg-green-100 text-green-800' },
};

export const maintenanceTypeMap: Record<MaintenanceType, { label: string; color: string }> = {
  repair: { label: '维修', color: 'bg-orange-100 text-orange-800' },
  maintenance: { label: '保养', color: 'bg-blue-100 text-blue-800' },
};

export const contractStatusMap: Record<ContractStatus, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'bg-gray-100 text-gray-800' },
  pending_signature: { label: '待签署', color: 'bg-yellow-100 text-yellow-800' },
  active: { label: '已生效', color: 'bg-green-100 text-green-800' },
  expired: { label: '已过期', color: 'bg-red-100 text-red-800' },
  terminated: { label: '已终止', color: 'bg-gray-100 text-gray-800' },
};

export const couponTypeMap: Record<CouponType, { label: string; color: string }> = {
  fixed: { label: '固定金额', color: 'bg-blue-100 text-blue-800' },
  percentage: { label: '折扣比例', color: 'bg-purple-100 text-purple-800' },
};

export const couponStatusMap: Record<CouponStatus, { label: string; color: string }> = {
  active: { label: '有效', color: 'bg-green-100 text-green-800' },
  inactive: { label: '无效', color: 'bg-gray-100 text-gray-800' },
  expired: { label: '已过期', color: 'bg-red-100 text-red-800' },
};

export const packageStatusMap: Record<PackageStatus, { label: string; color: string }> = {
  active: { label: '启用', color: 'bg-green-100 text-green-800' },
  inactive: { label: '停用', color: 'bg-gray-100 text-gray-800' },
};
