import { db } from '../db/connection.js';
import { BaseRepository } from './base.js';
import type { Contract, ContractStatus } from '../../../shared/types.js';
import dayjs from 'dayjs';

export class ContractRepository extends BaseRepository<Contract> {
  protected tableName = 'contracts';

  protected mapRow(row: Record<string, unknown>): Contract {
    return {
      id: row.id as number,
      orderId: row.order_id as number,
      orderNo: row.order_no as string | undefined,
      customerId: row.customer_id as number,
      customerName: row.customer_name as string | undefined,
      customerPhone: row.customer_phone as string | undefined,
      status: row.status as ContractStatus,
      contractNo: row.contract_no as string,
      content: row.content as string,
      lessorSignature: row.lessor_signature as string | undefined,
      lesseeSignature: row.lessee_signature as string | undefined,
      signedAt: row.signed_at as string | undefined,
      startDate: row.start_date as string,
      endDate: row.end_date as string,
      totalAmount: row.total_amount as number,
      createdAt: row.created_at as string,
    };
  }

  findAllWithDetails(status?: ContractStatus, customerId?: number): Contract[] {
    let sql = `
      SELECT c.*, o.order_no, cu.name as customer_name, cu.phone as customer_phone
      FROM contracts c
      LEFT JOIN orders o ON c.order_id = o.id
      LEFT JOIN customers cu ON c.customer_id = cu.id
    `;
    const params: unknown[] = [];
    const conditions: string[] = [];

    if (status) {
      conditions.push('c.status = ?');
      params.push(status);
    }

    if (customerId) {
      conditions.push('c.customer_id = ?');
      params.push(customerId);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY c.id DESC';

    const rows = db.prepare(sql).all(...params) as Record<string, unknown>[];
    return rows.map(row => this.mapRow(row));
  }

  findByOrderId(orderId: number): Contract | null {
    const row = db.prepare(`
      SELECT c.*, o.order_no, cu.name as customer_name, cu.phone as customer_phone
      FROM contracts c
      LEFT JOIN orders o ON c.order_id = o.id
      LEFT JOIN customers cu ON c.customer_id = cu.id
      WHERE c.order_id = ?
    `).get(orderId) as Record<string, unknown> | undefined;
    return row ? this.mapRow(row) : null;
  }

  findByCustomerId(customerId: number): Contract[] {
    const rows = db.prepare(`
      SELECT c.*, o.order_no, cu.name as customer_name, cu.phone as customer_phone
      FROM contracts c
      LEFT JOIN orders o ON c.order_id = o.id
      LEFT JOIN customers cu ON c.customer_id = cu.id
      WHERE c.customer_id = ?
      ORDER BY c.id DESC
    `).all(customerId) as Record<string, unknown>[];
    return rows.map(row => this.mapRow(row));
  }

  findByStatus(status: ContractStatus): Contract[] {
    const rows = db.prepare(`
      SELECT c.*, o.order_no, cu.name as customer_name, cu.phone as customer_phone
      FROM contracts c
      LEFT JOIN orders o ON c.order_id = o.id
      LEFT JOIN customers cu ON c.customer_id = cu.id
      WHERE c.status = ?
      ORDER BY c.id DESC
    `).all(status) as Record<string, unknown>[];
    return rows.map(row => this.mapRow(row));
  }

  create(contractData: Omit<Contract, 'id' | 'createdAt' | 'orderNo' | 'customerName' | 'customerPhone'>): Contract {
    const result = db.prepare(`
      INSERT INTO contracts (
        order_id, customer_id, status, contract_no, content,
        lessor_signature, lessee_signature, signed_at, start_date, end_date, total_amount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      contractData.orderId,
      contractData.customerId,
      contractData.status,
      contractData.contractNo,
      contractData.content,
      contractData.lessorSignature ?? null,
      contractData.lesseeSignature ?? null,
      contractData.signedAt ?? null,
      contractData.startDate,
      contractData.endDate,
      contractData.totalAmount
    );

    const id = Number(result.lastInsertRowid);
    return this.findById(id)!;
  }

  update(id: number, contractData: Partial<Omit<Contract, 'id' | 'createdAt' | 'orderNo' | 'customerName' | 'customerPhone'>>): Contract | null {
    const fields: string[] = [];
    const params: unknown[] = [];

    if (contractData.status !== undefined) {
      fields.push('status = ?');
      params.push(contractData.status);
    }
    if (contractData.content !== undefined) {
      fields.push('content = ?');
      params.push(contractData.content);
    }
    if (contractData.lessorSignature !== undefined) {
      fields.push('lessor_signature = ?');
      params.push(contractData.lessorSignature);
    }
    if (contractData.lesseeSignature !== undefined) {
      fields.push('lessee_signature = ?');
      params.push(contractData.lesseeSignature);
    }
    if (contractData.signedAt !== undefined) {
      fields.push('signed_at = ?');
      params.push(contractData.signedAt);
    }
    if (contractData.startDate !== undefined) {
      fields.push('start_date = ?');
      params.push(contractData.startDate);
    }
    if (contractData.endDate !== undefined) {
      fields.push('end_date = ?');
      params.push(contractData.endDate);
    }
    if (contractData.totalAmount !== undefined) {
      fields.push('total_amount = ?');
      params.push(contractData.totalAmount);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    params.push(id);
    db.prepare(`UPDATE contracts SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    return this.findById(id);
  }

  signContract(
    id: number,
    party: 'lessor' | 'lessee',
    signatureData: string
  ): Contract | null {
    const contract = this.findById(id);
    if (!contract) return null;

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    const updateFields: string[] = [];
    const params: unknown[] = [];

    if (party === 'lessor') {
      updateFields.push('lessor_signature = ?');
      params.push(signatureData);
    } else {
      updateFields.push('lessee_signature = ?');
      params.push(signatureData);
    }

    const currentLessorSig = party === 'lessor' ? signatureData : contract.lessorSignature;
    const currentLesseeSig = party === 'lessee' ? signatureData : contract.lesseeSignature;

    if (currentLessorSig && currentLesseeSig) {
      updateFields.push('status = ?');
      params.push('active');
      updateFields.push('signed_at = ?');
      params.push(now);
    } else {
      updateFields.push('status = ?');
      params.push('pending_signature');
    }

    params.push(id);
    db.prepare(`UPDATE contracts SET ${updateFields.join(', ')} WHERE id = ?`).run(...params);
    return this.findById(id);
  }

  generateContractNo(): string {
    const now = dayjs();
    const dateStr = now.format('YYYYMMDD');

    const row = db.prepare(`
      SELECT MAX(contract_no) as max_no
      FROM contracts
      WHERE contract_no LIKE ?
    `).get(`HT${dateStr}%`) as Record<string, unknown>;

    let sequence = 1;
    if (row.max_no) {
      const maxNo = row.max_no as string;
      const seqStr = maxNo.slice(-6);
      sequence = parseInt(seqStr, 10) + 1;
    }

    const sequenceStr = sequence.toString().padStart(6, '0');
    return `HT${dateStr}${sequenceStr}`;
  }
}

export const contractRepository = new ContractRepository();
