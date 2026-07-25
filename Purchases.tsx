import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { v4 as uuid } from 'uuid';
import ui from '../components/ui.module.css';
import styles from './Purchases.module.css';
import { db } from '../db/database';
import type { PaymentType, Product, Supplier, UnitType } from '../db/types';
import { formatMoney, unitLabel } from '../lib/format';
import { stockLabel } from '../lib/products';
import { buildPurchaseItem, createPurchase, PurchaseError, type PurchaseCartItem } from '../lib/purchases';

const UNITS: UnitType[] = ['carton', 'pack', 'piece'];

function getUnitCost(product: Product, unit: UnitType) {
  return Math.round(product.costPrice * product.units[unit].factor * 100) / 100;
}

const emptySupplier = () => ({
  name: '',
  phone: '',
  balance: 0,
  address: '',
  notes: '',
  active: true,
});

export default function PurchasesPage() {
  const products = useLiveQuery(() => db.products.filter((p) => p.active).toArray(), []);
  const suppliers = useLiveQuery(() => db.suppliers.filter((s) => s.active).toArray(), []);
  const settings = useLiveQuery(() => db.settings.get('main'));

  const [search, setSearch] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [cart, setCart] = useState<PurchaseCartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [paid, setPaid] = useState(0);
  const [paymentType, setPaymentType] = useState<PaymentType>('cash');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pickerProduct, setPickerProduct] = useState<Product | null>(null);
  const [pickerUnit, setPickerUnit] = useState<UnitType>('carton');
  const [pickerQty, setPickerQty] = useState(1);
  const [supplierModal, setSupplierModal] = useState(false);
  const [supplierForm, setSupplierForm] = useState(emptySupplier());

  const selectedSupplier = suppliers?.find((s) => s.id === supplierId);
  const currency = settings?.currency ?? 'ج.م';

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products ?? [];
    return (products ?? []).filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.barcode.includes(q) ||
        p.sku.toLowerCase().includes(q),
    );
  }, [products, search]);

  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const total = Math.max(0, subtotal - discount);

  function openPicker(product: Product) {
    setPickerProduct(product);
    setPickerUnit('carton');
    setPickerQty(1);
    setError('');
  }

  function addToCart() {
    if (!pickerProduct) return;
    const unitPrice = getUnitCost(pickerProduct, pickerUnit);
    const item = buildPurchaseItem(pickerProduct, pickerUnit, pickerQty, unitPrice);

    setCart((prev) => {
      const existing = prev.find((line) => line.productId === item.productId && line.unit === item.unit);
      if (existing) {
        return prev.map((line) =>
          line.productId === item.productId && line.unit === item.unit
            ? { ...line, quantity: line.quantity + pickerQty }
            : line,
        );
      }
      return [...prev, item];
    });

    setPickerProduct(null);
  }

  function updateQty(key: string, quantity: number) {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((line) => line.productId !== key));
      return;
    }
    setCart((prev) => prev.map((line) => (line.productId === key ? { ...line, quantity } : line)));
  }

  function removeLine(key: string) {
    setCart((prev) => prev.filter((line) => line.productId !== key));
  }

  function handlePaymentTypeChange(type: PaymentType) {
    setPaymentType(type);
    if (type === 'cash') setPaid(total);
    if (type === 'credit') setPaid(0);
  }

  async function handleCheckout() {
    setError('');
    setSubmitting(true);

    try {
      await createPurchase({
        supplierId: supplierId || undefined,
        supplierName: selectedSupplier?.name ?? 'مورد نقدي',
        items: cart,
        discount,
        paid: paymentType === 'cash' ? total : paymentType === 'credit' ? 0 : paid,
        paymentType,
        createdBy: 'نظام',
      });
      setCart([]);
      setDiscount(0);
      setPaid(0);
      setPaymentType('cash');
      setSupplierId('');
      setError('تم حفظ فاتورة الشراء بنجاح');
    } catch (err) {
      setError(err instanceof PurchaseError ? err.message : 'حدث خطأ أثناء حفظ فاتورة الشراء');
    } finally {
      setSubmitting(false);
    }
  }

  async function addNewSupplier(e: React.FormEvent) {
    e.preventDefault();
    const payload: Supplier = {
      id: uuid(),
      name: supplierForm.name,
      phone: supplierForm.phone,
      balance: supplierForm.balance,
      address: supplierForm.address,
      notes: supplierForm.notes,
      active: true,
      createdAt: new Date().toISOString(),
    };
    await db.suppliers.add(payload);
    setSupplierModal(false);
    setSupplierForm(emptySupplier());
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h3>المشتريات</h3>
          <p>أضف منتجات من المورد، وحدد الكمية ونوع الوحدة وتمويل الدفع.</p>
        </div>
        <div className={styles.actions}>
          <button type="button" className={`${ui.btn} ${ui.secondary}`} onClick={() => setSupplierModal(true)}>
            مورد جديد
          </button>
          <button type="button" className={`${ui.btn} ${ui.primary}`} onClick={handleCheckout} disabled={submitting || cart.length === 0}>
            {submitting ? 'جاري الحفظ...' : 'حفظ فاتورة'}
          </button>
        </div>
      </div>

      <div className={styles.topBar}>
        <div className={styles.selectBlock}>
          <label className={ui.label}>
            اختر المورد
            <select className={ui.select} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">مورد نقدي</option>
              {(suppliers ?? []).map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name} — {supplier.phone}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className={styles.totals}>
          <div><span>الإجمالي</span><strong>{formatMoney(subtotal, currency)}</strong></div>
          <div><span>الخصم</span><strong>{formatMoney(discount, currency)}</strong></div>
          <div className={styles.totalValue}><span>الصافي</span><strong>{formatMoney(total, currency)}</strong></div>
        </div>
      </div>

      <div className={styles.bodyGrid}>
        <section className={styles.catalog}>
          <input
            className={`${ui.input} ${styles.search}`}
            placeholder="بحث في المنتجات..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className={styles.productGrid}>
            {(filteredProducts ?? []).map((product) => (
              <button key={product.id} type="button" className={styles.productCard} onClick={() => openPicker(product)}>
                <strong>{product.name}</strong>
                <span>{stockLabel(product.stockPieces, product)}</span>
                <span className={styles.productPrice}>{formatMoney(getUnitCost(product, 'carton'), currency)} / كرتونة</span>
              </button>
            ))}
            {filteredProducts && filteredProducts.length === 0 && <div className={ui.empty}>لا توجد منتجات مطابقة</div>}
          </div>
        </section>

        <aside className={styles.cart}>
          <div className={styles.cartHeader}>
            <h4>سلة الشراء</h4>
            <span className={`${ui.badge} ${ui.badgeGreen}`}>{selectedSupplier?.name ?? 'مورد نقدي'}</span>
          </div>

          <div className={styles.lines}>
            {cart.length === 0 && <div className={ui.empty}>أضف منتجات لتكوين الفاتورة</div>}
            {cart.map((line) => (
              <div key={line.productId} className={styles.line}>
                <div className={styles.lineInfo}>
                  <strong>{line.productName}</strong>
                  <span>{unitLabel(line.unit)} · {formatMoney(line.unitPrice, currency)}</span>
                </div>
                <div className={styles.lineActions}>
                  <input
                    type="number"
                    min={1}
                    className={styles.qtyInput}
                    value={line.quantity}
                    onChange={(e) => updateQty(line.productId, Number(e.target.value))}
                  />
                  <strong>{formatMoney(line.unitPrice * line.quantity, currency)}</strong>
                  <button type="button" className={styles.removeBtn} onClick={() => removeLine(line.productId)}>×</button>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.summary}>
            <div className={styles.row}><span>طريقة الدفع</span></div>
            <div className={styles.paymentTabs}>
              {(['cash', 'credit', 'partial'] as PaymentType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  className={paymentType === type ? styles.tabActive : styles.tab}
                  onClick={() => handlePaymentTypeChange(type)}
                  disabled={type !== 'cash' && !supplierId}
                >
                  {type === 'cash' ? 'كاش' : type === 'credit' ? 'آجل' : 'جزئي'}
                </button>
              ))}
            </div>

            {paymentType === 'partial' && (
              <label className={ui.label}>
                المدفوع الآن
                <input
                  type="number"
                  min={0}
                  max={total}
                  className={ui.input}
                  value={paid || ''}
                  onChange={(e) => setPaid(Number(e.target.value) || 0)}
                />
              </label>
            )}

            {error && <div className={styles.error}>{error}</div>}
          </div>
        </aside>
      </div>

      {pickerProduct && (
        <div className={ui.modalBackdrop} onClick={() => setPickerProduct(null)}>
          <div className={`${ui.card} ${ui.modal}`} onClick={(e) => e.stopPropagation()}>
            <h4>{pickerProduct.name}</h4>
            <div className={styles.pickerUnits}>
              {UNITS.map((unit) => (
                <button
                  key={unit}
                  type="button"
                  className={pickerUnit === unit ? styles.unitActive : styles.unitBtn}
                  onClick={() => setPickerUnit(unit)}
                >
                  {unitLabel(unit)}
                  <small>{formatMoney(getUnitCost(pickerProduct, unit), currency)}</small>
                </button>
              ))}
            </div>
            <label className={ui.label}>
              الكمية
              <input
                type="number"
                min={1}
                className={ui.input}
                value={pickerQty}
                onChange={(e) => setPickerQty(Math.max(1, Number(e.target.value) || 1))}
              />
            </label>
            <div className={ui.modalActions}>
              <button type="button" className={`${ui.btn} ${ui.secondary}`} onClick={() => setPickerProduct(null)}>
                إلغاء
              </button>
              <button type="button" className={`${ui.btn} ${ui.primary}`} onClick={addToCart}>
                إضافة
              </button>
            </div>
          </div>
        </div>
      )}

      {supplierModal && (
        <div className={ui.modalBackdrop} onClick={() => setSupplierModal(false)}>
          <form className={`${ui.card} ${ui.modal}`} onClick={(e) => e.stopPropagation()} onSubmit={addNewSupplier}>
            <h4>مورد جديد</h4>
            <label className={ui.label}>
              اسم المورد
              <input className={ui.input} required value={supplierForm.name} onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })} />
            </label>
            <label className={ui.label}>
              التليفون
              <input className={ui.input} required value={supplierForm.phone} onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })} dir="ltr" />
            </label>
            <label className={ui.label}>
              الرصيد الابتدائي
              <input type="number" min={0} className={ui.input} value={supplierForm.balance} onChange={(e) => setSupplierForm({ ...supplierForm, balance: Number(e.target.value) })} />
            </label>
            <div className={ui.modalActions}>
              <button type="button" className={`${ui.btn} ${ui.secondary}`} onClick={() => setSupplierModal(false)}>
                إلغاء
              </button>
              <button type="submit" className={`${ui.btn} ${ui.primary}`}>
                حفظ المورد
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
