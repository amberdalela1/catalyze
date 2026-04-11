import { Outlet, NavLink } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../../context/AuthContext';
import styles from './AppLayout.module.css';
import MessageBubbleIcon from '../ui/MessageBubbleIcon';
import HandshakeIcon from '../ui/HandshakeIcon';
import { HomeIcon, SearchIcon, PersonIcon, ShieldIcon } from '../ui/Icons';

interface TabDef {
  to: string;
  label: string;
  icon: ReactNode;
  adminOnly?: boolean;
}

const allTabs: TabDef[] = [
  { to: '/feed', label: 'Feed', icon: <HomeIcon /> },
  { to: '/search', label: 'Discover', icon: <SearchIcon /> },
  { to: '/inbox', label: 'Messages', icon: <MessageBubbleIcon /> },
  { to: '/partnerships', label: 'Partners', icon: <HandshakeIcon /> },
  { to: '/my-org', label: 'My Org', icon: <PersonIcon /> },
  { to: '/admin', label: 'Admin', icon: <ShieldIcon />, adminOnly: true },
];

export default function AppLayout() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const tabs = allTabs.filter((t) => !t.adminOnly || isAdmin);

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
            <span className={styles.tabIcon}>
              {tab.icon}
            </span>
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}