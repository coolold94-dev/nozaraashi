import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { v4 as uuid } from 'uuid';
import ui from '../components/ui.module.css';
import { db } from '../db/database';
import type { TreasuryTransaction } from '../db/types';
import { formatMoney } from '../lib/format';
import styles from './Treasury.module.css';

const emptyTransaction = () => ({
  type: 'expense' as const,
  title: '',
  amount: 0,
  note: '',
});

type TreasuryFormState = {
  type: TreasuryTransaction['type'];
  title: string;
  amount: number;
  note: string;
};

export default function TreasuryPage() {
  const [form, setForm] = useState<TreasuryFormState>(emptyTransaction());
  const [message, setMessage] = useState('');
  const transactions = useLiveQuery(() => db.treasury.orderBy('date').reverse().toArray(), []);

  const balance = (transactions ?? []).reduce((sum, t) => {
    if (t.type === 'in') return sum + t.amount;
    if (t.type === 'out' || t.type === 'expense') return sum - t.amount;
    return sum;
  }, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const now = new Date().toISOString();
    await db.treasury.add({
      id: uuid(),
      date: now,
      type: form.type,
      amount: form.amount,
      title: form.title,
      note: form.note || undefined,
      createdBy: 'نظام',
    });
    setMessage('تم إضافة العملية بنجاح');
    setForm(emptyTransaction());
    setTimeout(() => setMessage(''), 3000);
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h3>الخزينة</h3>
          <p>تابع حركة الأموال بوضوح وسجل العمليات اليدوية.</p>
        </div>
        <div className={styles.balanceCard}>
          <span>الرصيد الحالي</span>
          <strong>{formatMoney(balance)}</strong>
        </div>
      </div>

      <div className={styles.layout}>
        <form className={styles.form} onSubmit={handleSubmit}>
          <h4>عملية خزينة جديدة</h4>
          <label className={ui.label}>
            نوع العملية
            <select className={ui.select} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as TreasuryTransaction['type'] })}>
              <option value="in">قبض</option>
              <option value="out">صرف</option>
              <option value="expense">مصروف</option>
            </select>
          </label>
          <label className={ui.label}>
            العنوان
            <input className={ui.input} required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </label>
          <label className={ui.label}>
            المبلغ
            <input type="number" min={0} className={ui.input} required value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
          </label>
          <label className={ui.label}>
            ملاحظة
            <input className={ui.input} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </label>
          <button type="submit" className={`${ui.btn} ${ui.primary}`}>حفظ العملية</button>
          {message && <p className={styles.message}>{message}</p>}
        </form>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>نوع</th>
                <th>العنوان</th>
                <th>المبلغ</th>
              </tr>
            </thead>
            <tbody>
              {(transactions ?? []).map((tx) => (
                <tr key={tx.id}>
                  <td>{new Date(tx.date).toLocaleString('ar-EG')}</td>
                  <td>{tx.type === 'in' ? 'قبض' : tx.type === 'out' ? 'صرف' : 'مصروف'}</td>
                  <td>{tx.title}</td>
                  <td>{formatMoney(tx.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
