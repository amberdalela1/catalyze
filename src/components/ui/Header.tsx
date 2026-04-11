import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Header.module.css';

function ChevronLeftIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path fill="currentColor" d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
    </svg>
  );
}

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
          <ChevronLeftIcon size={22} />
          <span>Back</span>
        </button>
      ) : (
        <div className={styles.placeholder} />
      )}
      <h1 className={styles.title}>{title}</h1>
      <div className={styles.actions}>{actions || <div className={styles.placeholder} />}</div>
    </header>
  );
}
