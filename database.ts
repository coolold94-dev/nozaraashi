import Dexie, { type EntityTable } from 'dexie';
import type {
  AppSettings,
  Customer,
  Product,
  PurchaseInvoice,
  SaleInvoice,
  Supplier,
  TreasuryTransaction,
  User,
} from './types';

export class NozraashiDB extends Dexie {
  users!: EntityTable<User, 'id'>;
  products!: EntityTable<Product, 'id'>;
  customers!: EntityTable<Customer, 'id'>;
  suppliers!: EntityTable<Supplier, 'id'>;
  saleInvoices!: EntityTable<SaleInvoice, 'id'>;
  purchaseInvoices!: EntityTable<PurchaseInvoice, 'id'>;
  treasury!: EntityTable<TreasuryTransaction, 'id'>;
  settings!: EntityTable<AppSettings, 'id'>;

  constructor() {
    super('nozraashi_db');

    this.version(1).stores({
      users: 'id, username, role, active',
      products: 'id, barcode, sku, name, active, category',
      customers: 'id, name, phone, type, active',
      suppliers: 'id, name, phone, active',
      saleInvoices: 'id, invoiceNumber, date, customerId, paymentType',
      purchaseInvoices: 'id, invoiceNumber, date, supplierId',
      treasury: 'id, date, type, refType, refId',
      settings: 'id',
    });
  }
}

export const db = new NozraashiDB();
