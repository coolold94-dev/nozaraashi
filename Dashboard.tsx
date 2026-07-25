import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { db } from '../db/database';
import styles from './Dashboard.module.css';

export default function DashboardPage() {
  const stats = useLiveQuery(async () => {
    const [products, customers, sales, treasuryBalance, lowStock] = await Promise.all([
      db.products.filter((p) => p.active).count(),
      db.customers.filter((c) => c.active).count(),
      db.saleInvoices.count(),
      db.treasury.toArray(),
      db.products.filter((p) => p.active && p.stockPieces <= p.minStockPieces).count(),
    ]);

    const balance = treasuryBalance.reduce((sum, t) => {
      return t.type === 'in' ? sum + t.amount : sum - t.amount;
    }, 0);

    const totalDebt = (await db.customers.toArray()).reduce((sum, c) => sum + c.balance, 0);

    return { products, customers, sales, balance, lowStock, totalDebt };
  });

  const cards = [
    { label: 'المنتجات', value: stats?.products ?? '—', link: '/inventory' },
    { label: 'العملاء', value: stats?.customers ?? '—', link: '/customers' },
    { label: 'فواتير البيع', value: stats?.sales ?? '—', link: '/reports' },
    { label: 'رصيد الخزينة', value: formatMoney(stats?.balance), link: '/treasury' },
    { label: 'مديونيات العملاء', value: formatMoney(stats?.totalDebt), link: '/customers' },
    { label: 'نواقص المخزون', value: stats?.lowStock ?? '—', link: '/inventory' },
  ];

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div>
          <h3>لوحة التحكم</h3>
          <p>نظام نوزراشى جاهز للعمل أوفلاين — المرحلة 1 مكتملة</p>
        </div>
        <Link to="/pos" className={styles.cta}>فتح نقطة البيع</Link>
      </section>

      <div className={styles.grid}>
        {cards.map((card) => (
          <Link key={card.label} to={card.link} className={styles.card}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
          </Link>
        ))}
      </div>

      <section className={styles.next}>
        <h4>المرحلة الجاية</h4>
        <ul>
          <li>فواتير بيع جملة (كرتونة / باكت / قطعة)</li>
          <li>حسابات آجل وتحصيل من العملاء</li>
          <li>مشتريات من الموردين</li>
          <li>تقارير ونسخ احتياطي كامل</li>
        </ul>
      </section>
    </div>
  );
}

function formatMoney(value?: number) {
  if (value === undefined) return '—';
  return `${value.toLocaleString('ar-EG')} ج.م`;
}
