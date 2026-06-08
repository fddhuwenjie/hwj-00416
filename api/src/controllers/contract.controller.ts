import { Request, Response } from 'express';
import { contractService } from '../services/contract.service.js';
import type { ApiResponse, ContractStatus, ContractSignatureRequest } from '../../../shared/types.js';

export class ContractController {
  async getAllContracts(req: Request, res: Response) {
    try {
      const { status, customerId } = req.query;
      const contracts = await contractService.getAllContracts(
        status as ContractStatus | undefined,
        customerId ? Number(customerId) : undefined
      );
      res.json({ success: true, data: contracts } as ApiResponse);
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message } as ApiResponse);
    }
  }

  async getContractById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const contract = await contractService.getContractById(Number(id));
      if (!contract) {
        return res.status(404).json({ success: false, error: '合同不存在' } as ApiResponse);
      }
      res.json({ success: true, data: contract } as ApiResponse);
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message } as ApiResponse);
    }
  }

  async generateContract(req: Request, res: Response) {
    try {
      const { orderId } = req.params;
      const contract = await contractService.generateContract(Number(orderId));
      res.status(201).json({ success: true, data: contract, message: '合同生成成功' } as ApiResponse);
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message } as ApiResponse);
    }
  }

  async signContract(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const request = req.body as ContractSignatureRequest;
      if (!request.party || !request.signatureData) {
        return res.status(400).json({ success: false, error: '签署方和签名数据不能为空' } as ApiResponse);
      }
      const contract = await contractService.signContract(Number(id), request);
      res.json({ success: true, data: contract, message: '签署成功' } as ApiResponse);
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message } as ApiResponse);
    }
  }

  async terminateContract(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const contract = await contractService.terminateContract(Number(id));
      res.json({ success: true, data: contract, message: '合同已终止' } as ApiResponse);
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message } as ApiResponse);
    }
  }

  async downloadContractHtml(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const htmlContent = await contractService.downloadContractHtml(Number(id));
      const contract = await contractService.getContractById(Number(id));
      if (!contract) {
        return res.status(404).json({ success: false, error: '合同不存在' } as ApiResponse);
      }
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="contract-${contract.contractNo}.html"`);
      res.send(htmlContent);
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message } as ApiResponse);
    }
  }
}

export const contractController = new ContractController();
