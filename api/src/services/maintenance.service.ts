import { maintenanceRepository } from '../repositories/maintenance.repository.js';
import { deviceRepository } from '../repositories/device.repository.js';
import type {
  MaintenanceRecord,
  MaintenanceStatus,
  MaintenanceType,
  MaintenanceTimelineItem,
  MaintenanceReminderRule,
  CreateMaintenanceRequest,
  AssignMaintenanceRequest,
  CompleteMaintenanceRequest,
} from '../../../shared/types.js';

export class MaintenanceService {
  async getAllRecords(
    deviceId?: number,
    status?: MaintenanceStatus,
    type?: MaintenanceType
  ): Promise<MaintenanceRecord[]> {
    return maintenanceRepository.findAllWithDetails(deviceId, status, type);
  }

  async getRecordById(id: number): Promise<MaintenanceRecord | null> {
    return maintenanceRepository.findById(id);
  }

  async createRecord(request: CreateMaintenanceRequest): Promise<MaintenanceRecord> {
    const device = deviceRepository.findById(request.deviceId);
    if (!device) {
      throw new Error(`设备ID ${request.deviceId} 不存在`);
    }

    const record = maintenanceRepository.create({
      ...request,
      status: 'pending',
    });

    maintenanceRepository.addTimelineItem(
      record.id,
      'pending',
      `报修单已创建，故障描述：${request.faultDescription}`,
      request.reporterName
    );

    return record;
  }

  async assignMaintenance(
    id: number,
    request: AssignMaintenanceRequest
  ): Promise<MaintenanceRecord | null> {
    const record = maintenanceRepository.findById(id);
    if (!record) {
      throw new Error('维保记录不存在');
    }

    if (record.status !== 'pending') {
      throw new Error('只有待处理状态的工单可以分配');
    }

    const updated = maintenanceRepository.update(id, {
      status: 'assigned',
      assignedTo: request.assignedTo,
      estimatedRepairDate: request.estimatedRepairDate,
    });

    maintenanceRepository.addTimelineItem(
      id,
      'assigned',
      `工单已分配给 ${request.assignedTo}，预计维修日期：${request.estimatedRepairDate}`
    );

    return updated;
  }

  async startMaintenance(id: number): Promise<MaintenanceRecord | null> {
    const record = maintenanceRepository.findById(id);
    if (!record) {
      throw new Error('维保记录不存在');
    }

    if (record.status !== 'assigned') {
      throw new Error('只有已分配状态的工单可以开始维修');
    }

    deviceRepository.update(record.deviceId, { status: 'maintenance' });

    const updated = maintenanceRepository.update(id, {
      status: 'in_progress',
    });

    maintenanceRepository.addTimelineItem(
      id,
      'in_progress',
      '维修人员已开始维修工作'
    );

    return updated;
  }

  async completeMaintenance(
    id: number,
    request: CompleteMaintenanceRequest
  ): Promise<MaintenanceRecord | null> {
    const record = maintenanceRepository.findById(id);
    if (!record) {
      throw new Error('维保记录不存在');
    }

    if (record.status !== 'in_progress') {
      throw new Error('只有进行中的工单可以完成');
    }

    const updated = maintenanceRepository.update(id, {
      status: 'completed',
      actualCost: request.actualCost,
      replacedParts: request.replacedParts,
      beforePhotoUrl: request.beforePhotoUrl,
      afterPhotoUrl: request.afterPhotoUrl,
      repairNotes: request.repairNotes,
      completedAt: new Date().toISOString(),
    });

    deviceRepository.update(record.deviceId, { status: 'available' });

    maintenanceRepository.addTimelineItem(
      id,
      'completed',
      `维修已完成，费用：${request.actualCost}元，更换部件：${request.replacedParts}`
    );

    return updated;
  }

  async cancelMaintenance(id: number): Promise<MaintenanceRecord | null> {
    const record = maintenanceRepository.findById(id);
    if (!record) {
      throw new Error('维保记录不存在');
    }

    if (record.status === 'completed' || record.status === 'cancelled') {
      throw new Error('该工单状态不允许取消');
    }

    if (record.status === 'in_progress') {
      deviceRepository.update(record.deviceId, { status: 'available' });
    }

    const updated = maintenanceRepository.update(id, {
      status: 'cancelled',
    });

    maintenanceRepository.addTimelineItem(
      id,
      'cancelled',
      '工单已取消'
    );

    return updated;
  }

  async getTimeline(id: number): Promise<MaintenanceTimelineItem[]> {
    const record = maintenanceRepository.findById(id);
    if (!record) {
      throw new Error('维保记录不存在');
    }

    return maintenanceRepository.getTimeline(id);
  }

  async getReminderRules(deviceId?: number): Promise<MaintenanceReminderRule[]> {
    return maintenanceRepository.findReminderRules(deviceId);
  }

  async createReminderRule(
    data: Omit<MaintenanceReminderRule, 'id' | 'createdAt'>
  ): Promise<MaintenanceReminderRule> {
    const device = deviceRepository.findById(data.deviceId);
    if (!device) {
      throw new Error(`设备ID ${data.deviceId} 不存在`);
    }

    return maintenanceRepository.createReminderRule(data);
  }

  async generateMaintenanceOrders(): Promise<MaintenanceRecord[]> {
    return maintenanceRepository.checkAndGenerateMaintenance();
  }
}

export const maintenanceService = new MaintenanceService();
