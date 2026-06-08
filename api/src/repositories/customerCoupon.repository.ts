import { db } from '../db/connection.js';
import { BaseRepository } from './base.js';
import type { CustomerCoupon, Coupon } from '../../../shared/types.js';

export class CustomerCouponRepository extends BaseRepository<CustomerCoupon> {
  protected tableName = 'customer_coupons';

  protected mapRow(row: Record<string, unknown>): CustomerCoupon {
    return {
      id: row.id as number,
      customerId: row.customer_id as number,
      couponId: row.coupon_id as number,
      isUsed: row.is_used as boolean,
      usedAt: row.used_at as string | undefined,
      orderId: row.order_id as number | undefined,
      createdAt: row.created_at as string,
    };
  }

  private mapCouponRow(row: Record<string, unknown>): Coupon {
    return {
      id: row.coupon_id as number,
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
      createdAt: row.coupon_created_at as string,
    };
  }

  findByCustomerId(customerId: number): (CustomerCoupon & { coupon?: Coupon })[] {
    const rows = db.prepare(`
      SELECT cc.*,
             c.id as coupon_id, c.code, c.name, c.type, c.value, c.min_order_amount,
             c.valid_from, c.valid_to, c.status, c.total_quantity, c.used_quantity,
             c.description, c.created_at as coupon_created_at
      FROM customer_coupons cc
      LEFT JOIN coupons c ON cc.coupon_id = c.id
      WHERE cc.customer_id = ?
      ORDER BY cc.id DESC
    `).all(customerId) as Record<string, unknown>[];

    return rows.map(row => {
      const customerCoupon = this.mapRow(row);
      const coupon = row.coupon_id ? this.mapCouponRow(row) : undefined;
      return { ...customerCoupon, coupon };
    });
  }

  findAvailable(customerId: number): (CustomerCoupon & { coupon?: Coupon })[] {
    const rows = db.prepare(`
      SELECT cc.*,
             c.id as coupon_id, c.code, c.name, c.type, c.value, c.min_order_amount,
             c.valid_from, c.valid_to, c.status, c.total_quantity, c.used_quantity,
             c.description, c.created_at as coupon_created_at
      FROM customer_coupons cc
      LEFT JOIN coupons c ON cc.coupon_id = c.id
      WHERE cc.customer_id = ?
        AND cc.is_used = 0
        AND c.status = 'active'
        AND c.valid_from <= DATE('now')
        AND c.valid_to >= DATE('now')
        AND c.used_quantity < c.total_quantity
      ORDER BY cc.id DESC
    `).all(customerId) as Record<string, unknown>[];

    return rows.map(row => {
      const customerCoupon = this.mapRow(row);
      const coupon = row.coupon_id ? this.mapCouponRow(row) : undefined;
      return { ...customerCoupon, coupon };
    });
  }

  findByCustomerAndCoupon(customerId: number, couponId: number): (CustomerCoupon & { coupon?: Coupon }) | null {
    const row = db.prepare(`
      SELECT cc.*,
             c.id as coupon_id, c.code, c.name, c.type, c.value, c.min_order_amount,
             c.valid_from, c.valid_to, c.status, c.total_quantity, c.used_quantity,
             c.description, c.created_at as coupon_created_at
      FROM customer_coupons cc
      LEFT JOIN coupons c ON cc.coupon_id = c.id
      WHERE cc.customer_id = ? AND cc.coupon_id = ? AND cc.is_used = 0
      ORDER BY cc.id ASC
      LIMIT 1
    `).get(customerId, couponId) as Record<string, unknown> | undefined;

    if (!row) return null;

    const customerCoupon = this.mapRow(row);
    const coupon = row.coupon_id ? this.mapCouponRow(row) : undefined;
    return { ...customerCoupon, coupon };
  }

  distribute(customerId: number, couponId: number): CustomerCoupon {
    const result = db.prepare(`
      INSERT INTO customer_coupons (customer_id, coupon_id, is_used)
      VALUES (?, ?, 0)
    `).run(customerId, couponId);

    return this.findById(Number(result.lastInsertRowid))!;
  }

  markUsed(id: number, orderId: number): CustomerCoupon | null {
    db.prepare(`
      UPDATE customer_coupons
      SET is_used = 1, used_at = DATETIME('now'), order_id = ?
      WHERE id = ?
    `).run(orderId, id);
    return this.findById(id);
  }
}

export const customerCouponRepository = new CustomerCouponRepository();
