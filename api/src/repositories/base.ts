import { db } from '../db/connection.js';

export abstract class BaseRepository<T> {
  protected abstract tableName: string;

  protected mapRow(row: Record<string, unknown>): T {
    return row as T;
  }

  findById(id: number): T | null {
    const row = db.prepare(`SELECT * FROM ${this.tableName} WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
    return row ? this.mapRow(row) : null;
  }

  findAll(): T[] {
    const rows = db.prepare(`SELECT * FROM ${this.tableName} ORDER BY id DESC`).all() as Record<string, unknown>[];
    return rows.map(row => this.mapRow(row));
  }

  delete(id: number): boolean {
    const result = db.prepare(`DELETE FROM ${this.tableName} WHERE id = ?`).run(id);
    return result.changes > 0;
  }
}
