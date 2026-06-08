export type DeviceCategoryCode = 'photography' | 'audio' | 'lighting' | 'stage' | 'tools';
export type DeviceStatus = 'available' | 'maintenance' | 'offline';
export type OrderStatus = 'pending' | 'out' | 'in_use' | 'returned' | 'overdue';
export type CustomerLevel = 'normal' | 'vip' | 'svip';
export type DeviceReturnStatus = 'good' | 'damaged' | 'lost';

export interface Category {
  id: number;
  name: string;
  code: DeviceCategoryCode;
}

export interface Device {
  id: number;
  name: string;
  categoryId: number;
  categoryName?: string;
  categoryCode?: string;
  brandModel: string;
  dailyRate: number;
  deposit: number;
  stock: number;
  status: DeviceStatus;
  photoUrl?: string;
  barcode?: string;
  createdAt: string;
}

export interface Customer {
  id: number;
  name: string;
  phone: string;
  idCard?: string;
  creditScore: number;
  totalSpent: number;
  isBlacklisted: boolean;
  vipLevel: CustomerLevel;
  createdAt: string;
}

export interface OrderItem {
  id: number;
  orderId: number;
  deviceId: number;
  deviceName?: string;
  quantity: number;
  dailyRate: number;
  depositPerUnit: number;
  days: number;
  subtotal: number;
  deviceStatus?: DeviceReturnStatus;
  repairNote?: string;
  repairFee?: number;
}

export interface Order {
  id: number;
  orderNo: string;
  customerId: number;
  customerName?: string;
  customerPhone?: string;
  startDate: string;
  endDate: string;
  actualReturnDate?: string;
  totalRent: number;
  totalDeposit: number;
  lateFee: number;
  repairFee: number;
  finalAmount?: number;
  status: OrderStatus;
  remarks?: string;
  items?: OrderItem[];
  createdAt: string;
}

export interface BookingItem {
  id: number;
  orderId: number;
  orderNo: string;
  deviceId: number;
  deviceName: string;
  customerName: string;
  startDate: string;
  endDate: string;
  quantity: number;
  status: OrderStatus;
  hasConflict?: boolean;
}

export interface DashboardStats {
  totalDevices: number;
  availableDevices: number;
  totalOrders: number;
  activeOrders: number;
  totalCustomers: number;
  blacklistedCustomers: number;
  totalRevenue: number;
  monthRevenue: number;
  deviceUtilizationRate: number;
  overdueRate: number;
  lowStockDevices: Device[];
  hotDevices: { deviceId: number; deviceName: string; count: number }[];
  categoryStats: { categoryId: number; categoryName: string; count: number }[];
}

export interface RevenueData {
  date: string;
  revenue: number;
  orders: number;
}

export interface CreateOrderRequest {
  customerId?: number;
  customerName: string;
  customerPhone: string;
  customerIdCard?: string;
  startDate: string;
  endDate: string;
  items: {
    deviceId: number;
    quantity: number;
  }[];
  remarks?: string;
}

export interface ReturnOrderRequest {
  actualReturnDate: string;
  items: {
    orderItemId: number;
    deviceStatus: DeviceReturnStatus;
    repairNote?: string;
    repairFee?: number;
  }[];
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
