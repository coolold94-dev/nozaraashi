import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { db } from '../db/database';
import { formatMoney } from '../lib/format';
import styles from './Reports.module.css';

export default function ReportsPage() {
  const stats = useLiveQuery(async () => {
    const [sales, purchases, treasury, customers] = await Promise.all([
      db.saleInvoices.count(),
      db.purchaseInvoices.count(),
      db.treasury.toArray(),
      db.customers.filter((c) => c.active).toArray(),
    ]);
    const treasuryBalance = treasury.reduce((sum, t) => {
      if (t.type === 'in') return sum + t.amount;
      return sum - t.amount;
    }, 0);
    const totalDebt = customers.reduce((sum, c) => sum + c.balance, 0);
    return { sales, purchases, treasuryBalance, totalDebt };
  });

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h3>التقارير</h3>
          <p>نظرة عامة سريعة على الحالة المالية والمخزون.</p>
        </div>
        <Link to="/backup" className={`${styles.link} ${styles.primary}`}>
          تصدير بيانات
        </Link>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.card}>
          <span>فواتير البيع</span>
          <strong>{stats?.sales ?? '—'}</strong>
        </div>
        <div className={styles.card}>
          <span>فواتير الشراء</span>
          <strong>{stats?.purchases ?? '—'}</strong>
        </div>
        <div className={styles.card}>
          <span>رصيد الخزينة</span>
          <strong>{formatMoney(stats?.treasuryBalance ?? 0)}</strong>
        </div>
        <div className={styles.card}>
          <span>مديونيات العملاء</span>
          <strong>{formatMoney(stats?.totalDebt ?? 0)}</strong>
        </div>
      </div>

      <section className={styles.section}>
        <h4>قائمة التعليقات</h4>
        <p className={styles.note}>يمكن استخدام الصفحة الحالية كأساس لتقارير مفصلة لاحقاً.</p>
      </section>
    </div>
  );
}
