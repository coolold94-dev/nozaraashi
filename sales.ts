import { v4 as uuid } from 'uuid';
import { db } from '../db/database';
import type { PaymentType, SaleInvoice, UnitType } from '../db/types';
import { nextInvoiceNumber } from './invoices';
import { getUnitPrice, piecesFromSale } from './products';

export interface SaleCartItem {
  productId: string;
  productName: string;
  unit: UnitType;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  unitFactor: number;
}

export interface CreateSaleInput {
  customerId?: string;
  customerName: string;
  items: SaleCartItem[];
  discount: number;
  paid: number;
  paymentType: PaymentType;
  createdBy: string;
}

export class SaleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SaleError';
  }
}

export async function createSale(input: CreateSaleInput): Promise<SaleInvoice> {
  if (input.items.length === 0) {
    throw new SaleError('أضف منتجات للفاتورة أولاً');
  }

  const settings = await db.settings.get('main');
  const prefix = settings?.invoicePrefix ?? 'NZ';

  const subtotal = input.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const discount = Math.max(0, input.discount);
  const total = Math.max(0, subtotal - discount);
  const paid = Math.min(Math.max(0, input.paid), total);
  const remaining = Math.round((total - paid) * 100) / 100;

  if (remaining > 0 && !input.customerId) {
    throw new SaleError('البيع الآجل يتطلب اختيار عميل');
  }

  if (input.customerId) {
    const customer = await db.customers.get(input.customerId);
    if (!customer) throw new SaleError('العميل غير موجود');
    if (customer.balance + remaining > customer.creditLimit) {
      throw new SaleError(`تجاوز حد الائتمان (${customer.creditLimit.toLocaleString('ar-EG')} ج.م)`);
    }
  }

  for (const item of input.items) {
    const product = await db.products.get(item.productId);
    if (!product || !product.active) {
      throw new SaleError(`المنتج "${item.productName}" غير متاح`);
    }
    const needed = piecesFromSale(item.unit, item.quantity, product);
    if (needed > product.stockPieces) {
      throw new SaleError(`كمية "${item.productName}" أكبر من المخزون المتاح`);
    }
  }

  const invoiceNumber = await nextInvoiceNumber(prefix);
  const now = new Date().toISOString();

  const invoice: SaleInvoice = {
    id: uuid(),
    invoiceNumber,
    date: now,
    customerId: input.customerId,
    customerName: input.customerName,
    items: input.items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      unit: item.unit,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      costPrice: item.costPrice,
      total: Math.round(item.unitPrice * item.quantity * 100) / 100,
    })),
    subtotal: Math.round(subtotal * 100) / 100,
    discount,
    total: Math.round(total * 100) / 100,
    paid,
    remaining,
    paymentType: input.paymentType,
    createdBy: input.createdBy,
    createdAt: now,
  };

  await db.transaction('rw', db.products, db.customers, db.saleInvoices, db.treasury, async () => {
    for (const item of input.items) {
      const product = await db.products.get(item.productId);
      if (!product) continue;
      const needed = piecesFromSale(item.unit, item.quantity, product);
      await db.products.update(item.productId, {
        stockPieces: product.stockPieces - needed,
        updatedAt: now,
      });
    }

    if (input.customerId && remaining > 0) {
      const customer = await db.customers.get(input.customerId);
      if (customer) {
        await db.customers.update(input.customerId, {
          balance: Math.round((customer.balance + remaining) * 100) / 100,
        });
      }
    }

    await db.saleInvoices.add(invoice);

    if (paid > 0) {
      await db.treasury.add({
        id: uuid(),
        date: now,
        type: 'in',
        amount: paid,
        title: `تحصيل فاتورة ${invoiceNumber}`,
        note: input.customerName,
        refType: 'sale',
        refId: invoice.id,
        createdBy: input.createdBy,
      });
    }
  });

  return invoice;
}

export function buildCartItem(
  product: import('../db/types').Product,
  unit: UnitType,
  quantity: number,
  customerType: import('../db/types').CustomerType | 'walkin',
): SaleCartItem {
  return {
    productId: product.id,
    productName: product.name,
    unit,
    quantity,
    unitPrice: getUnitPrice(product, unit, customerType),
    costPrice: product.costPrice,
    unitFactor: product.units[unit].factor,
  };
}
