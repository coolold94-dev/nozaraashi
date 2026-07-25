export type UserRole = 'admin' | 'cashier' | 'warehouse';
export type CustomerType = 'wholesale' | 'semi' | 'retail';
export type PaymentType = 'cash' | 'credit' | 'partial';
export type UnitType = 'carton' | 'pack' | 'piece';

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  active: boolean;
}

export interface ProductUnit {
  factor: number;
  barcode?: string;
}

export interface ProductPrices {
  wholesale: number;
  semiWholesale: number;
  retail: number;
}

export interface Product {
  id: string;
  name: string;
  barcode: string;
  sku: string;
  units: {
    carton: ProductUnit;
    pack: ProductUnit;
    piece: ProductUnit;
  };
  prices: ProductPrices;
  costPrice: number;
  stockPieces: number;
  minStockPieces: number;
  category?: string;
  expiryDate?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  name: string;
  shopName: string;
  phone: string;
  type: CustomerType;
  creditLimit: number;
  balance: number;
  address?: string;
  notes?: string;
  active: boolean;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  balance: number;
  address?: string;
  notes?: string;
  active: boolean;
  createdAt: string;
}

export interface InvoiceLineItem {
  productId: string;
  productName: string;
  unit: UnitType;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  total: number;
}

export interface SaleInvoice {
  id: string;
  invoiceNumber: string;
  date: string;
  customerId?: string;
  customerName: string;
  items: InvoiceLineItem[];
  subtotal: number;
  discount: number;
  total: number;
  paid: number;
  remaining: number;
  paymentType: PaymentType;
  createdBy: string;
  createdAt: string;
}

export interface PurchaseInvoice {
  id: string;
  invoiceNumber: string;
  date: string;
  supplierId?: string;
  supplierName: string;
  items: InvoiceLineItem[];
  subtotal: number;
  discount: number;
  total: number;
  paid: number;
  remaining: number;
  paymentType: PaymentType;
  createdBy: string;
  createdAt: string;
}

export interface TreasuryTransaction {
  id: string;
  date: string;
  type: 'in' | 'out' | 'expense';
  amount: number;
  title: string;
  note?: string;
  refType?: 'sale' | 'purchase' | 'collection' | 'manual';
  refId?: string;
  createdBy: string;
}

export interface AppSettings {
  id: string;
  storeName: string;
  storePhone: string;
  storeAddress: string;
  invoicePrefix: string;
  currency: string;
  lowStockAlert: boolean;
}

export interface SessionUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
}
