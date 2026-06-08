import { db } from './connection.js';

export function createTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(50) NOT NULL,
      code VARCHAR(20) NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(100) NOT NULL,
      category_id INTEGER NOT NULL,
      brand_model VARCHAR(100),
      daily_rate DECIMAL(10,2) NOT NULL DEFAULT 0,
      deposit DECIMAL(10,2) NOT NULL DEFAULT 0,
      stock INTEGER NOT NULL DEFAULT 0,
      status VARCHAR(20) NOT NULL DEFAULT 'available',
      photo_url VARCHAR(255),
      barcode VARCHAR(50) UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(50) NOT NULL,
      phone VARCHAR(20) NOT NULL UNIQUE,
      id_card VARCHAR(20) UNIQUE,
      credit_score INTEGER NOT NULL DEFAULT 100,
      total_spent DECIMAL(12,2) NOT NULL DEFAULT 0,
      is_blacklisted BOOLEAN NOT NULL DEFAULT 0,
      vip_level VARCHAR(20) NOT NULL DEFAULT 'normal',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no VARCHAR(30) NOT NULL UNIQUE,
      customer_id INTEGER NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      actual_return_date DATE,
      total_rent DECIMAL(12,2) NOT NULL DEFAULT 0,
      total_deposit DECIMAL(12,2) NOT NULL DEFAULT 0,
      late_fee DECIMAL(12,2) NOT NULL DEFAULT 0,
      repair_fee DECIMAL(12,2) NOT NULL DEFAULT 0,
      final_amount DECIMAL(12,2),
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      remarks TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      device_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      daily_rate DECIMAL(10,2) NOT NULL,
      deposit_per_unit DECIMAL(10,2) NOT NULL,
      days INTEGER NOT NULL,
      subtotal DECIMAL(12,2) NOT NULL,
      device_status VARCHAR(20) DEFAULT 'good',
      repair_note TEXT,
      repair_fee DECIMAL(10,2) DEFAULT 0,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (device_id) REFERENCES devices(id)
    );

    CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_dates ON orders(start_date, end_date);
    CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_order_items_device ON order_items(device_id);
    CREATE INDEX IF NOT EXISTS idx_devices_category ON devices(category_id);
    CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
    CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
  `);
}
