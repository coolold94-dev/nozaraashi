import { useLiveQuery } from 'dexie-react-hooks';
import { type FormEvent, useState } from 'react';
import { v4 as uuid } from 'uuid';
import ui from '../components/ui.module.css';
import { db } from '../db/database';
import type { Product } from '../db/types';
import { formatMoney } from '../lib/format';
import { isLowStock, stockLabel } from '../lib/products';
import styles from './Inventory.module.css';

const emptyProduct = (): Omit<Product, 'id' | 'createdAt' | 'updatedAt'> => ({
  name: '',
  barcode: '',
  sku: '',
  units: { carton: { factor: 24 }, pack: { factor: 6 }, piece: { factor: 1 } },
  prices: { wholesale: 0, semiWholesale: 0, retail: 0 },
  costPrice: 0,
  stockPieces: 0,
  minStockPieces: 0,
  category: '',
  active: true,
});

export default function InventoryPage() {
  const products = useLiveQuery(() => db.products.toArray(), []);
  const settings = useLiveQuery(() => db.settings.get('main'));
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyProduct());
  const [isNew, setIsNew] = useState(false);

  const currency = settings?.currency ?? 'ج.م';

  const filtered = (products ?? []).filter((p) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return p.name.toLowerCase().includes(q) || p.barcode.includes(q) || p.sku.toLowerCase().includes(q);
  });

  function openNew() {
    setForm(emptyProduct());
    setIsNew(true);
    setEditing({ id: '', createdAt: '', updatedAt: '', ...emptyProduct() });
  }

  function openEdit(product: Product) {
    setForm({
      name: product.name,
      barcode: product.barcode,
      sku: product.sku,
      units: product.units,
      prices: product.prices,
      costPrice: product.costPrice,
      stockPieces: product.stockPieces,
      minStockPieces: product.minStockPieces,
      category: product.category ?? '',
      active: product.active,
    });
    setIsNew(false);
    setEditing(product);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;

    const now = new Date().toISOString();
    const payload: Product = {
      id: isNew ? uuid() : editing.id,
      ...form,
      category: form.category || undefined,
      createdAt: isNew ? now : editing.createdAt,
      updatedAt: now,
    };

    await db.products.put(payload);
    setEditing(null);
  }

  return (
    <div>
      <div className={ui.pageHeader}>
        <div>
          <h3>المخزون</h3>
          <p>إدارة المنتجات والوحدات والأسعار</p>
        </div>
        <button type="button" className={`${ui.btn} ${ui.primary}`} onClick={openNew}>
          + منتج جديد
        </button>
      </div>

      <input
        className={`${ui.input} ${styles.search}`}
        placeholder="بحث في المخزون..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>المنتج</th>
              <th>المخزون</th>
              <th>جملة</th>
              <th>نصف جملة</th>
              <th>محلات</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((product) => (
              <tr key={product.id}>
                <td>
                  <strong>{product.name}</strong>
                  <span className={styles.sub}>{product.sku} · {product.category ?? '—'}</span>
                  {isLowStock(product) && (
                    <span className={`${ui.badge} ${ui.badgeYellow}`}>نقص</span>
                  )}
                </td>
                <td>{stockLabel(product.stockPieces, product)}</td>
                <td>{formatMoney(product.prices.wholesale, currency)}</td>
                <td>{formatMoney(product.prices.semiWholesale, currency)}</td>
                <td>{formatMoney(product.prices.retail, currency)}</td>
                <td>
                  <button type="button" className={`${ui.btn} ${ui.ghost} ${ui.sm}`} onClick={() => openEdit(product)}>
                    تعديل
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className={ui.modalBackdrop} onClick={() => setEditing(null)}>
          <form className={`${ui.card} ${ui.modal}`} onClick={(e) => e.stopPropagation()} onSubmit={handleSave}>
            <h4>{isNew ? 'منتج جديد' : 'تعديل منتج'}</h4>

            <div className={ui.grid2}>
              <label className={ui.label}>
                الاسم
                <input className={ui.input} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </label>
              <label className={ui.label}>
                التصنيف
                <input className={ui.input} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              </label>
              <label className={ui.label}>
                الباركود
                <input className={ui.input} value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} dir="ltr" />
              </label>
              <label className={ui.label}>
                الكود
                <input className={ui.input} value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} dir="ltr" />
              </label>
            </div>

            <p className={styles.sectionTitle}>الوحدات (بالقطعة)</p>
            <div className={ui.grid2}>
              <label className={ui.label}>كرتونة = <input type="number" min={1} className={ui.input} value={form.units.carton.factor} onChange={(e) => setForm({ ...form, units: { ...form.units, carton: { factor: Number(e.target.value) } } })} /></label>
              <label className={ui.label}>باكت = <input type="number" min={1} className={ui.input} value={form.units.pack.factor} onChange={(e) => setForm({ ...form, units: { ...form.units, pack: { factor: Number(e.target.value) } } })} /></label>
            </div>

            <p className={styles.sectionTitle}>أسعار الكرتونة</p>
            <div className={ui.grid2}>
              <label className={ui.label}>جملة<input type="number" min={0} className={ui.input} value={form.prices.wholesale} onChange={(e) => setForm({ ...form, prices: { ...form.prices, wholesale: Number(e.target.value) } })} /></label>
              <label className={ui.label}>نصف جملة<input type="number" min={0} className={ui.input} value={form.prices.semiWholesale} onChange={(e) => setForm({ ...form, prices: { ...form.prices, semiWholesale: Number(e.target.value) } })} /></label>
              <label className={ui.label}>محلات<input type="number" min={0} className={ui.input} value={form.prices.retail} onChange={(e) => setForm({ ...form, prices: { ...form.prices, retail: Number(e.target.value) } })} /></label>
              <label className={ui.label}>تكلفة (قطعة)<input type="number" min={0} className={ui.input} value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: Number(e.target.value) })} /></label>
            </div>

            <div className={ui.grid2}>
              <label className={ui.label}>المخزون (قطعة)<input type="number" min={0} className={ui.input} value={form.stockPieces} onChange={(e) => setForm({ ...form, stockPieces: Number(e.target.value) })} /></label>
              <label className={ui.label}>حد التنبيه<input type="number" min={0} className={ui.input} value={form.minStockPieces} onChange={(e) => setForm({ ...form, minStockPieces: Number(e.target.value) })} /></label>
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
