import styles from './Loading.module.css';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  return <div className={`${styles.spinner} ${styles[size]} ${className}`} />;
}

export function LoadingCenter({ size = 'md' }: SpinnerProps) {
  return (
    <div className={styles.center}>
      <Spinner size={size} />
    </div>
  );
}

interface SkeletonProps {
  width?: string;
  height?: string;
  className?: string;
}

export function Skeleton({ width = '100%', height = '16px', className = '' }: SkeletonProps) {
  return <div className={`${styles.skeleton} ${className}`} style={{ width, height }} />;
}
