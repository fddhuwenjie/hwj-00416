export type DeviceCategoryCode = 'photography' | 'audio' | 'lighting' | 'stage' | 'tools';
export type DeviceStatus = 'available' | 'maintenance' | 'offline';
export type OrderStatus = 'pending' | 'out' | 'in_use' | 'returned' | 'overdue';
export type CustomerLevel = 'normal' | 'vip' | 'svip';
export type DeviceReturnStatus = 'good' | 'damaged' | 'lost';

export type MaintenancePriority = 'high' | 'medium' | 'low';
export type MaintenanceStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
export type MaintenanceType = 'repair' | 'maintenance';

export type ContractStatus = 'draft' | 'pending_signature' | 'active' | 'expired' | 'terminated';

export type CouponType = 'fixed' | 'percentage';
export type CouponStatus = 'active' | 'inactive' | 'expired';
export type PackageStatus = 'active' | 'inactive';

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

export interface MaintenanceRecord {
  id: number;
  deviceId: number;
  deviceName?: string;
  type: MaintenanceType;
  status: MaintenanceStatus;
  priority: MaintenancePriority;
  reporterName: string;
  faultDescription: string;
  photoUrl?: string;
  beforePhotoUrl?: string;
  afterPhotoUrl?: string;
  assignedTo?: string;
  estimatedRepairDate?: string;
  actualCost?: number;
  replacedParts?: string;
  repairNotes?: string;
  completedAt?: string;
  createdAt: string;
}

export interface MaintenanceReminderRule {
  id: number;
  deviceId: number;
  deviceName?: string;
  ruleType: 'rental_days' | 'fixed_period';
  thresholdDays: number;
  lastReminderDate?: string;
  nextMaintenanceDate?: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateMaintenanceRequest {
  deviceId: number;
  type: MaintenanceType;
  priority: MaintenancePriority;
  reporterName: string;
  faultDescription: string;
  photoUrl?: string;
}

export interface AssignMaintenanceRequest {
  assignedTo: string;
  estimatedRepairDate: string;
}

export interface CompleteMaintenanceRequest {
  actualCost: number;
  replacedParts: string;
  beforePhotoUrl?: string;
  afterPhotoUrl?: string;
  repairNotes?: string;
}

export interface MaintenanceTimelineItem {
  id: number;
  maintenanceId: number;
  status: MaintenanceStatus;
  description: string;
  createdAt: string;
  operator?: string;
}

export interface Contract {
  id: number;
  orderId: number;
  orderNo?: string;
  customerId: number;
  customerName?: string;
  customerPhone?: string;
  status: ContractStatus;
  contractNo: string;
  content: string;
  lessorSignature?: string;
  lesseeSignature?: string;
  signedAt?: string;
  startDate: string;
  endDate: string;
  totalAmount: number;
  createdAt: string;
}

export interface ContractSignatureRequest {
  party: 'lessor' | 'lessee';
  signatureData: string;
}

export interface Package {
  id: number;
  name: string;
  description?: string;
  status: PackageStatus;
  totalPrice: number;
  originalPrice: number;
  photoUrl?: string;
  createdAt: string;
  items?: PackageItem[];
}

export interface PackageItem {
  id: number;
  packageId: number;
  deviceId: number;
  deviceName?: string;
  quantity: number;
}

export interface CreatePackageRequest {
  name: string;
  description?: string;
  photoUrl?: string;
  items: { deviceId: number; quantity: number }[];
}

export interface Coupon {
  id: number;
  code: string;
  name: string;
  type: CouponType;
  value: number;
  minOrderAmount: number;
  validFrom: string;
  validTo: string;
  status: CouponStatus;
  totalQuantity: number;
  usedQuantity: number;
  description?: string;
  createdAt: string;
}

export interface CustomerCoupon {
  id: number;
  customerId: number;
  couponId: number;
  coupon?: Coupon;
  isUsed: boolean;
  usedAt?: string;
  orderId?: number;
  createdAt: string;
}

export interface CreateCouponRequest {
  name: string;
  type: CouponType;
  value: number;
  minOrderAmount: number;
  validFrom: string;
  validTo: string;
  totalQuantity: number;
  description?: string;
}

export interface DistributeCouponRequest {
  couponId: number;
  customerIds?: number[];
  allCustomers: boolean;
}

export interface ApplyCouponRequest {
  orderId?: number;
  couponId: number;
  customerId: number;
  orderAmount: number;
}

export interface CouponDiscountResult {
  discountAmount: number;
  finalAmount: number;
  coupon: Coupon;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
