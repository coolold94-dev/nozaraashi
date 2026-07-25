import { useState } from 'react';
import { db } from '../db/database';
import styles from './Backup.module.css';

export async function exportDatabase() {
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    users: await db.users.toArray(),
    products: await db.products.toArray(),
    customers: await db.customers.toArray(),
    suppliers: await db.suppliers.toArray(),
    saleInvoices: await db.saleInvoices.toArray(),
    purchaseInvoices: await db.purchaseInvoices.toArray(),
    treasury: await db.treasury.toArray(),
    settings: await db.settings.toArray(),
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `nozraashi-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function BackupPage() {
  const [message, setMessage] = useState('');

  async function handleExport() {
    await exportDatabase();
    setMessage('تم تصدير النسخة الاحتياطية بنجاح');
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      await db.transaction('rw', db.tables, async () => {
          await Promise.all([
            db.users.clear(),
            db.products.clear(),
            db.customers.clear(),
            db.suppliers.clear(),
            db.saleInvoices.clear(),
            db.purchaseInvoices.clear(),
            db.treasury.clear(),
            db.settings.clear(),
          ]);

          await db.users.bulkAdd(data.users ?? []);
          await db.products.bulkAdd(data.products ?? []);
          await db.customers.bulkAdd(data.customers ?? []);
          await db.suppliers.bulkAdd(data.suppliers ?? []);
          await db.saleInvoices.bulkAdd(data.saleInvoices ?? []);
          await db.purchaseInvoices.bulkAdd(data.purchaseInvoices ?? []);
          await db.treasury.bulkAdd(data.treasury ?? []);
          await db.settings.bulkAdd(data.settings ?? []);
      });

      setMessage('تم استيراد النسخة الاحتياطية بنجاح');
    } catch {
      setMessage('فشل الاستيراد — تأكد من صحة الملف');
    }

    e.target.value = '';
  }

  return (
    <div className={styles.page}>
      <h3>نسخ احتياطي واسترجاع</h3>
      <p>صدّر كل بيانات نوزراشى لملف JSON أو استرجع نسخة سابقة.</p>

      <div className={styles.actions}>
        <button type="button" onClick={handleExport}>تصدير نسخة احتياطية</button>
        <label className={styles.importBtn}>
          استيراد نسخة
          <input type="file" accept="application/json,.json" onChange={handleImport} hidden />
        </label>
      </div>

      {message && <p className={styles.message}>{message}</p>}
    </div>
  );
}
