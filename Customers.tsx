import { useLiveQuery } from 'dexie-react-hooks';
import { type FormEvent, useState } from 'react';
import { v4 as uuid } from 'uuid';
import ui from '../components/ui.module.css';
import { db } from '../db/database';
import type { Customer, CustomerType } from '../db/types';
import { customerTypeLabel, formatMoney } from '../lib/format';
import styles from './Customers.module.css';

const emptyCustomer = (): Omit<Customer, 'id' | 'createdAt'> => ({
  name: '',
  shopName: '',
  phone: '',
  type: 'semi',
  creditLimit: 10000,
  balance: 0,
  address: '',
  notes: '',
  active: true,
});

export default function CustomersPage() {
  const customers = useLiveQuery(() => db.customers.toArray(), []);
  const settings = useLiveQuery(() => db.settings.get('main'));
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState(emptyCustomer());
  const [isNew, setIsNew] = useState(false);

  const currency = settings?.currency ?? 'ج.م';

  const filtered = (customers ?? []).filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.shopName.toLowerCase().includes(q) ||
      c.phone.includes(q)
    );
  });

  const totalDebt = (customers ?? []).reduce((sum, c) => sum + c.balance, 0);

  function openNew() {
    setForm(emptyCustomer());
    setIsNew(true);
    setEditing({ id: '', createdAt: '', ...emptyCustomer() });
  }

  function openEdit(customer: Customer) {
    setForm({
      name: customer.name,
      shopName: customer.shopName,
      phone: customer.phone,
      type: customer.type,
      creditLimit: customer.creditLimit,
      balance: customer.balance,
      address: customer.address ?? '',
      notes: customer.notes ?? '',
      active: customer.active,
    });
    setIsNew(false);
    setEditing(customer);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;

    const payload: Customer = {
      id: isNew ? uuid() : editing.id,
      ...form,
      address: form.address || undefined,
      notes: form.notes || undefined,
      createdAt: isNew ? new Date().toISOString() : editing.createdAt,
    };

    await db.customers.put(payload);
    setEditing(null);
  }

  return (
    <div>
      <div className={ui.pageHeader}>
        <div>
          <h3>العملاء والآجل</h3>
          <p>إجمالي المديونيات: {formatMoney(totalDebt, currency)}</p>
        </div>
        <button type="button" className={`${ui.btn} ${ui.primary}`} onClick={openNew}>
          + عميل جديد
        </button>
      </div>

      <input
        className={`${ui.input} ${styles.search}`}
        placeholder="بحث بالاسم أو المحل أو التليفون..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className={styles.grid}>
        {filtered.map((customer) => (
          <div key={customer.id} className={`${ui.card} ${styles.card}`}>
            <div className={styles.cardTop}>
              <div>
                <strong>{customer.shopName}</strong>
                <span>{customer.name} · {customer.phone}</span>
              </div>
              <span className={`${ui.badge} ${customer.balance > 0 ? ui.badgeRed : ui.badgeGreen}`}>
                {customerTypeLabel(customer.type)}
              </span>
            </div>
            <div className={styles.stats}>
              <div>
                <span>الرصيد (آجل)</span>
                <strong>{formatMoney(customer.balance, currency)}</strong>
              </div>
              <div>
                <span>حد الائتمان</span>
                <strong>{formatMoney(customer.creditLimit, currency)}</strong>
              </div>
            </div>
            <button type="button" className={`${ui.btn} ${ui.secondary} ${ui.sm}`} onClick={() => openEdit(customer)}>
              تعديل
            </button>
          </div>
        ))}
      </div>

      {editing && (
        <div className={ui.modalBackdrop} onClick={() => setEditing(null)}>
          <form className={`${ui.card} ${ui.modal}`} onClick={(e) => e.stopPropagation()} onSubmit={handleSave}>
            <h4>{isNew ? 'عميل جديد' : 'تعديل عميل'}</h4>
            <div className={ui.grid2}>
              <label className={ui.label}>اسم المحل<input className={ui.input} required value={form.shopName} onChange={(e) => setForm({ ...form, shopName: e.target.value })} /></label>
              <label className={ui.label}>اسم المسؤول<input className={ui.input} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
              <label className={ui.label}>التليفون<input className={ui.input} required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} dir="ltr" /></label>
              <label className={ui.label}>
                النوع
                <select className={ui.select} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as CustomerType })}>
                  <option value="wholesale">جملة</option>
                  <option value="semi">نصف جملة</option>
                  <option value="retail">محلات</option>
                </select>
              </label>
              <label className={ui.label}>حد الائتمان<input type="number" min={0} className={ui.input} value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: Number(e.target.value) })} /></label>
              {!isNew && (
                <label className={ui.label}>الرصيد الحالي<input type="number" min={0} className={ui.input} value={form.balance} onChange={(e) => setForm({ ...form, balance: Number(e.target.value) })} /></label>
              )}
              <label className={ui.label}>العنوان<input className={ui.input} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label>
            </div>
            <div className={ui.modalActions}>
              <button type="button" className={`${ui.btn} ${ui.secondary}`} onClick={() => setEditing(null)}>إلغاء</button>
              <button type="submit" className={`${ui.btn} ${ui.primary}`}>حفظ</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
