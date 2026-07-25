import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth, useRequireRole } from '../context/AuthContext';
import styles from './Layout.module.css';

const navItems = [
  { to: '/', label: 'لوحة التحكم', icon: '📊', roles: ['admin', 'cashier', 'warehouse'] },
  { to: '/pos', label: 'بيع جملة', icon: '🧾', roles: ['admin', 'cashier'] },
  { to: '/inventory', label: 'المخزون', icon: '📦', roles: ['admin', 'warehouse'] },
  { to: '/customers', label: 'العملاء والآجل', icon: '👥', roles: ['admin', 'cashier'] },
  { to: '/purchases', label: 'المشتريات', icon: '🛒', roles: ['admin', 'warehouse'] },
  { to: '/treasury', label: 'الخزينة', icon: '💰', roles: ['admin', 'cashier'] },
  { to: '/reports', label: 'التقارير', icon: '📈', roles: ['admin'] },
  { to: '/backup', label: 'نسخ احتياطي', icon: '💾', roles: ['admin'] },
  { to: '/settings', label: 'الإعدادات', icon: '⚙️', roles: ['admin'] },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = useRequireRole('admin');

  const visibleNav = navItems.filter((item) => user && item.roles.includes(user.role));

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <div className={styles.logo}>ن</div>
          <div>
            <h1>نوزراشى</h1>
            <p>نظام جملة • أوفلاين</p>
          </div>
        </div>

        <nav className={styles.nav}>
          {visibleNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
              }
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className={styles.userBox}>
          <div>
            <strong>{user?.name}</strong>
            <span>{roleLabel(user?.role)}</span>
          </div>
          <button type="button" onClick={() => { logout(); navigate('/login'); }}>
            خروج
          </button>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.topbar}>
          <div>
            <h2>مرحباً، {user?.name}</h2>
            <p>{isAdmin ? 'صلاحيات مدير كاملة' : 'وضع تشغيل أوفلاين'}</p>
          </div>
          <span className={styles.offlineBadge}>● أوفلاين</span>
        </header>
        <div className={styles.content}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function roleLabel(role?: string) {
  switch (role) {
    case 'admin':
      return 'مدير';
    case 'cashier':
      return 'كاشير';
    case 'warehouse':
      return 'مخزن';
    default:
      return '';
  }
}
