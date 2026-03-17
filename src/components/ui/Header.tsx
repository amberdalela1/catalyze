import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Header.module.css';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  actions?: ReactNode;
}

export default function Header({ title, showBack = false, actions }: HeaderProps) {
  const navigate = useNavigate();

  return (
    <header className={styles.header}>
      {showBack ? (
        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          ← Back
        </button>
      ) : (
        <div className={styles.placeholder} />
      )}
      <h1 className={styles.title}>{title}</h1>
      <div className={styles.actions}>{actions || <div className={styles.placeholder} />}</div>
    </header>
  );
}
