import { Request, Response } from 'express';
import { orderService } from '../services/order.service.js';
import type { ApiResponse, OrderStatus } from '../../../shared/types.js';

export class OrderController {
  async getAllOrders(req: Request, res: Response) {
    try {
      const { status, customerId } = req.query;
      const orders = await orderService.getAllOrders(
        status as OrderStatus | undefined,
        customerId ? Number(customerId) : undefined
      );
      res.json({ success: true, data: orders } as ApiResponse);
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message } as ApiResponse);
    }
  }

  async getOrderById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const order = await orderService.getOrderById(Number(id));
      if (!order) {
        return res.status(404).json({ success: false, error: '订单不存在' } as ApiResponse);
      }
      res.json({ success: true, data: order } as ApiResponse);
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message } as ApiResponse);
    }
  }

  async createOrder(req: Request, res: Response) {
    try {
      const order = await orderService.createOrder(req.body);
      res.status(201).json({ success: true, data: order, message: '订单创建成功' } as ApiResponse);
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message } as ApiResponse);
    }
  }

  async updateOrderStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const order = await orderService.updateOrderStatus(Number(id), status as OrderStatus);
      res.json({ success: true, data: order, message: '订单状态更新成功' } as ApiResponse);
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message } as ApiResponse);
    }
  }

  async processReturn(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const order = await orderService.processReturn(Number(id), req.body);
      res.json({ success: true, data: order, message: '归还结算完成' } as ApiResponse);
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message } as ApiResponse);
    }
  }

  async getBookings(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query;
      const bookings = await orderService.getBookings(
        startDate as string,
        endDate as string
      );
      res.json({ success: true, data: bookings } as ApiResponse);
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message } as ApiResponse);
    }
  }
}

export const orderController = new OrderController();
