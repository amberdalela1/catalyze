import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Card.module.css';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  clickable?: boolean;
}

export default function Card({ clickable, className = '', children, ...props }: CardProps) {
  return (
    <div
      className={`${styles.card} ${clickable ? styles.clickable : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardBody({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`${styles.cardBody} ${className}`}>{children}</div>;
}

export function CardHeader({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`${styles.cardHeader} ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`${styles.cardFooter} ${className}`}>{children}</div>;
}
