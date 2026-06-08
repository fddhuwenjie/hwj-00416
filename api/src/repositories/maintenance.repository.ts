import { db } from '../db/connection.js';
import { BaseRepository } from './base.js';
import type {
  MaintenanceRecord,
  MaintenanceTimelineItem,
  MaintenanceReminderRule,
  MaintenanceStatus,
  MaintenanceType,
} from '../../../shared/types.js';

export class MaintenanceRepository extends BaseRepository<MaintenanceRecord> {
  protected tableName = 'maintenance_records';

  protected mapRow(row: Record<string, unknown>): MaintenanceRecord {
    return {
      id: row.id as number,
      deviceId: row.device_id as number,
      deviceName: row.device_name as string | undefined,
      type: row.type as MaintenanceType,
      status: row.status as MaintenanceStatus,
      priority: row.priority as MaintenanceRecord['priority'],
      reporterName: row.reporter_name as string,
      faultDescription: row.fault_description as string,
      photoUrl: row.photo_url as string | undefined,
      beforePhotoUrl: row.before_photo_url as string | undefined,
      afterPhotoUrl: row.after_photo_url as string | undefined,
      assignedTo: row.assigned_to as string | undefined,
      estimatedRepairDate: row.estimated_repair_date as string | undefined,
      actualCost: row.actual_cost as number | undefined,
      replacedParts: row.replaced_parts as string | undefined,
      repairNotes: row.repair_notes as string | undefined,
      completedAt: row.completed_at as string | undefined,
      createdAt: row.created_at as string,
    };
  }

  private mapTimelineRow(row: Record<string, unknown>): MaintenanceTimelineItem {
    return {
      id: row.id as number,
      maintenanceId: row.maintenance_id as number,
      status: row.status as MaintenanceStatus,
      description: row.description as string,
      createdAt: row.created_at as string,
      operator: row.operator as string | undefined,
    };
  }

  private mapReminderRuleRow(row: Record<string, unknown>): MaintenanceReminderRule {
    return {
      id: row.id as number,
      deviceId: row.device_id as number,
      deviceName: row.device_name as string | undefined,
      ruleType: row.rule_type as 'rental_days' | 'fixed_period',
      thresholdDays: row.threshold_days as number,
      lastReminderDate: row.last_reminder_date as string | undefined,
      nextMaintenanceDate: row.next_maintenance_date as string | undefined,
      isActive: row.is_active as boolean,
      createdAt: row.created_at as string,
    };
  }

  findAllWithDetails(
    deviceId?: number,
    status?: MaintenanceStatus,
    type?: MaintenanceType
  ): MaintenanceRecord[] {
    let sql = `
      SELECT mr.*, d.name as device_name
      FROM maintenance_records mr
      LEFT JOIN devices d ON mr.device_id = d.id
    `;
    const params: unknown[] = [];
    const conditions: string[] = [];

    if (deviceId) {
      conditions.push('mr.device_id = ?');
      params.push(deviceId);
    }
    if (status) {
      conditions.push('mr.status = ?');
      params.push(status);
    }
    if (type) {
      conditions.push('mr.type = ?');
      params.push(type);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY mr.id DESC';

    const rows = db.prepare(sql).all(...params) as Record<string, unknown>[];
    return rows.map(row => this.mapRow(row));
  }

  findByDeviceId(deviceId: number): MaintenanceRecord[] {
    const rows = db.prepare(`
      SELECT mr.*, d.name as device_name
      FROM maintenance_records mr
      LEFT JOIN devices d ON mr.device_id = d.id
      WHERE mr.device_id = ?
      ORDER BY mr.id DESC
    `).all(deviceId) as Record<string, unknown>[];
    return rows.map(row => this.mapRow(row));
  }

  findByStatus(status: MaintenanceStatus): MaintenanceRecord[] {
    const rows = db.prepare(`
      SELECT mr.*, d.name as device_name
      FROM maintenance_records mr
      LEFT JOIN devices d ON mr.device_id = d.id
      WHERE mr.status = ?
      ORDER BY mr.id DESC
    `).all(status) as Record<string, unknown>[];
    return rows.map(row => this.mapRow(row));
  }

  create(data: Omit<MaintenanceRecord, 'id' | 'createdAt'>): MaintenanceRecord {
    const result = db.prepare(`
      INSERT INTO maintenance_records (
        device_id, type, status, priority, reporter_name, fault_description, photo_url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.deviceId,
      data.type,
      data.status,
      data.priority,
      data.reporterName,
      data.faultDescription,
      data.photoUrl ?? null
    );

    const id = Number(result.lastInsertRowid);
    return this.findById(id)!;
  }

  update(id: number, data: Partial<MaintenanceRecord>): MaintenanceRecord | null {
    const fields: string[] = [];
    const params: unknown[] = [];

    if (data.status) {
      fields.push('status = ?');
      params.push(data.status);
    }
    if (data.assignedTo) {
      fields.push('assigned_to = ?');
      params.push(data.assignedTo);
    }
    if (data.estimatedRepairDate) {
      fields.push('estimated_repair_date = ?');
      params.push(data.estimatedRepairDate);
    }
    if (data.actualCost !== undefined) {
      fields.push('actual_cost = ?');
      params.push(data.actualCost);
    }
    if (data.replacedParts) {
      fields.push('replaced_parts = ?');
      params.push(data.replacedParts);
    }
    if (data.beforePhotoUrl) {
      fields.push('before_photo_url = ?');
      params.push(data.beforePhotoUrl);
    }
    if (data.afterPhotoUrl) {
      fields.push('after_photo_url = ?');
      params.push(data.afterPhotoUrl);
    }
    if (data.repairNotes) {
      fields.push('repair_notes = ?');
      params.push(data.repairNotes);
    }
    if (data.completedAt) {
      fields.push('completed_at = ?');
      params.push(data.completedAt);
    }

    params.push(id);

    db.prepare(`UPDATE maintenance_records SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    return this.findById(id);
  }

  addTimelineItem(
    maintenanceId: number,
    status: MaintenanceStatus,
    description: string,
    operator?: string
  ): MaintenanceTimelineItem {
    const result = db.prepare(`
      INSERT INTO maintenance_timeline (maintenance_id, status, description, operator)
      VALUES (?, ?, ?, ?)
    `).run(maintenanceId, status, description, operator ?? null);

    const id = Number(result.lastInsertRowid);
    const row = db.prepare('SELECT * FROM maintenance_timeline WHERE id = ?').get(id) as Record<string, unknown>;
    return this.mapTimelineRow(row);
  }

  getTimeline(maintenanceId: number): MaintenanceTimelineItem[] {
    const rows = db.prepare(`
      SELECT * FROM maintenance_timeline
      WHERE maintenance_id = ?
      ORDER BY id ASC
    `).all(maintenanceId) as Record<string, unknown>[];
    return rows.map(row => this.mapTimelineRow(row));
  }

  findReminderRules(deviceId?: number): MaintenanceReminderRule[] {
    let sql = `
      SELECT mrr.*, d.name as device_name
      FROM maintenance_reminder_rules mrr
      LEFT JOIN devices d ON mrr.device_id = d.id
    `;
    const params: unknown[] = [];

    if (deviceId) {
      sql += ' WHERE mrr.device_id = ?';
      params.push(deviceId);
    }

    sql += ' ORDER BY mrr.id DESC';

    const rows = db.prepare(sql).all(...params) as Record<string, unknown>[];
    return rows.map(row => this.mapReminderRuleRow(row));
  }

  createReminderRule(data: Omit<MaintenanceReminderRule, 'id' | 'createdAt'>): MaintenanceReminderRule {
    const result = db.prepare(`
      INSERT INTO maintenance_reminder_rules (
        device_id, rule_type, threshold_days, last_reminder_date, next_maintenance_date, is_active)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      data.deviceId,
      data.ruleType,
      data.thresholdDays,
      data.lastReminderDate ?? null,
      data.nextMaintenanceDate ?? null,
      data.isActive
    );

    const id = Number(result.lastInsertRowid);
    const row = db.prepare(`
      SELECT mrr.*, d.name as device_name
      FROM maintenance_reminder_rules mrr
      LEFT JOIN devices d ON mrr.device_id = d.id
      WHERE mrr.id = ?
    `).get(id) as Record<string, unknown>;
    return this.mapReminderRuleRow(row);
  }

  checkAndGenerateMaintenance(): MaintenanceRecord[] {
    const rules = this.findReminderRules();
    const generatedRecords: MaintenanceRecord[] = [];

    const tx = db.transaction(() => {
      for (const rule of rules) {
        if (!rule.isActive) continue;

        const totalDays = this.getDeviceTotalRentalDays(rule.deviceId);
        const shouldGenerate = rule.ruleType === 'rental_days'
          ? totalDays >= rule.thresholdDays
          : true;

        if (shouldGenerate) {
          const existingPending = db.prepare(`
            SELECT COUNT(*) as count
            FROM maintenance_records
            WHERE device_id = ? AND status IN ('pending', 'assigned', 'in_progress')
          `).get(rule.deviceId) as { count: number };

          if (existingPending.count > 0) continue;

          const device = db.prepare('SELECT name FROM devices WHERE id = ?').get(rule.deviceId) as { name: string };

          const result = db.prepare(`
            INSERT INTO maintenance_records (
              device_id, type, status, priority, reporter_name, fault_description)
            VALUES (?, 'maintenance', 'pending', 'medium', '系统自动', ?)
          `).run(
            rule.deviceId,
            `设备累计租赁天数已达${totalDays}天，需进行定期保养`
          );

          const recordId = Number(result.lastInsertRowid);

          db.prepare(`
            UPDATE maintenance_reminder_rules
            SET last_reminder_date = DATE('now')
            WHERE id = ?
          `).run(rule.id);

          const record = db.prepare(`
            SELECT mr.*, d.name as device_name
            FROM maintenance_records mr
            LEFT JOIN devices d ON mr.device_id = d.id
            WHERE mr.id = ?
          `).get(recordId) as Record<string, unknown>;

          generatedRecords.push(this.mapRow(record));
        }
      }
    });

    tx();
    return generatedRecords;
  }

  getDeviceTotalRentalDays(deviceId: number): number {
    const row = db.prepare(`
      SELECT COALESCE(SUM(
        CASE
          WHEN o.actual_return_date IS NOT NULL
          THEN CAST(JULIANDAY(o.actual_return_date) - JULIANDAY(o.start_date) AS INTEGER)
          ELSE CAST(JULIANDAY('now') - JULIANDAY(o.start_date) AS INTEGER)
        END
      ), 0) as total_days
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      WHERE oi.device_id = ?
        AND o.status IN ('returned', 'in_use', 'overdue')
    `).get(deviceId) as { total_days: number };

    return Math.floor(row.total_days);
  }
}

export const maintenanceRepository = new MaintenanceRepository();
