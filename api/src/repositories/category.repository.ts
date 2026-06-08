import { db } from '../db/connection.js';
import { BaseRepository } from './base.js';
import type { Category } from '../../../shared/types.js';

export class CategoryRepository extends BaseRepository<Category> {
  protected tableName = 'categories';

  protected mapRow(row: Record<string, unknown>): Category {
    return {
      id: row.id as number,
      name: row.name as string,
      code: row.code as Category['code'],
    };
  }

  findByCode(code: string): Category | null {
    const row = db.prepare(`SELECT * FROM categories WHERE code = ?`).get(code) as Record<string, unknown> | undefined;
    return row ? this.mapRow(row) : null;
  }
}

export const categoryRepository = new CategoryRepository();
