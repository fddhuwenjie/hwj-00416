import { db } from '../db/connection.js';
import { BaseRepository } from './base.js';
import type { Customer } from '../../../shared/types.js';

export class CustomerRepository extends BaseRepository<Customer> {
  protected tableName = 'customers';

  protected mapRow(row: Record<string, unknown>): Customer {
    return {
      id: row.id as number,
      name: row.name as string,
      phone: row.phone as string,
      idCard: row.id_card as string | undefined,
      creditScore: row.credit_score as number,
      totalSpent: row.total_spent as number,
      isBlacklisted: Boolean(row.is_blacklisted),
      vipLevel: row.vip_level as Customer['vipLevel'],
      createdAt: row.created_at as string,
    };
  }

  findByPhone(phone: string): Customer | null {
    const row = db.prepare(`SELECT * FROM customers WHERE phone = ?`).get(phone) as Record<string, unknown> | undefined;
    return row ? this.mapRow(row) : null;
  }

  search(query: string): Customer[] {
    const rows = db.prepare(`
      SELECT * FROM customers
      WHERE name LIKE ? OR phone LIKE ?
      ORDER BY id DESC
    `).all(`%${query}%`, `%${query}%`) as Record<string, unknown>[];
    return rows.map(row => this.mapRow(row));
  }

  create(data: Omit<Customer, 'id' | 'createdAt'>): Customer {
    const result = db.prepare(`
      INSERT INTO customers (name, phone, id_card, credit_score, total_spent, is_blacklisted, vip_level)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.name,
      data.phone,
      data.idCard ?? null,
      data.creditScore,
      data.totalSpent,
      data.isBlacklisted ? 1 : 0,
      data.vipLevel
    );
    return this.findById(Number(result.lastInsertRowid))!;
  }

  update(id: number, data: Partial<Omit<Customer, 'id' | 'createdAt'>>): Customer | null {
    const fields: string[] = [];
    const values: unknown[] = [];

    const fieldMap: Record<string, string> = {
      name: 'name',
      phone: 'phone',
      idCard: 'id_card',
      creditScore: 'credit_score',
      totalSpent: 'total_spent',
      isBlacklisted: 'is_blacklisted',
      vipLevel: 'vip_level',
    };

    Object.entries(data).forEach(([key, value]) => {
      const dbField = fieldMap[key];
      if (dbField && value !== undefined) {
        fields.push(`${dbField} = ?`);
        values.push(key === 'isBlacklisted' ? (value ? 1 : 0) : value);
      }
    });

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    db.prepare(`UPDATE customers SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return this.findById(id);
  }

  updateVipLevel(id: number): void {
    const customer = this.findById(id);
    if (!customer) return;

    let vipLevel: Customer['vipLevel'] = 'normal';
    if (customer.totalSpent >= 50000) {
      vipLevel = 'svip';
    } else if (customer.totalSpent >= 10000) {
      vipLevel = 'vip';
    }

    if (vipLevel !== customer.vipLevel) {
      db.prepare('UPDATE customers SET vip_level = ? WHERE id = ?').run(vipLevel, id);
    }
  }
}

export const customerRepository = new CustomerRepository();
