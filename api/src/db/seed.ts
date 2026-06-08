import { db } from './connection.js';
import dayjs from 'dayjs';

export function seedData() {
  const categoryCount = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number };
  if (categoryCount.count > 0) {
    console.log('Data already seeded, skipping...');
    return;
  }

  const insertCategory = db.prepare(
    'INSERT INTO categories (name, code) VALUES (?, ?)'
  );
  const insertDevice = db.prepare(
    'INSERT INTO devices (name, category_id, brand_model, daily_rate, deposit, stock, status, photo_url, barcode) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const insertCustomer = db.prepare(
    'INSERT INTO customers (name, phone, id_card, credit_score, total_spent, is_blacklisted, vip_level) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  const insertOrder = db.prepare(
    'INSERT INTO orders (order_no, customer_id, start_date, end_date, actual_return_date, total_rent, total_deposit, late_fee, repair_fee, final_amount, status, remarks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const insertOrderItem = db.prepare(
    'INSERT INTO order_items (order_id, device_id, quantity, daily_rate, deposit_per_unit, days, subtotal, device_status, repair_note, repair_fee) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );

  const categories = [
    { name: '摄影器材', code: 'photography' },
    { name: '音响设备', code: 'audio' },
    { name: '照明设备', code: 'lighting' },
    { name: '舞台设备', code: 'stage' },
    { name: '工具类', code: 'tools' },
  ];

  const categoryIds: number[] = [];
  categories.forEach((cat) => {
    const result = insertCategory.run(cat.name, cat.code);
    categoryIds.push(Number(result.lastInsertRowid));
  });

  const devices = [
    { name: '全画幅专业相机', categoryIdx: 0, brand: 'Canon EOS R5', dailyRate: 300, deposit: 5000, stock: 5, barcode: 'CAM001' },
    { name: '标准变焦镜头', categoryIdx: 0, brand: 'Sony FE 24-70mm F2.8', dailyRate: 150, deposit: 2000, stock: 8, barcode: 'LEN001' },
    { name: '人像定焦镜头', categoryIdx: 0, brand: 'Canon EF 85mm F1.4', dailyRate: 120, deposit: 1800, stock: 6, barcode: 'LEN002' },
    { name: '航拍无人机', categoryIdx: 0, brand: 'DJI Mavic 3 Pro', dailyRate: 400, deposit: 8000, stock: 3, barcode: 'DRN001' },
    { name: '专业稳定器', categoryIdx: 0, brand: 'DJI Ronin-S2', dailyRate: 100, deposit: 1500, stock: 5, barcode: 'STB001' },
    { name: '双15寸全频音响', categoryIdx: 1, brand: 'JBL PRX825W', dailyRate: 250, deposit: 3000, stock: 8, barcode: 'SPK001' },
    { name: '专业调音台', categoryIdx: 1, brand: 'Yamaha MG16XU', dailyRate: 180, deposit: 2500, stock: 4, barcode: 'MIX001' },
    { name: '无线手持麦克风', categoryIdx: 1, brand: 'Shure SLX24/SM58', dailyRate: 80, deposit: 1000, stock: 12, barcode: 'MIC001' },
    { name: '头戴无线麦', categoryIdx: 1, brand: 'Sennheiser EW 100 G4', dailyRate: 100, deposit: 1200, stock: 6, barcode: 'MIC002' },
    { name: '专业功放', categoryIdx: 1, brand: 'Crown XLi 3500', dailyRate: 150, deposit: 2000, stock: 5, barcode: 'AMP001' },
    { name: 'LED面光灯', categoryIdx: 2, brand: 'Philips BR1200', dailyRate: 60, deposit: 800, stock: 20, barcode: 'LGT001' },
    { name: '摇头染色灯', categoryIdx: 2, brand: 'Martin MAC Axiom', dailyRate: 180, deposit: 2500, stock: 10, barcode: 'LGT002' },
    { name: '追光灯', categoryIdx: 2, brand: 'Clay Paky Sharpy', dailyRate: 220, deposit: 3000, stock: 4, barcode: 'LGT003' },
    { name: '铝制舞台板', categoryIdx: 3, brand: 'StageRight 4x8ft', dailyRate: 50, deposit: 500, stock: 30, barcode: 'STG001' },
    { name: '雷亚架', categoryIdx: 3, brand: 'Global Truss F34', dailyRate: 80, deposit: 1000, stock: 50, barcode: 'TRS001' },
    { name: '电动升降机', categoryIdx: 4, brand: 'Genie GS-3246', dailyRate: 500, deposit: 8000, stock: 2, barcode: 'TOOL001' },
    { name: '冲击电钻', categoryIdx: 4, brand: 'Bosch GBH 4-32', dailyRate: 60, deposit: 500, stock: 10, barcode: 'TOOL002' },
    { name: '角磨机', categoryIdx: 4, brand: 'Makita GA9020', dailyRate: 40, deposit: 300, stock: 15, barcode: 'TOOL003' },
    { name: '激光水平仪', categoryIdx: 4, brand: 'Dewalt DW089LG', dailyRate: 70, deposit: 600, stock: 8, barcode: 'TOOL004' },
    { name: '液压搬运车', categoryIdx: 4, brand: 'Linde M30', dailyRate: 120, deposit: 1500, stock: 5, barcode: 'TOOL005' },
  ];

  const photoUrls = [
    'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1606812589563-ca47a31b44af?w=400&h=300&fit=crop',
  ];

  const deviceIds: number[] = [];
  devices.forEach((d, idx) => {
    const status = idx === 3 ? 'maintenance' : 'available';
    const result = insertDevice.run(
      d.name,
      categoryIds[d.categoryIdx],
      d.brand,
      d.dailyRate,
      d.deposit,
      d.stock,
      status,
      photoUrls[d.categoryIdx % photoUrls.length],
      d.barcode
    );
    deviceIds.push(Number(result.lastInsertRowid));
  });

  const customers = [
    { name: '张伟', phone: '13800138001', idCard: '110101199001010001', creditScore: 100, totalSpent: 0, blacklisted: 0, vipLevel: 'normal' },
    { name: '李娜', phone: '13800138002', idCard: '110101199002020002', creditScore: 95, totalSpent: 15800, blacklisted: 0, vipLevel: 'vip' },
    { name: '王强', phone: '13800138003', idCard: '110101199003030003', creditScore: 100, totalSpent: 68500, blacklisted: 0, vipLevel: 'svip' },
    { name: '刘洋', phone: '13800138004', idCard: '110101199004040004', creditScore: 55, totalSpent: 3200, blacklisted: 1, vipLevel: 'normal' },
    { name: '陈静', phone: '13800138005', idCard: '110101199005050005', creditScore: 90, totalSpent: 8500, blacklisted: 0, vipLevel: 'normal' },
    { name: '杨帆', phone: '13800138006', idCard: '110101199006060006', creditScore: 100, totalSpent: 12500, blacklisted: 0, vipLevel: 'vip' },
    { name: '赵丽', phone: '13800138007', idCard: '110101199007070007', creditScore: 100, totalSpent: 0, blacklisted: 0, vipLevel: 'normal' },
    { name: '周明', phone: '13800138008', idCard: '110101199008080008', creditScore: 85, totalSpent: 5600, blacklisted: 0, vipLevel: 'normal' },
    { name: '吴芳', phone: '13800138009', idCard: '110101199009090009', creditScore: 100, totalSpent: 32000, blacklisted: 0, vipLevel: 'vip' },
    { name: '郑鹏', phone: '13800138010', idCard: '110101199010100010', creditScore: 75, totalSpent: 2800, blacklisted: 0, vipLevel: 'normal' },
    { name: '孙悦', phone: '13800138011', idCard: '110101199011110011', creditScore: 100, totalSpent: 0, blacklisted: 0, vipLevel: 'normal' },
    { name: '马超', phone: '13800138012', idCard: '110101199012120012', creditScore: 100, totalSpent: 78000, blacklisted: 0, vipLevel: 'svip' },
    { name: '朱琳', phone: '13800138013', idCard: '110101199101010013', creditScore: 50, totalSpent: 1500, blacklisted: 1, vipLevel: 'normal' },
    { name: '胡军', phone: '13800138014', idCard: '110101199102020014', creditScore: 100, totalSpent: 4200, blacklisted: 0, vipLevel: 'normal' },
    { name: '林雅', phone: '13800138015', idCard: '110101199103030015', creditScore: 98, totalSpent: 18600, blacklisted: 0, vipLevel: 'vip' },
  ];

  const customerIds: number[] = [];
  customers.forEach((c) => {
    const result = insertCustomer.run(
      c.name, c.phone, c.idCard, c.creditScore, c.totalSpent, c.blacklisted, c.vipLevel
    );
    customerIds.push(Number(result.lastInsertRowid));
  });

  const now = dayjs();
  const orderStatuses: ('pending' | 'out' | 'in_use' | 'returned' | 'overdue')[] = 
    ['pending', 'out', 'in_use', 'returned', 'returned', 'returned', 'returned', 'overdue', 'returned', 'returned'];
  
  for (let i = 0; i < 30; i++) {
    const orderNo = `ORD${now.format('YYYYMMDD')}${String(i + 1).padStart(4, '0')}`;
    const status = orderStatuses[i % orderStatuses.length];
    const customerIdx = i % customerIds.length;
    
    let startOffset = -(Math.floor(Math.random() * 30) + 1);
    let endOffset = startOffset + Math.floor(Math.random() * 7) + 1;
    
    if (status === 'overdue') {
      endOffset = -5;
    } else if (status === 'in_use' || status === 'out') {
      startOffset = -2;
      endOffset = 5;
    }
    
    const startDate = now.add(startOffset, 'day').format('YYYY-MM-DD');
    const endDate = now.add(endOffset, 'day').format('YYYY-MM-DD');
    const actualReturnDate = status === 'returned' 
      ? now.add(endOffset + Math.floor(Math.random() * 2), 'day').format('YYYY-MM-DD')
      : null;
    
    const numItems = Math.floor(Math.random() * 3) + 1;
    const itemIndices: number[] = [];
    for (let j = 0; j < numItems; j++) {
      let idx;
      do {
        idx = Math.floor(Math.random() * deviceIds.length);
      } while (itemIndices.includes(idx));
      itemIndices.push(idx);
    }

    let totalRent = 0;
    let totalDeposit = 0;
    const days = Math.abs(endOffset - startOffset) + 1;
    const lateFee = status === 'overdue' ? 150 : 0;
    const repairFee = i % 7 === 0 ? 300 : 0;

    const orderResult = insertOrder.run(
      orderNo,
      customerIds[customerIdx],
      startDate,
      endDate,
      actualReturnDate,
      0,
      0,
      lateFee,
      repairFee,
      status === 'returned' || status === 'overdue' ? 0 : null,
      status,
      i % 5 === 0 ? '客户要求周末配送' : null
    );
    const orderId = Number(orderResult.lastInsertRowid);

    itemIndices.forEach((deviceIdx, itemIdx) => {
      const device = devices[deviceIdx];
      const quantity = Math.floor(Math.random() * 3) + 1;
      const subtotal = device.dailyRate * days * quantity;
      totalRent += subtotal;
      totalDeposit += device.deposit * quantity;

      const deviceStatus = status === 'returned' 
        ? (i % 7 === 0 && itemIdx === 0 ? 'damaged' : 'good')
        : 'good';

      insertOrderItem.run(
        orderId,
        deviceIds[deviceIdx],
        quantity,
        device.dailyRate,
        device.deposit,
        days,
        subtotal,
        deviceStatus,
        deviceStatus === 'damaged' ? '外壳有划痕' : null,
        deviceStatus === 'damaged' ? 300 : 0
      );
    });

    const finalAmount = status === 'returned' || status === 'overdue'
      ? totalRent + lateFee + repairFee - totalDeposit
      : undefined;

    db.prepare('UPDATE orders SET total_rent = ?, total_deposit = ?, final_amount = ? WHERE id = ?')
      .run(totalRent, totalDeposit, finalAmount ?? null, orderId);
  }

  console.log('Data seeded successfully!');
  console.log(`- ${categories.length} categories`);
  console.log(`- ${devices.length} devices`);
  console.log(`- ${customers.length} customers`);
  console.log(`- 30 orders with items`);
}
