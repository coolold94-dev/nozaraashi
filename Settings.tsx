import { type FormEvent, useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import type { AppSettings } from '../db/types';
import styles from './Settings.module.css';

export default function SettingsPage() {
  const settings = useLiveQuery(() => db.settings.get('main'));
  const [form, setForm] = useState<AppSettings | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    await db.settings.put(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!form) return <p>جاري التحميل...</p>;

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <h3>إعدادات المحل</h3>

      <label>
        اسم المحل
        <input
          value={form.storeName}
          onChange={(e) => setForm({ ...form, storeName: e.target.value })}
        />
      </label>

      <label>
        التليفون
        <input
          value={form.storePhone}
          onChange={(e) => setForm({ ...form, storePhone: e.target.value })}
        />
      </label>

      <label>
        العنوان
        <input
          value={form.storeAddress}
          onChange={(e) => setForm({ ...form, storeAddress: e.target.value })}
        />
      </label>

      <label>
        بادئة الفاتورة
        <input
          value={form.invoicePrefix}
          onChange={(e) => setForm({ ...form, invoicePrefix: e.target.value })}
          dir="ltr"
        />
      </label>

      <label className={styles.checkbox}>
        <input
          type="checkbox"
          checked={form.lowStockAlert}
          onChange={(e) => setForm({ ...form, lowStockAlert: e.target.checked })}
        />
        تنبيه عند نقص المخزون
      </label>

      <button type="submit">حفظ الإعدادات</button>
      {saved && <span className={styles.saved}>تم الحفظ ✓</span>}
    </form>
  );
}
