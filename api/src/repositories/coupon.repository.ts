import { db } from '../db/connection.js';
import { BaseRepository } from './base.js';
import type { Coupon } from '../../../shared/types.js';

export class CouponRepository extends BaseRepository<Coupon> {
  protected tableName = 'coupons';

  protected mapRow(row: Record<string, unknown>): Coupon {
    return {
      id: row.id as number,
      code: row.code as string,
      name: row.name as string,
      type: row.type as Coupon['type'],
      value: row.value as number,
      minOrderAmount: row.min_order_amount as number,
      validFrom: row.valid_from as string,
      validTo: row.valid_to as string,
      status: row.status as Coupon['status'],
      totalQuantity: row.total_quantity as number,
      usedQuantity: row.used_quantity as number,
      description: row.description as string | undefined,
      createdAt: row.created_at as string,
    };
  }

  findAll(): Coupon[] {
    const rows = db.prepare(`
      SELECT c.*
      FROM coupons c
      ORDER BY c.id DESC
    `).all() as Record<string, unknown>[];
    return rows.map(row => this.mapRow(row));
  }

  findByCode(code: string): Coupon | null {
    const row = db.prepare(`
      SELECT c.*
      FROM coupons c
      WHERE c.code = ?
    `).get(code) as Record<string, unknown> | undefined;
    return row ? this.mapRow(row) : null;
  }

  findActive(): Coupon[] {
    const rows = db.prepare(`
      SELECT c.*
      FROM coupons c
      WHERE c.status = 'active'
        AND c.valid_from <= DATE('now')
        AND c.valid_to >= DATE('now')
        AND c.used_quantity < c.total_quantity
      ORDER BY c.id DESC
    `).all() as Record<string, unknown>[];
    return rows.map(row => this.mapRow(row));
  }

  create(data: Omit<Coupon, 'id' | 'createdAt' | 'usedQuantity'>): Coupon {
    const result = db.prepare(`
      INSERT INTO coupons (code, name, type, value, min_order_amount, valid_from, valid_to, status, total_quantity, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.code,
      data.name,
      data.type,
      data.value,
      data.minOrderAmount,
      data.validFrom,
      data.validTo,
      data.status,
      data.totalQuantity,
      data.description ?? null
    );
    return this.findById(Number(result.lastInsertRowid))!;
  }

  update(id: number, data: Partial<Omit<Coupon, 'id' | 'createdAt' | 'code' | 'usedQuantity'>>): Coupon | null {
    const fields: string[] = [];
    const values: unknown[] = [];

    const fieldMap: Record<string, string> = {
      name: 'name',
      type: 'type',
      value: 'value',
      minOrderAmount: 'min_order_amount',
      validFrom: 'valid_from',
      validTo: 'valid_to',
      status: 'status',
      totalQuantity: 'total_quantity',
      description: 'description',
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
    db.prepare(`UPDATE coupons SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return this.findById(id);
  }

  toggleStatus(id: number): Coupon | null {
    db.prepare(`
      UPDATE coupons 
      SET status = CASE WHEN status = 'active' THEN 'inactive' ELSE 'active' END 
      WHERE id = ?
    `).run(id);
    return this.findById(id);
  }

  incrementUsed(id: number): boolean {
    const result = db.prepare(`
      UPDATE coupons 
      SET used_quantity = used_quantity + 1 
      WHERE id = ? AND used_quantity < total_quantity
    `).run(id);
    return result.changes > 0;
  }
}

export const couponRepository = new CouponRepository();
