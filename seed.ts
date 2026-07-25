import { v4 as uuid } from 'uuid';
import { hashPassword } from '../lib/crypto';
import { db } from './database';
import type { Customer, Product, User } from './types';

const DEFAULT_ADMIN_PASSWORD = '1234';

export async function seedDatabase(): Promise<void> {
  const userCount = await db.users.count();
  if (userCount > 0) return;

  const adminHash = await hashPassword(DEFAULT_ADMIN_PASSWORD);
  const now = new Date().toISOString();

  const users: User[] = [
    {
      id: uuid(),
      username: 'admin',
      passwordHash: adminHash,
      name: 'مدير النظام',
      role: 'admin',
      active: true,
    },
    {
      id: uuid(),
      username: 'cashier',
      passwordHash: await hashPassword('1234'),
      name: 'كاشير',
      role: 'cashier',
      active: true,
    },
  ];

  const products: Product[] = [
    {
      id: uuid(),
      name: 'مياه معدنية 600ml',
      barcode: '6221155000011',
      sku: 'WTR-600',
      units: { carton: { factor: 24 }, pack: { factor: 6 }, piece: { factor: 1 } },
      prices: { wholesale: 85, semiWholesale: 95, retail: 110 },
      costPrice: 72,
      stockPieces: 480,
      minStockPieces: 96,
      category: 'مشروبات',
      active: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uuid(),
      name: 'أرز مصري 1 كجم',
      barcode: '6221155000028',
      sku: 'RICE-1K',
      units: { carton: { factor: 12 }, pack: { factor: 1 }, piece: { factor: 1 } },
      prices: { wholesale: 420, semiWholesale: 450, retail: 480 },
      costPrice: 390,
      stockPieces: 120,
      minStockPieces: 24,
      category: 'بقالة',
      active: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uuid(),
      name: 'زيت ذرة 1 لتر',
      barcode: '6221155000035',
      sku: 'OIL-1L',
      units: { carton: { factor: 12 }, pack: { factor: 3 }, piece: { factor: 1 } },
      prices: { wholesale: 680, semiWholesale: 720, retail: 780 },
      costPrice: 640,
      stockPieces: 60,
      minStockPieces: 12,
      category: 'بقالة',
      active: true,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const customers: Customer[] = [
    {
      id: uuid(),
      name: 'محمد حسن',
      shopName: 'بقالة أبو حسن',
      phone: '01012345678',
      type: 'semi',
      creditLimit: 10000,
      balance: 2500,
      address: 'المنيا - شارع الجمهورية',
      active: true,
      createdAt: now,
    },
    {
      id: uuid(),
      name: 'أحمد سالم',
      shopName: 'سوبر ماركت النور',
      phone: '01198765432',
      type: 'wholesale',
      creditLimit: 50000,
      balance: 0,
      address: 'أسيوط - حي east',
      active: true,
      createdAt: now,
    },
  ];

  await db.transaction('rw', db.users, db.products, db.customers, db.settings, db.treasury, async () => {
    await db.users.bulkAdd(users);
    await db.products.bulkAdd(products);
    await db.customers.bulkAdd(customers);
    await db.settings.add({
      id: 'main',
      storeName: 'نوزراشى',
      storePhone: '01000000000',
      storeAddress: 'مصر',
      invoicePrefix: 'NZ',
      currency: 'ج.م',
      lowStockAlert: true,
    });
    await db.treasury.add({
      id: uuid(),
      date: now,
      type: 'in',
      amount: 10000,
      title: 'رصيد افتتاحي للخزينة',
      note: 'بداية التشغيل',
      refType: 'manual',
      createdBy: users[0].name,
    });
  });
}

export { DEFAULT_ADMIN_PASSWORD };
