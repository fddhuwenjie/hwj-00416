import { Request, Response } from 'express';
import { packageService } from '../services/package.service.js';
import type { ApiResponse, PackageStatus } from '../../../shared/types.js';

export class PackageController {
  async getAllPackages(req: Request, res: Response) {
    try {
      const { status } = req.query;
      const packages = await packageService.getAllPackages(
        status as PackageStatus | undefined
      );
      res.json({ success: true, data: packages } as ApiResponse);
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message } as ApiResponse);
    }
  }

  async getPackageById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const pkg = await packageService.getPackageById(Number(id));
      if (!pkg) {
        return res.status(404).json({ success: false, error: '套餐不存在' } as ApiResponse);
      }
      res.json({ success: true, data: pkg } as ApiResponse);
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message } as ApiResponse);
    }
  }

  async createPackage(req: Request, res: Response) {
    try {
      const pkg = await packageService.createPackage(req.body);
      res.status(201).json({ success: true, data: pkg, message: '套餐创建成功' } as ApiResponse);
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message } as ApiResponse);
    }
  }

  async updatePackage(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const pkg = await packageService.updatePackage(Number(id), req.body);
      res.json({ success: true, data: pkg, message: '套餐更新成功' } as ApiResponse);
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message } as ApiResponse);
    }
  }

  async togglePackageStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const pkg = await packageService.togglePackageStatus(Number(id));
      res.json({ success: true, data: pkg, message: '套餐状态更新成功' } as ApiResponse);
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message } as ApiResponse);
    }
  }
}

export const packageController = new PackageController();
