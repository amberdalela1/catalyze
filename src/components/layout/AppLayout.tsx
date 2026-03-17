import { Outlet, NavLink } from 'react-router-dom';
import styles from './AppLayout.module.css';

const tabs = [
  { to: '/feed', label: 'Feed', icon: '🏠' },
  { to: '/search', label: 'Discover', icon: '🔍' },
  { to: '/partnerships', label: 'Partners', icon: '🤝' },
  { to: '/my-org', label: 'My Org', icon: '👤' },
];

export default function AppLayout() {
  return (
    <div className={styles.layout}>
      <div className={styles.content}>
        <Outlet />
      </div>
      <nav className={styles.tabBar}>
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `${styles.tabItem} ${isActive ? styles.tabActive : ''}`
            }
          >
            <span className={styles.tabIcon}>{tab.icon}</span>
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
