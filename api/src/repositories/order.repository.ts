import { db } from '../db/connection.js';
import { BaseRepository } from './base.js';
import type { Order, OrderItem } from '../../../shared/types.js';

export class OrderRepository extends BaseRepository<Order> {
  protected tableName = 'orders';

  protected mapRow(row: Record<string, unknown>): Order {
    return {
      id: row.id as number,
      orderNo: row.order_no as string,
      customerId: row.customer_id as number,
      customerName: row.customer_name as string,
      customerPhone: row.customer_phone as string,
      startDate: row.start_date as string,
      endDate: row.end_date as string,
      actualReturnDate: row.actual_return_date as string | undefined,
      totalRent: row.total_rent as number,
      totalDeposit: row.total_deposit as number,
      lateFee: row.late_fee as number,
      repairFee: row.repair_fee as number,
      finalAmount: row.final_amount as number | undefined,
      status: row.status as Order['status'],
      remarks: row.remarks as string | undefined,
      createdAt: row.created_at as string,
    };
  }

  private mapOrderItemRow(row: Record<string, unknown>): OrderItem {
    return {
      id: row.id as number,
      orderId: row.order_id as number,
      deviceId: row.device_id as number,
      deviceName: row.device_name as string,
      quantity: row.quantity as number,
      dailyRate: row.daily_rate as number,
      depositPerUnit: row.deposit_per_unit as number,
      days: row.days as number,
      subtotal: row.subtotal as number,
      deviceStatus: row.device_status as OrderItem['deviceStatus'],
      repairNote: row.repair_note as string | undefined,
      repairFee: row.repair_fee as number | undefined,
    };
  }

  findAllWithDetails(status?: Order['status']): Order[] {
    let sql = `
      SELECT o.*, c.name as customer_name, c.phone as customer_phone
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
    `;
    const params: unknown[] = [];

    if (status) {
      sql += ' WHERE o.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY o.id DESC';

    const rows = db.prepare(sql).all(...params) as Record<string, unknown>[];
    return rows.map(row => this.mapRow(row));
  }

  findByIdWithDetails(id: number): (Order & { items: OrderItem[] }) | null {
    const row = db.prepare(`
      SELECT o.*, c.name as customer_name, c.phone as customer_phone
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.id = ?
    `).get(id) as Record<string, unknown> | undefined;

    if (!row) return null;

    const order = this.mapRow(row);
    const items = this.findOrderItems(id);

    return { ...order, items };
  }

  findByCustomerId(customerId: number): Order[] {
    const rows = db.prepare(`
      SELECT o.*, c.name as customer_name, c.phone as customer_phone
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.customer_id = ?
      ORDER BY o.id DESC
    `).all(customerId) as Record<string, unknown>[];
    return rows.map(row => this.mapRow(row));
  }

  findOrderItems(orderId: number): OrderItem[] {
    const rows = db.prepare(`
      SELECT oi.*, d.name as device_name
      FROM order_items oi
      LEFT JOIN devices d ON oi.device_id = d.id
      WHERE oi.order_id = ?
    `).all(orderId) as Record<string, unknown>[];
    return rows.map(row => this.mapOrderItemRow(row));
  }

  findBookings(startDate: string, endDate: string): Array<Order & { items: OrderItem[] }> {
    const rows = db.prepare(`
      SELECT o.*, c.name as customer_name, c.phone as customer_phone
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.status IN ('pending', 'out', 'in_use', 'overdue')
        AND o.start_date <= ?
        AND o.end_date >= ?
      ORDER BY o.start_date
    `).all(endDate, startDate) as Record<string, unknown>[];

    return rows.map(row => {
      const order = this.mapRow(row);
      const items = this.findOrderItems(order.id);
      return { ...order, items };
    });
  }

  create(orderData: Omit<Order, 'id' | 'createdAt' | 'items'>, items: Omit<OrderItem, 'id' | 'orderId'>[]): Order & { items: OrderItem[] } {
    const insertOrder = db.prepare(`
      INSERT INTO orders (order_no, customer_id, start_date, end_date, total_rent, total_deposit, status, remarks)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertItem = db.prepare(`
      INSERT INTO order_items (order_id, device_id, quantity, daily_rate, deposit_per_unit, days, subtotal)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const tx = db.transaction(() => {
      const result = insertOrder.run(
        orderData.orderNo,
        orderData.customerId,
        orderData.startDate,
        orderData.endDate,
        orderData.totalRent,
        orderData.totalDeposit,
        orderData.status,
        orderData.remarks ?? null
      );

      const orderId = Number(result.lastInsertRowid);

      items.forEach(item => {
        insertItem.run(
          orderId,
          item.deviceId,
          item.quantity,
          item.dailyRate,
          item.depositPerUnit,
          item.days,
          item.subtotal
        );
      });

      return orderId;
    });

    const orderId = tx();
    return this.findByIdWithDetails(orderId)!;
  }

  updateStatus(id: number, status: Order['status']): Order | null {
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, id);
    return this.findById(id);
  }

  processReturn(
    id: number,
    actualReturnDate: string,
    lateFee: number,
    repairFee: number,
    finalAmount: number,
    items: Array<{ orderItemId: number; deviceStatus: OrderItem['deviceStatus']; repairNote?: string; repairFee?: number }>
  ): Order & { items: OrderItem[] } {
    const tx = db.transaction(() => {
      db.prepare(`
        UPDATE orders
        SET actual_return_date = ?, late_fee = ?, repair_fee = ?, final_amount = ?, status = 'returned'
        WHERE id = ?
      `).run(actualReturnDate, lateFee, repairFee, finalAmount, id);

      const updateItem = db.prepare(`
        UPDATE order_items
        SET device_status = ?, repair_note = ?, repair_fee = ?
        WHERE id = ?
      `);

      items.forEach(item => {
        updateItem.run(
          item.deviceStatus,
          item.repairNote ?? null,
          item.repairFee ?? 0,
          item.orderItemId
        );
      });
    });

    tx();
    return this.findByIdWithDetails(id)!;
  }
}

export const orderRepository = new OrderRepository();
