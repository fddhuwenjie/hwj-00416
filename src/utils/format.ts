import dayjs from 'dayjs';
import type { DeviceStatus, OrderStatus, CustomerLevel, DeviceReturnStatus } from '../../shared/types.js';

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
