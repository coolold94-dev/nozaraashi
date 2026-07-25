import { db } from '../db/database';

export async function nextInvoiceNumber(prefix: string): Promise<string> {
  const today = new Date();
  const datePart = today.toISOString().slice(0, 10).replace(/-/g, '');
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

  const todayCount = await db.saleInvoices
    .where('date')
    .between(start, end, true, false)
    .count();

  const seq = String(todayCount + 1).padStart(3, '0');
  return `${prefix}-${datePart}-${seq}`;
}
