import { deviceRepository } from '../repositories/device.repository.js';
import { categoryRepository } from '../repositories/category.repository.js';
import type { Device, DeviceStatus } from '../../../shared/types.js';

export class DeviceService {
  async getAllDevices(categoryId?: number, status?: DeviceStatus): Promise<Device[]> {
    let devices: Device[];

    if (categoryId) {
      devices = deviceRepository.findByCategory(categoryId);
    } else {
      devices = deviceRepository.findAllWithCategory();
    }

    if (status) {
      devices = devices.filter(d => d.status === status);
    }

    return devices;
  }

  async getDeviceById(id: number): Promise<Device | null> {
    const devices = deviceRepository.findAllWithCategory();
    return devices.find(d => d.id === id) || null;
  }

  async createDevice(data: Omit<Device, 'id' | 'createdAt'>): Promise<Device> {
    const category = categoryRepository.findById(data.categoryId);
    if (!category) {
      throw new Error('分类不存在');
    }

    if (data.barcode) {
      const existing = deviceRepository.findAllWithCategory().find(d => d.barcode === data.barcode);
      if (existing) {
        throw new Error('条码编号已存在');
      }
    }

    return deviceRepository.create(data);
  }

  async updateDevice(id: number, data: Partial<Omit<Device, 'id' | 'createdAt'>>): Promise<Device | null> {
    const device = deviceRepository.findById(id);
    if (!device) {
      throw new Error('设备不存在');
    }

    if (data.categoryId) {
      const category = categoryRepository.findById(data.categoryId);
      if (!category) {
        throw new Error('分类不存在');
      }
    }

    if (data.barcode) {
      const existing = deviceRepository.findAllWithCategory().find(d => d.barcode === data.barcode && d.id !== id);
      if (existing) {
        throw new Error('条码编号已存在');
      }
    }

    return deviceRepository.update(id, data);
  }

  async deleteDevice(id: number): Promise<boolean> {
    const device = deviceRepository.findById(id);
    if (!device) {
      throw new Error('设备不存在');
    }

    return deviceRepository.delete(id);
  }

  async checkAvailability(deviceId: number, startDate: string, endDate: string, quantity: number = 1): Promise<{
    available: boolean;
    rented: number;
    stock: number;
    remaining: number;
  }> {
    const result = deviceRepository.checkAvailability(deviceId, startDate, endDate);
    const remaining = result.stock - result.rented;
    return {
      ...result,
      available: remaining >= quantity,
      remaining,
    };
  }

  async getLowStockDevices(threshold: number = 2): Promise<Device[]> {
    return deviceRepository.findLowStock(threshold);
  }

  async getAvailableDevices(): Promise<Device[]> {
    return deviceRepository.findAvailable();
  }
}

export const deviceService = new DeviceService();
