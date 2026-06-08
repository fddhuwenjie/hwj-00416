import { customerRepository } from '../repositories/customer.repository.js';
import { orderRepository } from '../repositories/order.repository.js';
import type { Customer } from '../../../shared/types.js';

export class CustomerService {
  async getAllCustomers(search?: string, includeBlacklisted: boolean = true): Promise<Customer[]> {
    let customers: Customer[];

    if (search) {
      customers = customerRepository.search(search);
    } else {
      customers = customerRepository.findAll();
    }

    if (!includeBlacklisted) {
      customers = customers.filter(c => !c.isBlacklisted);
    }

    return customers;
  }

  async getCustomerById(id: number): Promise<(Customer & { orderCount: number; recentOrders: ReturnType<typeof orderRepository.findByCustomerId> }) | null> {
    const customer = customerRepository.findById(id);
    if (!customer) return null;

    const orders = orderRepository.findByCustomerId(id);

    return {
      ...customer,
      orderCount: orders.length,
      recentOrders: orders.slice(0, 10),
    };
  }

  async getCustomerByPhone(phone: string): Promise<Customer | null> {
    return customerRepository.findByPhone(phone);
  }

  async createCustomer(data: Omit<Customer, 'id' | 'createdAt'>): Promise<Customer> {
    const existing = customerRepository.findByPhone(data.phone);
    if (existing) {
      throw new Error('该手机号已注册');
    }

    if (data.idCard) {
      const existingIdCard = customerRepository.findAll().find(c => c.idCard === data.idCard);
      if (existingIdCard) {
        throw new Error('该身份证号已注册');
      }
    }

    return customerRepository.create(data);
  }

  async updateCustomer(id: number, data: Partial<Omit<Customer, 'id' | 'createdAt'>>): Promise<Customer | null> {
    const customer = customerRepository.findById(id);
    if (!customer) {
      throw new Error('客户不存在');
    }

    if (data.phone) {
      const existing = customerRepository.findByPhone(data.phone);
      if (existing && existing.id !== id) {
        throw new Error('该手机号已被使用');
      }
    }

    if (data.idCard) {
      const existing = customerRepository.findAll().find(c => c.idCard === data.idCard && c.id !== id);
      if (existing) {
        throw new Error('该身份证号已被使用');
      }
    }

    const updated = customerRepository.update(id, data);

    if (data.totalSpent !== undefined) {
      customerRepository.updateVipLevel(id);
    }

    return updated;
  }

  async toggleBlacklist(id: number): Promise<Customer | null> {
    const customer = customerRepository.findById(id);
    if (!customer) {
      throw new Error('客户不存在');
    }

    return customerRepository.update(id, {
      isBlacklisted: !customer.isBlacklisted,
    });
  }

  async getCustomerOrders(id: number) {
    return orderRepository.findByCustomerId(id);
  }
}

export const customerService = new CustomerService();
