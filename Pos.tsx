import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import InvoicePrint, { printInvoice } from '../components/InvoicePrint';
import ui from '../components/ui.module.css';
import { useAuth } from '../context/AuthContext';
import { db } from '../db/database';
import type { CustomerType, PaymentType, Product, SaleInvoice, UnitType } from '../db/types';
import { formatMoney, unitLabel } from '../lib/format';
import { getUnitPrice, stockLabel } from '../lib/products';
import { buildCartItem, createSale, type SaleCartItem, SaleError } from '../lib/sales';

import styles from './Pos.module.css';

interface LocalCartItem extends SaleCartItem {
  key: string;
}

const UNITS: UnitType[] = ['carton', 'pack', 'piece'];

export default function PosPage() {
  const { user } = useAuth();
  const products = useLiveQuery(() => db.products.filter((p) => p.active).toArray(), []);
  const customers = useLiveQuery(() => db.customers.filter((c) => c.active).toArray(), []);
  const settings = useLiveQuery(() => db.settings.get('main'));

  const [search, setSearch] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [cart, setCart] = useState<LocalCartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [paid, setPaid] = useState(0);
  const [paymentType, setPaymentType] = useState<PaymentType>('cash');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lastInvoice, setLastInvoice] = useState<SaleInvoice | null>(null);
  const [pickerProduct, setPickerProduct] = useState<Product | null>(null);
  const [pickerUnit, setPickerUnit] = useState<UnitType>('carton');
  const [pickerQty, setPickerQty] = useState(1);

  const selectedCustomer = customers?.find((c) => c.id === customerId);
  const customerType: CustomerType | 'walkin' = selectedCustomer?.type ?? 'walkin';
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
    const item = buildCartItem(pickerProduct, pickerUnit, pickerQty, customerType);
    const key = `${item.productId}-${item.unit}`;

    setCart((prev) => {
      const existing = prev.find((line) => line.key === key);
      if (existing) {
        return prev.map((line) =>
          line.key === key
            ? { ...line, quantity: line.quantity + pickerQty }
            : line,
        );
      }
      return [...prev, { ...item, key }];
    });

    setPickerProduct(null);
  }

  function updateQty(key: string, quantity: number) {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((line) => line.key !== key));
      return;
    }
    setCart((prev) => prev.map((line) => (line.key === key ? { ...line, quantity } : line)));
  }

  function removeLine(key: string) {
    setCart((prev) => prev.filter((line) => line.key !== key));
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
      const invoice = await createSale({
        customerId: customerId || undefined,
        customerName: selectedCustomer?.shopName ?? selectedCustomer?.name ?? 'عميل نقدي',
        items: cart,
        discount,
        paid: paymentType === 'cash' ? total : paymentType === 'credit' ? 0 : paid,
        paymentType,
        createdBy: user?.name ?? '—',
      });

      setLastInvoice(invoice);
      setCart([]);
      setDiscount(0);
      setPaid(0);
      setPaymentType('cash');
      setTimeout(printInvoice, 150);
    } catch (err) {
      setError(err instanceof SaleError ? err.message : 'حدث خطأ أثناء حفظ الفاتورة');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <section className={styles.catalog}>
        <div className={styles.catalogHeader}>
          <div>
            <h3>بيع جملة</h3>
            <p>ابحث وأضف بالكرتونة أو الباكت أو القطعة</p>
          </div>
          <select
            className={ui.select}
            value={customerId}
            onChange={(e) => {
              setCustomerId(e.target.value);
              setCart([]);
            }}
          >
            <option value="">عميل نقدي</option>
            {(customers ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.shopName} — {c.name}
              </option>
            ))}
          </select>
        </div>

        <input
          className={`${ui.input} ${styles.search}`}
          placeholder="بحث: اسم، باركود، كود..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />

        <div className={styles.productGrid}>
          {filteredProducts.map((product) => (
            <button
              key={product.id}
              type="button"
              className={styles.productCard}
              onClick={() => openPicker(product)}
            >
              <strong>{product.name}</strong>
              <span className={styles.productMeta}>{product.category ?? product.sku}</span>
              <span className={styles.productStock}>{stockLabel(product.stockPieces, product)}</span>
              <span className={styles.productPrice}>
                {formatMoney(getUnitPrice(product, 'carton', customerType), currency)} / كرتونة
              </span>
            </button>
          ))}
          {filteredProducts.length === 0 && (
            <div className={ui.empty}>لا توجد منتجات مطابقة</div>
          )}
        </div>
      </section>

      <aside className={styles.cart}>
        <div className={styles.cartHeader}>
          <h4>الفاتورة</h4>
          {selectedCustomer && (
            <span className={`${ui.badge} ${ui.badgeGreen}`}>
              {selectedCustomer.shopName}
            </span>
          )}
        </div>

        <div className={styles.lines}>
          {cart.length === 0 && <div className={ui.empty}>لم تُضف أصناف بعد</div>}
          {cart.map((line) => (
            <div key={line.key} className={styles.line}>
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
                  onChange={(e) => updateQty(line.key, Number(e.target.value))}
                />
                <strong>{formatMoney(line.unitPrice * line.quantity, currency)}</strong>
                <button type="button" className={styles.removeBtn} onClick={() => removeLine(line.key)}>×</button>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.summary}>
            <div className={styles.row}><span>الإجمالي</span><span>{formatMoney(subtotal, currency)}</span></div>
            <div className={styles.row}><span>الخصم</span><span>{formatMoney(discount, currency)}</span></div>

            <label className={ui.label}>
              خصم (ج.م)
              <input
                type="number"
                min={0}
                step={0.01}
                className={ui.input}
                value={discount || ''}
                onChange={(e) => setDiscount(Number(e.target.value) || 0)}
              />
            </label>

            <div className={styles.rowTotal}><span>الصافي</span><span>{formatMoney(total, currency)}</span></div>
          <div className={styles.paymentTabs}>
            {(['cash', 'credit', 'partial'] as PaymentType[]).map((type) => (
              <button
                key={type}
                type="button"
                className={paymentType === type ? styles.tabActive : styles.tab}
                onClick={() => handlePaymentTypeChange(type)}
                disabled={type !== 'cash' && !customerId}
              >
                {type === 'cash' ? 'كاش' : type === 'credit' ? 'آجل' : 'جزئي'}
              </button>
            ))}
          </div>

          {paymentType === 'partial' && (
            <label className={ui.label}>
              المدفوع الآن (ج.م)
              <input
                type="number"
                min={0}
                step={0.01}
                max={total}
                className={ui.input}
                value={paid || ''}
                onChange={(e) => setPaid(Number(e.target.value) || 0)}
              />
            </label>
          )}

          {error && <div className={styles.error}>{error}</div>}

          <button
            type="button"
            className={`${ui.btn} ${ui.primary} ${ui.full} ${ui.lg}`}
            disabled={submitting || cart.length === 0}
            onClick={handleCheckout}
          >
            {submitting ? 'جاري الحفظ...' : 'إتمام البيع وطباعة'}
          </button>
        </div>
      </aside>

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
                  <small>{formatMoney(getUnitPrice(pickerProduct, unit, customerType), currency)}</small>
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
                إضافة للفاتورة
              </button>
            </div>
          </div>
        </div>
      )}

      {lastInvoice && settings && (
        <InvoicePrint
          invoice={lastInvoice}
          storeName={settings.storeName}
          storePhone={settings.storePhone}
          storeAddress={settings.storeAddress}
          currency={settings.currency}
        />
      )}
    </div>
  );
}
