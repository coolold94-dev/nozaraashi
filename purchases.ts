import { v4 as uuid } from 'uuid';
import { db } from '../db/database';
import type { PaymentType, Product, PurchaseInvoice, UnitType } from '../db/types';
import { nextInvoiceNumber } from './invoices';
import { piecesFromSale } from './products';

export interface PurchaseCartItem {
  productId: string;
  productName: string;
  unit: UnitType;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  unitFactor: number;
}

export interface CreatePurchaseInput {
  supplierId?: string;
  supplierName: string;
  items: PurchaseCartItem[];
  discount: number;
  paid: number;
  paymentType: PaymentType;
  createdBy: string;
}

export class PurchaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PurchaseError';
  }
}

export async function createPurchase(input: CreatePurchaseInput): Promise<PurchaseInvoice> {
  if (input.items.length === 0) {
    throw new PurchaseError('أضف منتجات إلى الفاتورة أولاً');
  }

  const settings = await db.settings.get('main');
  const prefix = settings?.invoicePrefix ?? 'NZ';

  const subtotal = input.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const discount = Math.max(0, input.discount);
  const total = Math.max(0, subtotal - discount);
  const paid = Math.min(Math.max(0, input.paid), total);
  const remaining = Math.round((total - paid) * 100) / 100;

  if (remaining > 0 && !input.supplierId) {
    throw new PurchaseError('الشراء الآجل يتطلب اختيار مورد');
  }

  if (input.supplierId) {
    const supplier = await db.suppliers.get(input.supplierId);
    if (!supplier) throw new PurchaseError('المورد غير موجود');
    if (supplier.balance + remaining < 0) {
      throw new PurchaseError('رصيد المورد لا يمكن أن يصبح سالباً');
    }
  }

  for (const item of input.items) {
    const product = await db.products.get(item.productId);
    if (!product || !product.active) {
      throw new PurchaseError(`المنتج "${item.productName}" غير متاح`);
    }
  }

  const invoiceNumber = await nextInvoiceNumber(prefix);
  const now = new Date().toISOString();

  const invoice: PurchaseInvoice = {
    id: uuid(),
    invoiceNumber,
    date: now,
    supplierId: input.supplierId,
    supplierName: input.supplierName,
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

  await db.transaction('rw', db.products, db.suppliers, db.purchaseInvoices, db.treasury, async () => {
    for (const item of input.items) {
      const product = await db.products.get(item.productId);
      if (!product) continue;
      const added = piecesFromSale(item.unit, item.quantity, product);
      await db.products.update(item.productId, {
        stockPieces: product.stockPieces + added,
        costPrice: item.costPrice,
        updatedAt: now,
      });
    }

    if (input.supplierId && remaining !== 0) {
      const supplier = await db.suppliers.get(input.supplierId);
      if (supplier) {
        await db.suppliers.update(input.supplierId, {
          balance: Math.round((supplier.balance + remaining) * 100) / 100,
        });
      }
    }

    await db.purchaseInvoices.add(invoice);

    if (paid > 0) {
      await db.treasury.add({
        id: uuid(),
        date: now,
        type: 'out',
        amount: paid,
        title: `دفع فاتورة شراء ${invoiceNumber}`,
        note: input.supplierName,
        refType: 'purchase',
        refId: invoice.id,
        createdBy: input.createdBy,
      });
    }
  });

  return invoice;
}

export function buildPurchaseItem(
  product: Product,
  unit: UnitType,
  quantity: number,
  unitPrice: number,
): PurchaseCartItem {
  return {
    productId: product.id,
    productName: product.name,
    unit,
    quantity,
    unitPrice,
    costPrice: product.costPrice,
    unitFactor: product.units[unit].factor,
  };
}
