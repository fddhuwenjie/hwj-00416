import { db } from '../db/connection.js';
import { BaseRepository } from './base.js';
import type { Device } from '../../../shared/types.js';

export class DeviceRepository extends BaseRepository<Device> {
  protected tableName = 'devices';

  protected mapRow(row: Record<string, unknown>): Device {
    return {
      id: row.id as number,
      name: row.name as string,
      categoryId: row.category_id as number,
      categoryName: row.category_name as string,
      categoryCode: row.category_code as string,
      brandModel: row.brand_model as string,
      dailyRate: row.daily_rate as number,
      deposit: row.deposit as number,
      stock: row.stock as number,
      status: row.status as Device['status'],
      photoUrl: row.photo_url as string | undefined,
      barcode: row.barcode as string | undefined,
      createdAt: row.created_at as string,
    };
  }

  findAllWithCategory(): Device[] {
    const rows = db.prepare(`
      SELECT d.*, c.name as category_name, c.code as category_code
      FROM devices d
      LEFT JOIN categories c ON d.category_id = c.id
      ORDER BY d.id DESC
    `).all() as Record<string, unknown>[];
    return rows.map(row => this.mapRow(row));
  }

  findByCategory(categoryId: number): Device[] {
    const rows = db.prepare(`
      SELECT d.*, c.name as category_name, c.code as category_code
      FROM devices d
      LEFT JOIN categories c ON d.category_id = c.id
      WHERE d.category_id = ?
      ORDER BY d.id DESC
    `).all(categoryId) as Record<string, unknown>[];
    return rows.map(row => this.mapRow(row));
  }

  findAvailable(): Device[] {
    const rows = db.prepare(`
      SELECT d.*, c.name as category_name, c.code as category_code
      FROM devices d
      LEFT JOIN categories c ON d.category_id = c.id
      WHERE d.status = 'available' AND d.stock > 0
      ORDER BY d.id DESC
    `).all() as Record<string, unknown>[];
    return rows.map(row => this.mapRow(row));
  }

  findLowStock(threshold: number = 2): Device[] {
    const rows = db.prepare(`
      SELECT d.*, c.name as category_name, c.code as category_code
      FROM devices d
      LEFT JOIN categories c ON d.category_id = c.id
      WHERE d.stock <= ? AND d.status = 'available'
      ORDER BY d.stock ASC
    `).all(threshold) as Record<string, unknown>[];
    return rows.map(row => this.mapRow(row));
  }

  create(data: Omit<Device, 'id' | 'createdAt'>): Device {
    const result = db.prepare(`
      INSERT INTO devices (name, category_id, brand_model, daily_rate, deposit, stock, status, photo_url, barcode)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.name,
      data.categoryId,
      data.brandModel,
      data.dailyRate,
      data.deposit,
      data.stock,
      data.status,
      data.photoUrl ?? null,
      data.barcode ?? null
    );
    return this.findById(Number(result.lastInsertRowid))!;
  }

  update(id: number, data: Partial<Omit<Device, 'id' | 'createdAt'>>): Device | null {
    const fields: string[] = [];
    const values: unknown[] = [];

    const fieldMap: Record<string, string> = {
      name: 'name',
      categoryId: 'category_id',
      brandModel: 'brand_model',
      dailyRate: 'daily_rate',
      deposit: 'deposit',
      stock: 'stock',
      status: 'status',
      photoUrl: 'photo_url',
      barcode: 'barcode',
    };

    Object.entries(data).forEach(([key, value]) => {
      const dbField = fieldMap[key];
      if (dbField && value !== undefined) {
        fields.push(`${dbField} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    db.prepare(`UPDATE devices SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return this.findById(id);
  }

  checkAvailability(deviceId: number, startDate: string, endDate: string): { available: boolean; rented: number; stock: number } {
    const device = this.findById(deviceId);
    if (!device) return { available: false, rented: 0, stock: 0 };

    const rented = db.prepare(`
      SELECT COALESCE(SUM(oi.quantity), 0) as rented
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE oi.device_id = ?
        AND o.status IN ('pending', 'out', 'in_use', 'overdue')
        AND o.start_date <= ?
        AND o.end_date >= ?
    `).get(deviceId, endDate, startDate) as { rented: number };

    return {
      available: device.stock > rented.rented,
      rented: rented.rented,
      stock: device.stock,
    };
  }
}

export const deviceRepository = new DeviceRepository();
