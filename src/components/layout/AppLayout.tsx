import { Outlet, NavLink } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
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
  const [unreadThreads, setUnreadThreads] = useState(0);
  const [showUnreadToast, setShowUnreadToast] = useState(false);
  const [toastUnreadCount, setToastUnreadCount] = useState(0);
  const previousUnreadRef = useRef<number | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);
  const isAdmin = user?.role === 'admin';
  const tabs = allTabs.filter((t) => !t.adminOnly || isAdmin);

  useEffect(() => {
    let isMounted = true;

    const loadUnreadSummary = async () => {
      try {
        const summary = await api.get<{ unreadThreads: number; unreadMessages: number }>(`/messages/unread-summary?ts=${Date.now()}`);
        if (isMounted) {
          setUnreadThreads(summary.unreadThreads);

          const previous = previousUnreadRef.current;
          if (previous !== null && summary.unreadThreads > previous) {
            setToastUnreadCount(summary.unreadThreads);
            setShowUnreadToast(true);
            if (toastTimeoutRef.current) {
              window.clearTimeout(toastTimeoutRef.current);
            }
            toastTimeoutRef.current = window.setTimeout(() => {
              setShowUnreadToast(false);
            }, 2800);
          }
          previousUnreadRef.current = summary.unreadThreads;
        }
      } catch {
        if (isMounted) {
          setUnreadThreads(0);
        }
      }
    };

    loadUnreadSummary();
    const intervalId = window.setInterval(loadUnreadSummary, 10000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

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
              {tab.to === '/inbox' && unreadThreads > 0 && (
                <span className={styles.tabBadge}>
                  {unreadThreads > 99 ? '99+' : unreadThreads}
                </span>
              )}
              {tab.to === '/inbox' && showUnreadToast && (
                <span className={styles.tabToast}>
                  {toastUnreadCount > 99 ? '99+' : toastUnreadCount} unread thread{toastUnreadCount === 1 ? '' : 's'}
                </span>
              )}
            </span>
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}