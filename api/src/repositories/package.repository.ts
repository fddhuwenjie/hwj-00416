import { db } from '../db/connection.js';
import { BaseRepository } from './base.js';
import type { Package, PackageItem } from '../../../shared/types.js';

export class PackageRepository extends BaseRepository<Package> {
  protected tableName = 'packages';

  protected mapRow(row: Record<string, unknown>): Package {
    return {
      id: row.id as number,
      name: row.name as string,
      description: row.description as string | undefined,
      status: row.status as Package['status'],
      totalPrice: row.total_price as number,
      originalPrice: row.original_price as number,
      photoUrl: row.photo_url as string | undefined,
      createdAt: row.created_at as string,
    };
  }

  private mapPackageItemRow(row: Record<string, unknown>): PackageItem {
    return {
      id: row.id as number,
      packageId: row.package_id as number,
      deviceId: row.device_id as number,
      deviceName: row.device_name as string | undefined,
      quantity: row.quantity as number,
    };
  }

  findAllWithDetails(): Package[] {
    const rows = db.prepare(`
      SELECT p.*
      FROM packages p
      ORDER BY p.id DESC
    `).all() as Record<string, unknown>[];

    return rows.map(row => {
      const pkg = this.mapRow(row);
      const items = this.findItems(pkg.id);
      return { ...pkg, items };
    });
  }

  findActive(): Package[] {
    const rows = db.prepare(`
      SELECT p.*
      FROM packages p
      WHERE p.status = 'active'
      ORDER BY p.id DESC
    `).all() as Record<string, unknown>[];

    return rows.map(row => {
      const pkg = this.mapRow(row);
      const items = this.findItems(pkg.id);
      return { ...pkg, items };
    });
  }

  findByIdWithDetails(id: number): (Package & { items: PackageItem[] }) | null {
    const row = db.prepare(`
      SELECT p.*
      FROM packages p
      WHERE p.id = ?
    `).get(id) as Record<string, unknown> | undefined;

    if (!row) return null;

    const pkg = this.mapRow(row);
    const items = this.findItems(id);
    return { ...pkg, items };
  }

  findItems(packageId: number): PackageItem[] {
    const rows = db.prepare(`
      SELECT pi.*, d.name as device_name
      FROM package_items pi
      LEFT JOIN devices d ON pi.device_id = d.id
      WHERE pi.package_id = ?
    `).all(packageId) as Record<string, unknown>[];
    return rows.map(row => this.mapPackageItemRow(row));
  }

  create(
    packageData: Omit<Package, 'id' | 'createdAt' | 'items'>,
    items: Omit<PackageItem, 'id' | 'packageId' | 'deviceName'>[]
  ): Package & { items: PackageItem[] } {
    const insertPackage = db.prepare(`
      INSERT INTO packages (name, description, status, total_price, original_price, photo_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const insertItem = db.prepare(`
      INSERT INTO package_items (package_id, device_id, quantity)
      VALUES (?, ?, ?)
    `);

    const tx = db.transaction(() => {
      const result = insertPackage.run(
        packageData.name,
        packageData.description ?? null,
        packageData.status,
        packageData.totalPrice,
        packageData.originalPrice,
        packageData.photoUrl ?? null
      );

      const packageId = Number(result.lastInsertRowid);

      items.forEach(item => {
        insertItem.run(packageId, item.deviceId, item.quantity);
      });

      return packageId;
    });

    const packageId = tx();
    return this.findByIdWithDetails(packageId)!;
  }

  update(id: number, data: Partial<Omit<Package, 'id' | 'createdAt' | 'items'>>): Package | null {
    const fields: string[] = [];
    const values: unknown[] = [];

    const fieldMap: Record<string, string> = {
      name: 'name',
      description: 'description',
      status: 'status',
      totalPrice: 'total_price',
      originalPrice: 'original_price',
      photoUrl: 'photo_url',
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
    db.prepare(`UPDATE packages SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return this.findById(id);
  }

  toggleStatus(id: number): Package | null {
    db.prepare(`
      UPDATE packages 
      SET status = CASE WHEN status = 'active' THEN 'inactive' ELSE 'active' END 
      WHERE id = ?
    `).run(id);
    return this.findById(id);
  }
}

export const packageRepository = new PackageRepository();
