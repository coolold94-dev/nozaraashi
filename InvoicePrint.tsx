import type { SaleInvoice } from '../db/types';
import { formatDateTime, formatMoney, paymentTypeLabel, unitLabel } from '../lib/format';
import styles from './InvoicePrint.module.css';

interface InvoicePrintProps {
  invoice: SaleInvoice;
  storeName: string;
  storePhone: string;
  storeAddress: string;
  currency: string;
}

export default function InvoicePrint({
  invoice,
  storeName,
  storePhone,
  storeAddress,
  currency,
}: InvoicePrintProps) {
  return (
    <div className={styles.printArea} id="invoice-print">
      <div className={styles.header}>
        <div>
          <h1>{storeName}</h1>
          <p>{storeAddress}</p>
          <p>{storePhone}</p>
        </div>
        <div className={styles.meta}>
          <strong>{invoice.invoiceNumber}</strong>
          <span>{formatDateTime(invoice.date)}</span>
        </div>
      </div>

      <div className={styles.customer}>
        <span>العميل: {invoice.customerName}</span>
        <span>الدفع: {paymentTypeLabel(invoice.paymentType)}</span>
      </div>

      <div className={styles.items}>
        {invoice.items.map((item, i) => (
          <div key={`${item.productId}-${i}`} className={styles.item}>
            <div className={styles.itemHeader}>
              <span>{item.productName}</span>
              <strong>{formatMoney(item.total, currency)}</strong>
            </div>
            <div className={styles.itemDetails}>
              <span>{unitLabel(item.unit)}</span>
              <span>{item.quantity} × {formatMoney(item.unitPrice, currency)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.totals}>
        <div><span>الإجمالي</span><span>{formatMoney(invoice.subtotal, currency)}</span></div>
        {invoice.discount > 0 && (
          <div><span>الخصم</span><span>- {formatMoney(invoice.discount, currency)}</span></div>
        )}
        <div className={styles.grand}><span>الصافي</span><span>{formatMoney(invoice.total, currency)}</span></div>
        <div><span>المدفوع</span><span>{formatMoney(invoice.paid, currency)}</span></div>
        {invoice.remaining > 0 && (
          <div><span>المتبقي (آجل)</span><span>{formatMoney(invoice.remaining, currency)}</span></div>
        )}
      </div>

      <p className={styles.footer}>شكراً لتعاملكم مع {storeName}</p>
    </div>
  );
}

export function printInvoice() {
  window.print();
}
