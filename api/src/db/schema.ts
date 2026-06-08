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

    CREATE TABLE IF NOT EXISTS maintenance_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id INTEGER NOT NULL,
      type VARCHAR(20) NOT NULL DEFAULT 'repair',
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      priority VARCHAR(20) NOT NULL DEFAULT 'medium',
      reporter_name VARCHAR(50) NOT NULL,
      fault_description TEXT NOT NULL,
      photo_url VARCHAR(255),
      before_photo_url VARCHAR(255),
      after_photo_url VARCHAR(255),
      assigned_to VARCHAR(50),
      estimated_repair_date DATE,
      actual_cost DECIMAL(12,2),
      replaced_parts TEXT,
      repair_notes TEXT,
      completed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (device_id) REFERENCES devices(id)
    );

    CREATE TABLE IF NOT EXISTS maintenance_timeline (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      maintenance_id INTEGER NOT NULL,
      status VARCHAR(20) NOT NULL,
      description TEXT NOT NULL,
      operator VARCHAR(50),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (maintenance_id) REFERENCES maintenance_records(id)
    );

    CREATE TABLE IF NOT EXISTS maintenance_reminder_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id INTEGER NOT NULL,
      rule_type VARCHAR(20) NOT NULL,
      threshold_days INTEGER NOT NULL,
      last_reminder_date DATE,
      next_maintenance_date DATE,
      is_active BOOLEAN NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (device_id) REFERENCES devices(id)
    );

    CREATE TABLE IF NOT EXISTS contracts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      customer_id INTEGER NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'draft',
      contract_no VARCHAR(30) NOT NULL UNIQUE,
      content TEXT NOT NULL,
      lessor_signature TEXT,
      lessee_signature TEXT,
      signed_at DATETIME,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      total_amount DECIMAL(12,2) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    CREATE TABLE IF NOT EXISTS packages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      total_price DECIMAL(12,2) NOT NULL DEFAULT 0,
      original_price DECIMAL(12,2) NOT NULL DEFAULT 0,
      photo_url VARCHAR(255),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS package_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      package_id INTEGER NOT NULL,
      device_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (package_id) REFERENCES packages(id),
      FOREIGN KEY (device_id) REFERENCES devices(id)
    );

    CREATE TABLE IF NOT EXISTS coupons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code VARCHAR(50) NOT NULL UNIQUE,
      name VARCHAR(100) NOT NULL,
      type VARCHAR(20) NOT NULL,
      value DECIMAL(12,2) NOT NULL,
      min_order_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      valid_from DATE NOT NULL,
      valid_to DATE NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      total_quantity INTEGER NOT NULL DEFAULT 0,
      used_quantity INTEGER NOT NULL DEFAULT 0,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS customer_coupons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      coupon_id INTEGER NOT NULL,
      is_used BOOLEAN NOT NULL DEFAULT 0,
      used_at DATETIME,
      order_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (coupon_id) REFERENCES coupons(id),
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );

    CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_dates ON orders(start_date, end_date);
    CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_order_items_device ON order_items(device_id);
    CREATE INDEX IF NOT EXISTS idx_devices_category ON devices(category_id);
    CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
    CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
    CREATE INDEX IF NOT EXISTS idx_maintenance_device ON maintenance_records(device_id);
    CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance_records(status);
    CREATE INDEX IF NOT EXISTS idx_maintenance_timeline ON maintenance_timeline(maintenance_id);
    CREATE INDEX IF NOT EXISTS idx_contracts_order ON contracts(order_id);
    CREATE INDEX IF NOT EXISTS idx_contracts_customer ON contracts(customer_id);
    CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
    CREATE INDEX IF NOT EXISTS idx_packages_status ON packages(status);
    CREATE INDEX IF NOT EXISTS idx_package_items_package ON package_items(package_id);
    CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
    CREATE INDEX IF NOT EXISTS idx_coupons_status ON coupons(status);
    CREATE INDEX IF NOT EXISTS idx_customer_coupons_customer ON customer_coupons(customer_id);
    CREATE INDEX IF NOT EXISTS idx_customer_coupons_coupon ON customer_coupons(coupon_id);
  `);
}
