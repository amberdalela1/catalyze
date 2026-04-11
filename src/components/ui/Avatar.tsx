import styles from './Avatar.module.css';

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
}

export default function Avatar({ src, name, size = 'md', className = '', onClick }: AvatarProps) {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className={`${styles.avatar} ${styles[size]} ${className}`} onClick={onClick} style={onClick ? { cursor: 'pointer' } : undefined}>
      {src ? <img src={src} alt={name} /> : initials}
    </div>
  );
}
