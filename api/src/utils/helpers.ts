import dayjs from 'dayjs';
import type { Customer, Order } from '../../../shared/types.js';

export function generateOrderNo(): string {
  const now = dayjs();
  const dateStr = now.format('YYYYMMDD');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ORD${dateStr}${random}`;
}

export function calculateDays(startDate: string, endDate: string): number {
  const start = dayjs(startDate);
  const end = dayjs(endDate);
  return end.diff(start, 'day') + 1;
}

export function calculateRent(dailyRate: number, days: number, quantity: number): number {
  return dailyRate * days * quantity;
}

export function calculateDeposit(depositPerUnit: number, quantity: number): number {
  return depositPerUnit * quantity;
}

export function calculateLateFee(dailyRate: number, overdueDays: number, quantity: number = 1): number {
  return Math.round(dailyRate * 1.5 * overdueDays * quantity * 100) / 100;
}

export function getDiscountRate(customer: Customer): number {
  if (customer.vipLevel === 'svip') return 0.9;
  if (customer.vipLevel === 'vip') return 0.95;
  return 1;
}

export function isDateOverdue(endDate: string, actualReturnDate: string): boolean {
  return dayjs(actualReturnDate).isAfter(dayjs(endDate), 'day');
}

export function getOverdueDays(endDate: string, actualReturnDate: string): number {
  const end = dayjs(endDate);
  const actual = dayjs(actualReturnDate);
  const diff = actual.diff(end, 'day');
  return diff > 0 ? diff : 0;
}

export function calculateFinalAmount(
  totalRent: number,
  lateFee: number,
  repairFee: number,
  totalDeposit: number
): number {
  return Math.round((totalRent + lateFee + repairFee - totalDeposit) * 100) / 100;
}

export function updateCustomerCreditScore(
  customer: Customer,
  hasOverdue: boolean,
  hasDamage: boolean
): number {
  let newScore = customer.creditScore;
  if (hasOverdue) newScore -= 10;
  if (hasDamage) newScore -= 20;
  return Math.max(0, Math.min(100, newScore));
}

export function shouldBeBlacklisted(creditScore: number): boolean {
  return creditScore < 60;
}

export function datesOverlap(
  start1: string, end1: string,
  start2: string, end2: string
): boolean {
  return dayjs(start1).isBefore(end2) && dayjs(start2).isBefore(end1);
}

export function formatCurrency(amount: number): string {
  return `¥${amount.toFixed(2)}`;
}
