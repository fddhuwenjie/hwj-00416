import { orderRepository } from '../repositories/order.repository.js';
import { deviceRepository } from '../repositories/device.repository.js';
import { customerRepository } from '../repositories/customer.repository.js';
import type { Order, OrderStatus, CreateOrderRequest, ReturnOrderRequest, OrderItem } from '../../../shared/types.js';
import {
  generateOrderNo,
  calculateDays,
  calculateRent,
  calculateDeposit,
  calculateLateFee,
  getDiscountRate,
  getOverdueDays,
  calculateFinalAmount,
  updateCustomerCreditScore,
  shouldBeBlacklisted,
} from '../utils/helpers.js';

export class OrderService {
  async getAllOrders(status?: OrderStatus, customerId?: number): Promise<Order[]> {
    let orders = orderRepository.findAllWithDetails();

    if (status) {
      orders = orders.filter(o => o.status === status);
    }

    if (customerId) {
      orders = orders.filter(o => o.customerId === customerId);
    }

    return orders;
  }

  async getOrderById(id: number): Promise<(Order & { items: OrderItem[] }) | null> {
    return orderRepository.findByIdWithDetails(id);
  }

  async createOrder(request: CreateOrderRequest): Promise<Order & { items: OrderItem[] }> {
    for (const item of request.items) {
      const device = deviceRepository.findById(item.deviceId);
      if (!device) {
        throw new Error(`设备ID ${item.deviceId} 不存在`);
      }
      if (device.status !== 'available') {
        throw new Error(`设备 ${device.name} 当前不可租赁`);
      }

      const availability = deviceRepository.checkAvailability(item.deviceId, request.startDate, request.endDate);
      const remaining = availability.stock - availability.rented;
      if (remaining < item.quantity) {
        throw new Error(`设备 ${device.name} 库存不足，剩余 ${remaining} 件，需要 ${item.quantity} 件`);
      }
    }

    let customerId = request.customerId;
    let customer = customerId ? customerRepository.findById(customerId) : null;

    if (!customer) {
      customer = customerRepository.findByPhone(request.customerPhone);
      if (customer) {
        customerId = customer.id;
      } else {
        const newCustomer = customerRepository.create({
          name: request.customerName,
          phone: request.customerPhone,
          idCard: request.customerIdCard,
          creditScore: 100,
          totalSpent: 0,
          isBlacklisted: false,
          vipLevel: 'normal',
        });
        customerId = newCustomer.id;
        customer = newCustomer;
      }
    }

    if (customer.isBlacklisted) {
      throw new Error('该客户已被加入黑名单，无法租赁');
    }

    const discountRate = getDiscountRate(customer);
    const days = calculateDays(request.startDate, request.endDate);

    let totalRent = 0;
    let totalDeposit = 0;
    const orderItems: Omit<OrderItem, 'id' | 'orderId'>[] = [];

    for (const item of request.items) {
      const device = deviceRepository.findById(item.deviceId)!;
      const subtotal = Math.round(calculateRent(device.dailyRate, days, item.quantity) * discountRate * 100) / 100;
      const deposit = calculateDeposit(device.deposit, item.quantity);

      totalRent += subtotal;
      totalDeposit += deposit;

      orderItems.push({
        deviceId: item.deviceId,
        deviceName: device.name,
        quantity: item.quantity,
        dailyRate: device.dailyRate,
        depositPerUnit: device.deposit,
        days,
        subtotal,
      });
    }

    const orderNo = generateOrderNo();

    const order = orderRepository.create(
      {
        orderNo,
        customerId: customerId!,
        startDate: request.startDate,
        endDate: request.endDate,
        totalRent,
        totalDeposit,
        lateFee: 0,
        repairFee: 0,
        status: 'pending',
        remarks: request.remarks,
      },
      orderItems
    );

    return order;
  }

  async updateOrderStatus(id: number, status: OrderStatus): Promise<Order | null> {
    const order = orderRepository.findById(id);
    if (!order) {
      throw new Error('订单不存在');
    }

    return orderRepository.updateStatus(id, status);
  }

  async processReturn(id: number, request: ReturnOrderRequest): Promise<Order & { items: OrderItem[] }> {
    const order = orderRepository.findByIdWithDetails(id);
    if (!order) {
      throw new Error('订单不存在');
    }

    if (order.status === 'returned') {
      throw new Error('该订单已归还');
    }

    const customer = customerRepository.findById(order.customerId);
    if (!customer) {
      throw new Error('客户信息不存在');
    }

    const overdueDays = getOverdueDays(order.endDate, request.actualReturnDate);
    const hasOverdue = overdueDays > 0;
    const hasDamage = request.items.some(i => i.deviceStatus === 'damaged' || i.deviceStatus === 'lost');

    let lateFee = 0;
    if (hasOverdue) {
      for (const item of order.items!) {
        lateFee += calculateLateFee(item.dailyRate, overdueDays, item.quantity);
      }
    }

    let repairFee = 0;
    for (const item of request.items) {
      repairFee += item.repairFee || 0;
    }

    const finalAmount = calculateFinalAmount(
      order.totalRent,
      lateFee,
      repairFee,
      order.totalDeposit
    );

    const newSpent = customer.totalSpent + order.totalRent + lateFee + repairFee;
    const newCreditScore = updateCustomerCreditScore(customer, hasOverdue, hasDamage);
    const isBlacklisted = shouldBeBlacklisted(newCreditScore);

    customerRepository.update(customer.id, {
      totalSpent: newSpent,
      creditScore: newCreditScore,
      isBlacklisted,
    });

    customerRepository.updateVipLevel(customer.id);

    return orderRepository.processReturn(
      id,
      request.actualReturnDate,
      lateFee,
      repairFee,
      finalAmount,
      request.items
    );
  }

  async getBookings(startDate: string, endDate: string): Promise<Array<{
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
  }>> {
    const orders = orderRepository.findBookings(startDate, endDate);
    const bookings: Array<{
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
    }> = [];

    for (const order of orders) {
      if (!order.items) continue;

      for (const item of order.items) {
        const availability = deviceRepository.checkAvailability(item.deviceId, order.startDate, order.endDate);

        bookings.push({
          id: bookings.length + 1,
          orderId: order.id,
          orderNo: order.orderNo,
          deviceId: item.deviceId,
          deviceName: item.deviceName || '',
          customerName: order.customerName || '',
          startDate: order.startDate,
          endDate: order.endDate,
          quantity: item.quantity,
          status: order.status,
          hasConflict: availability.rented > availability.stock,
        });
      }
    }

    return bookings;
  }
}

export const orderService = new OrderService();
