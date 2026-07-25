import styles from './Placeholder.module.css';

interface PlaceholderPageProps {
  title: string;
  description: string;
}

export default function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className={styles.page}>
      <h3>{title}</h3>
      <p>{description}</p>
      <span className={styles.badge}>قريباً — المرحلة 2</span>
    </div>
  );
}
