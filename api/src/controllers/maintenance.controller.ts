import { Request, Response } from 'express';
import { maintenanceService } from '../services/maintenance.service.js';
import type {
  ApiResponse,
  MaintenanceStatus,
  MaintenanceType,
  AssignMaintenanceRequest,
  CompleteMaintenanceRequest,
} from '../../../shared/types.js';

export class MaintenanceController {
  async getAllRecords(req: Request, res: Response) {
    try {
      const { deviceId, status, type } = req.query;
      const records = await maintenanceService.getAllRecords(
        deviceId ? Number(deviceId) : undefined,
        status as MaintenanceStatus | undefined,
        type as MaintenanceType | undefined
      );
      res.json({ success: true, data: records } as ApiResponse);
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message } as ApiResponse);
    }
  }

  async getRecordById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const record = await maintenanceService.getRecordById(Number(id));
      if (!record) {
        return res.status(404).json({ success: false, error: '维保记录不存在' } as ApiResponse);
      }
      res.json({ success: true, data: record } as ApiResponse);
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message } as ApiResponse);
    }
  }

  async createRecord(req: Request, res: Response) {
    try {
      const record = await maintenanceService.createRecord(req.body);
      res.status(201).json({ success: true, data: record, message: '报修单创建成功' } as ApiResponse);
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message } as ApiResponse);
    }
  }

  async assignMaintenance(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const record = await maintenanceService.assignMaintenance(
        Number(id),
        req.body as AssignMaintenanceRequest
      );
      res.json({ success: true, data: record, message: '工单分配成功' } as ApiResponse);
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message } as ApiResponse);
    }
  }

  async startMaintenance(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const record = await maintenanceService.startMaintenance(Number(id));
      res.json({ success: true, data: record, message: '维修已开始' } as ApiResponse);
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message } as ApiResponse);
    }
  }

  async completeMaintenance(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const record = await maintenanceService.completeMaintenance(
        Number(id),
        req.body as CompleteMaintenanceRequest
      );
      res.json({ success: true, data: record, message: '维修已完成' } as ApiResponse);
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message } as ApiResponse);
    }
  }

  async cancelMaintenance(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const record = await maintenanceService.cancelMaintenance(Number(id));
      res.json({ success: true, data: record, message: '工单已取消' } as ApiResponse);
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message } as ApiResponse);
    }
  }

  async getTimeline(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const timeline = await maintenanceService.getTimeline(Number(id));
      res.json({ success: true, data: timeline } as ApiResponse);
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message } as ApiResponse);
    }
  }

  async getReminderRules(req: Request, res: Response) {
    try {
      const { deviceId } = req.query;
      const rules = await maintenanceService.getReminderRules(
        deviceId ? Number(deviceId) : undefined
      );
      res.json({ success: true, data: rules } as ApiResponse);
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message } as ApiResponse);
    }
  }

  async createReminderRule(req: Request, res: Response) {
    try {
      const rule = await maintenanceService.createReminderRule(req.body);
      res.status(201).json({ success: true, data: rule, message: '提醒规则创建成功' } as ApiResponse);
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message } as ApiResponse);
    }
  }

  async generateMaintenanceOrders(req: Request, res: Response) {
    try {
      const records = await maintenanceService.generateMaintenanceOrders();
      res.json({
        success: true,
        data: records,
        message: `已自动生成${records.length}条保养工单`
      } as ApiResponse);
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message } as ApiResponse);
    }
  }
}

export const maintenanceController = new MaintenanceController();
