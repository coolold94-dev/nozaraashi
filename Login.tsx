import { type FormEvent, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './Login.module.css';

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('1234');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    const result = await login(username, password);
    if (!result.ok) setError(result.error ?? 'فشل تسجيل الدخول');
    setSubmitting(false);
  }

  return (
    <div className={styles.page}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <div className={styles.logo}>ن</div>
        <h1>نوزراشى</h1>
        <p>نظام إدارة سوبر ماركت جملة — يعمل أوفلاين</p>

        {error && <div className={styles.error}>{error}</div>}

        <label>
          اسم المستخدم
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            dir="ltr"
          />
        </label>

        <label>
          كلمة المرور
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            dir="ltr"
          />
        </label>

        <button type="submit" disabled={submitting || loading}>
          {submitting ? 'جاري الدخول...' : 'دخول'}
        </button>

        <small className={styles.hint}>
          تجريبي: admin / 1234 — cashier / 1234
        </small>
      </form>
    </div>
  );
}
