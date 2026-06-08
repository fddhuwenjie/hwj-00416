import { Request, Response } from 'express';
import { customerService } from '../services/customer.service.js';
import type { ApiResponse } from '../../../shared/types.js';

export class CustomerController {
  async getAllCustomers(req: Request, res: Response) {
    try {
      const { search, includeBlacklisted } = req.query;
      const customers = await customerService.getAllCustomers(
        search as string | undefined,
        includeBlacklisted !== 'false'
      );
      res.json({ success: true, data: customers } as ApiResponse);
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message } as ApiResponse);
    }
  }

  async getCustomerById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const customer = await customerService.getCustomerById(Number(id));
      if (!customer) {
        return res.status(404).json({ success: false, error: '客户不存在' } as ApiResponse);
      }
      res.json({ success: true, data: customer } as ApiResponse);
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message } as ApiResponse);
    }
  }

  async getCustomerByPhone(req: Request, res: Response) {
    try {
      const { phone } = req.params;
      const customer = await customerService.getCustomerByPhone(phone);
      if (!customer) {
        return res.status(404).json({ success: false, error: '客户不存在' } as ApiResponse);
      }
      res.json({ success: true, data: customer } as ApiResponse);
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message } as ApiResponse);
    }
  }

  async createCustomer(req: Request, res: Response) {
    try {
      const customer = await customerService.createCustomer(req.body);
      res.status(201).json({ success: true, data: customer, message: '客户创建成功' } as ApiResponse);
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message } as ApiResponse);
    }
  }

  async updateCustomer(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const customer = await customerService.updateCustomer(Number(id), req.body);
      res.json({ success: true, data: customer, message: '客户更新成功' } as ApiResponse);
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message } as ApiResponse);
    }
  }

  async toggleBlacklist(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const customer = await customerService.toggleBlacklist(Number(id));
      res.json({ success: true, data: customer, message: '黑名单状态已更新' } as ApiResponse);
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message } as ApiResponse);
    }
  }

  async getCustomerOrders(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const orders = await customerService.getCustomerOrders(Number(id));
      res.json({ success: true, data: orders } as ApiResponse);
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message } as ApiResponse);
    }
  }
}

export const customerController = new CustomerController();
