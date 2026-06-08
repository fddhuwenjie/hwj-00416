import { db } from '../db/connection.js';
import dayjs from 'dayjs';
import type { DashboardStats, RevenueData } from '../../../shared/types.js';
import { deviceRepository } from './device.repository.js';

export class StatsRepository {
  getDashboardStats(): DashboardStats {
    const totalDevices = (db.prepare('SELECT COUNT(*) as count FROM devices').get() as { count: number }).count;
    const availableDevices = (db.prepare("SELECT COUNT(*) as count FROM devices WHERE status = 'available' AND stock > 0").get() as { count: number }).count;
    const totalOrders = (db.prepare('SELECT COUNT(*) as count FROM orders').get() as { count: number }).count;
    const activeOrders = (db.prepare("SELECT COUNT(*) as count FROM orders WHERE status IN ('pending', 'out', 'in_use', 'overdue')").get() as { count: number }).count;
    const totalCustomers = (db.prepare('SELECT COUNT(*) as count FROM customers').get() as { count: number }).count;
    const blacklistedCustomers = (db.prepare('SELECT COUNT(*) as count FROM customers WHERE is_blacklisted = 1').get() as { count: number }).count;

    const totalRevenue = (db.prepare(`
      SELECT COALESCE(SUM(total_rent + late_fee + repair_fee), 0) as revenue
      FROM orders WHERE status = 'returned'
    `).get() as { revenue: number }).revenue;

    const monthStart = dayjs().startOf('month').format('YYYY-MM-DD');
    const monthRevenue = (db.prepare(`
      SELECT COALESCE(SUM(total_rent + late_fee + repair_fee), 0) as revenue
      FROM orders
      WHERE status = 'returned' AND DATE(created_at) >= ?
    `).get(monthStart) as { revenue: number }).revenue;

    const thirtyDaysAgo = dayjs().subtract(30, 'day').format('YYYY-MM-DD');
    const totalDeviceDays = totalDevices * 30;
    const rentedDeviceDays = (db.prepare(`
      SELECT COALESCE(SUM(
        CASE
          WHEN status = 'returned' THEN JULIANDAY(actual_return_date) - JULIANDAY(start_date) + 1
          ELSE JULIANDAY(MIN(end_date, DATE('now'))) - JULIANDAY(start_date) + 1
        END
      ), 0) as days
      FROM orders
      WHERE start_date >= ?
    `).get(thirtyDaysAgo) as { days: number }).days;

    const deviceUtilizationRate = totalDeviceDays > 0 ? Math.round((rentedDeviceDays / totalDeviceDays) * 100) : 0;

    const overdueOrders = (db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'overdue'").get() as { count: number }).count;
    const overdueRate = totalOrders > 0 ? Math.round((overdueOrders / totalOrders) * 100) : 0;

    const lowStockDevices = deviceRepository.findLowStock(2);

    const hotDevices = db.prepare(`
      SELECT d.id as deviceId, d.name as deviceName, COUNT(*) as count
      FROM order_items oi
      JOIN devices d ON oi.device_id = d.id
      GROUP BY d.id, d.name
      ORDER BY count DESC
      LIMIT 10
    `).all() as Array<{ deviceId: number; deviceName: string; count: number }>;

    const categoryStats = db.prepare(`
      SELECT c.id as categoryId, c.name as categoryName, COUNT(*) as count
      FROM order_items oi
      JOIN devices d ON oi.device_id = d.id
      JOIN categories c ON d.category_id = c.id
      GROUP BY c.id, c.name
      ORDER BY count DESC
    `).all() as Array<{ categoryId: number; categoryName: string; count: number }>;

    return {
      totalDevices,
      availableDevices,
      totalOrders,
      activeOrders,
      totalCustomers,
      blacklistedCustomers,
      totalRevenue,
      monthRevenue,
      deviceUtilizationRate,
      overdueRate,
      lowStockDevices,
      hotDevices,
      categoryStats,
    };
  }

  getRevenueData(days: number = 30): RevenueData[] {
    const startDate = dayjs().subtract(days - 1, 'day');
    const data: RevenueData[] = [];

    for (let i = 0; i < days; i++) {
      const date = startDate.add(i, 'day').format('YYYY-MM-DD');
      const result = db.prepare(`
        SELECT
          COALESCE(SUM(o.total_rent + o.late_fee + o.repair_fee), 0) as revenue,
          COUNT(DISTINCT o.id) as orders
        FROM orders o
        WHERE DATE(o.created_at) = ? AND o.status = 'returned'
      `).get(date) as { revenue: number; orders: number };

      data.push({
        date,
        revenue: result.revenue,
        orders: result.orders,
      });
    }

    return data;
  }
}

export const statsRepository = new StatsRepository();
