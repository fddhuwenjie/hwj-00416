import { Request, Response } from 'express';
import { deviceService } from '../services/device.service.js';
import { categoryRepository } from '../repositories/category.repository.js';
import type { ApiResponse, DeviceStatus } from '../../../shared/types.js';

export class DeviceController {
  async getAllDevices(req: Request, res: Response) {
    try {
      const { categoryId, status } = req.query;
      const devices = await deviceService.getAllDevices(
        categoryId ? Number(categoryId) : undefined,
        status as DeviceStatus | undefined
      );
      res.json({ success: true, data: devices } as ApiResponse);
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message } as ApiResponse);
    }
  }

  async getDeviceById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const device = await deviceService.getDeviceById(Number(id));
      if (!device) {
        return res.status(404).json({ success: false, error: '设备不存在' } as ApiResponse);
      }
      res.json({ success: true, data: device } as ApiResponse);
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message } as ApiResponse);
    }
  }

  async createDevice(req: Request, res: Response) {
    try {
      const device = await deviceService.createDevice(req.body);
      res.status(201).json({ success: true, data: device, message: '设备创建成功' } as ApiResponse);
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message } as ApiResponse);
    }
  }

  async updateDevice(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const device = await deviceService.updateDevice(Number(id), req.body);
      res.json({ success: true, data: device, message: '设备更新成功' } as ApiResponse);
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message } as ApiResponse);
    }
  }

  async deleteDevice(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await deviceService.deleteDevice(Number(id));
      res.json({ success: true, message: '设备删除成功' } as ApiResponse);
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message } as ApiResponse);
    }
  }

  async checkAvailability(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { startDate, endDate, quantity } = req.query;
      const result = await deviceService.checkAvailability(
        Number(id),
        startDate as string,
        endDate as string,
        quantity ? Number(quantity) : 1
      );
      res.json({ success: true, data: result } as ApiResponse);
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message } as ApiResponse);
    }
  }

  async getCategories(_req: Request, res: Response) {
    try {
      const categories = categoryRepository.findAll();
      res.json({ success: true, data: categories } as ApiResponse);
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message } as ApiResponse);
    }
  }

  async getLowStockDevices(req: Request, res: Response) {
    try {
      const { threshold } = req.query;
      const devices = await deviceService.getLowStockDevices(
        threshold ? Number(threshold) : 2
      );
      res.json({ success: true, data: devices } as ApiResponse);
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message } as ApiResponse);
    }
  }

  async getAvailableDevices(_req: Request, res: Response) {
    try {
      const devices = await deviceService.getAvailableDevices();
      res.json({ success: true, data: devices } as ApiResponse);
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message } as ApiResponse);
    }
  }
}

export const deviceController = new DeviceController();
