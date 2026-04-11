import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import Avatar from '../components/ui/Avatar';
import { LoadingCenter } from '../components/ui/Loading';
import { SearchIcon } from '../components/ui/Icons';
import styles from './AdminPage.module.css';

type Tab = 'dashboard' | 'users' | 'organizations' | 'posts' | 'messages';

interface Stats {
  users: number;
  organizations: number;
  posts: number;
  partnerships: number;
  messages?: number;
}

interface AdminUser {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  avatarUrl: string | null;
  createdAt: string;
  organization?: { id: number; name: string } | null;
}

interface AdminOrg {
  id: number;
  name: string;
  category: string;
  city: string | null;
  state: string | null;
  logoUrl: string | null;
  ownerId: number;
  canPost: boolean;
  canMessage: boolean;
  createdAt: string;
  owner?: { id: number; name: string; email: string };
}

interface AdminPost {
  id: number;
  title: string;
  content: string;
  type: string;
  createdAt: string;
  author?: { id: number; name: string };
  organization?: { id: number; name: string };
}

interface AdminMessage {
  id: number;
  content: string;
  createdAt: string;
  senderOrgId: number;
  receiverOrgId: number;
  readAt: string | null;
  senderOrg?: { id: number; name: string };
  receiverOrg?: { id: number; name: string };
}

const TABS: { key: Tab; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'users', label: 'Users' },
  { key: 'organizations', label: 'Orgs' },
  { key: 'posts', label: 'Posts' },
  { key: 'messages', label: 'Messages' },
];

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [orgs, setOrgs] = useState<AdminOrg[]>([]);
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [confirm, setConfirm] = useState<{ type: string; id: number; name: string } | null>(null);

  const loadStats = useCallback(async () => {
    try {
      const data = await api.get<Stats>('/admin/stats');
      setStats(data);
    } catch { /* ignore */ }
  }, []);

  const loadUsers = useCallback(async (q = '') => {
    setLoading(true);
    try {
      const data = await api.get<AdminUser[]>(`/admin/users${q ? `?q=${encodeURIComponent(q)}` : ''}`);
      setUsers(data);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const loadOrgs = useCallback(async (q = '') => {
    setLoading(true);
    try {
      const data = await api.get<AdminOrg[]>(`/admin/organizations${q ? `?q=${encodeURIComponent(q)}` : ''}`);
      setOrgs(data);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const loadPosts = useCallback(async (q = '') => {
    setLoading(true);
    try {
      const data = await api.get<AdminPost[]>(`/admin/posts${q ? `?q=${encodeURIComponent(q)}` : ''}`);
      setPosts(data);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const loadMessages = useCallback(async (q = '') => {
    setLoading(true);
    try {
      const data = await api.get<AdminMessage[]>(`/admin/messages${q ? `?q=${encodeURIComponent(q)}` : ''}`);
      setMessages(data);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    setSearch('');
    if (tab === 'users') loadUsers();
    else if (tab === 'organizations') loadOrgs();
    else if (tab === 'posts') loadPosts();
    else if (tab === 'messages') loadMessages();
  }, [tab, loadUsers, loadOrgs, loadPosts, loadMessages]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (tab === 'users') loadUsers(search);
      else if (tab === 'organizations') loadOrgs(search);
      else if (tab === 'posts') loadPosts(search);
      else if (tab === 'messages') loadMessages(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, tab, loadUsers, loadOrgs, loadPosts, loadMessages]);

  async function handleToggleRole(user: AdminUser) {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    try {
      await api.put(`/admin/users/${user.id}/role`, { role: newRole });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u)));
    } catch { /* ignore */ }
  }

  async function handleToggleRestriction(org: AdminOrg, field: 'canPost' | 'canMessage') {
    const newValue = !org[field];
    try {
      await api.put(`/admin/organizations/${org.id}/restrictions`, { [field]: newValue });
      setOrgs((prev) => prev.map((o) => (o.id === org.id ? { ...o, [field]: newValue } : o)));
    } catch { /* ignore */ }
  }

  async function handleDelete() {
    if (!confirm) return;
    try {
      if (confirm.type === 'user') {
        await api.delete(`/admin/users/${confirm.id}`);
        setUsers((prev) => prev.filter((u) => u.id !== confirm.id));
      } else if (confirm.type === 'org') {
        await api.delete(`/admin/organizations/${confirm.id}`);
        setOrgs((prev) => prev.filter((o) => o.id !== confirm.id));
      } else if (confirm.type === 'post') {
        await api.delete(`/admin/posts/${confirm.id}`);
        setPosts((prev) => prev.filter((p) => p.id !== confirm.id));
      } else if (confirm.type === 'message') {
        await api.delete(`/admin/messages/${confirm.id}`);
        setMessages((prev) => prev.filter((m) => m.id !== confirm.id));
      }
      loadStats();
    } catch { /* ignore */ }
    setConfirm(null);
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <span className={styles.title}>Admin</span>
      </div>

      {/* Tabs */}
      <div className={styles.tabBar}>
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`${styles.tab} ${tab === t.key ? styles.tabActive : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Dashboard */}
      {tab === 'dashboard' && stats && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.users}</div>
            <div className={styles.statLabel}>Users</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.organizations}</div>
            <div className={styles.statLabel}>Organizations</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.posts}</div>
            <div className={styles.statLabel}>Posts</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.partnerships}</div>
            <div className={styles.statLabel}>Partnerships</div>
          </div>
          {stats.messages !== undefined && (
            <div className={styles.statCard}>
              <div className={styles.statValue}>{stats.messages}</div>
              <div className={styles.statLabel}>Messages</div>
            </div>
          )}
        </div>
      )}

      {/* Search bar for list tabs */}
      {tab !== 'dashboard' && (
        <div className={styles.searchBar}>
          <div className={styles.searchWrapper}>
            <span className={styles.searchIcon}><SearchIcon size={16} /></span>
            <input
              className={styles.searchInput}
              placeholder={`Search ${tab}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      )}

      {loading && <LoadingCenter />}

      {/* Users list */}
      {tab === 'users' && !loading && (
        <div className={styles.list}>
          {users.length === 0 && <div className={styles.empty}>No users found</div>}
          {users.map((user) => (
            <div key={user.id} className={styles.listItem}>
              <Avatar name={user.name} src={user.avatarUrl} size="sm" />
              <div className={styles.itemInfo}>
                <div className={styles.itemName}>
                  {user.name}
                  {user.role === 'admin' && <span className={styles.adminBadge}>ADMIN</span>}
                </div>
                <div className={styles.itemSub}>
                  {user.email || user.phone || 'No contact'}
                  {user.organization && ` · ${user.organization.name}`}
                </div>
              </div>
              <div className={styles.itemActions}>
                <button
                  className={styles.actionBtn}
                  onClick={() => handleToggleRole(user)}
                >
                  {user.role === 'admin' ? 'Demote' : 'Promote'}
                </button>
                <button
                  className={styles.deleteBtn}
                  onClick={() => setConfirm({ type: 'user', id: user.id, name: user.name })}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Organizations list */}
      {tab === 'organizations' && !loading && (
        <div className={styles.list}>
          {orgs.length === 0 && <div className={styles.empty}>No organizations found</div>}
          {orgs.map((org) => (
            <div key={org.id} className={styles.listItem}>
              <Avatar name={org.name} src={org.logoUrl} size="sm" />
              <div className={styles.itemInfo}>
                <div className={styles.itemName}>
                  {org.name}
                  {!org.canPost && <span className={styles.restrictedBadge}>No Posts</span>}
                  {!org.canMessage && <span className={styles.restrictedBadge}>No Messages</span>}
                </div>
                <div className={styles.itemSub}>
                  {org.category}
                  {org.city && ` · ${org.city}, ${org.state}`}
                  {org.owner && ` · ${org.owner.name}`}
                </div>
              </div>
              <div className={styles.itemActions}>
                <button
                  className={org.canPost ? styles.actionBtn : styles.restrictedBtn}
                  onClick={() => handleToggleRestriction(org, 'canPost')}
                  title={org.canPost ? 'Revoke posting rights' : 'Restore posting rights'}
                >
                  {org.canPost ? 'Revoke Posts' : 'Allow Posts'}
                </button>
                <button
                  className={org.canMessage ? styles.actionBtn : styles.restrictedBtn}
                  onClick={() => handleToggleRestriction(org, 'canMessage')}
                  title={org.canMessage ? 'Revoke messaging rights' : 'Restore messaging rights'}
                >
                  {org.canMessage ? 'Revoke Msgs' : 'Allow Msgs'}
                </button>
                <button
                  className={styles.deleteBtn}
                  onClick={() => setConfirm({ type: 'org', id: org.id, name: org.name })}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Posts list */}
      {tab === 'posts' && !loading && (
        <div className={styles.list}>
          {posts.length === 0 && <div className={styles.empty}>No posts found</div>}
          {posts.map((post) => (
            <div key={post.id} className={styles.listItem}>
              <div className={styles.itemInfo}>
                <div className={styles.itemName}>{post.title}</div>
                <div className={styles.itemSub}>
                  {post.type} · {post.organization?.name || 'Unknown org'} · {post.author?.name || 'Unknown'} · {formatDate(post.createdAt)}
                </div>
              </div>
              <div className={styles.itemActions}>
                <button
                  className={styles.deleteBtn}
                  onClick={() => setConfirm({ type: 'post', id: post.id, name: post.title })}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Messages list */}
      {tab === 'messages' && !loading && (
        <div className={styles.list}>
          {messages.length === 0 && <div className={styles.empty}>No messages found</div>}
          {messages.map((msg) => (
            <div key={msg.id} className={styles.listItem}>
              <div className={styles.itemInfo}>
                <div className={styles.itemName}>
                  {msg.senderOrg?.name || 'Unknown'} → {msg.receiverOrg?.name || 'Unknown'}
                </div>
                <div className={styles.itemSub}>
                  {msg.content.length > 100 ? msg.content.slice(0, 100) + '…' : msg.content}
                </div>
                <div className={styles.itemSub}>
                  {formatDate(msg.createdAt)}{msg.readAt ? ' · Read' : ' · Unread'}
                </div>
              </div>
              <div className={styles.itemActions}>
                <button
                  className={styles.deleteBtn}
                  onClick={() => setConfirm({ type: 'message', id: msg.id, name: `message from ${msg.senderOrg?.name || 'Unknown'}` })}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirm dialog */}
      {confirm && (
        <div className={styles.confirmOverlay} onClick={() => setConfirm(null)}>
          <div className={styles.confirmDialog} onClick={(e) => e.stopPropagation()}>
            <div className={styles.confirmTitle}>Delete {confirm.type}?</div>
            <div className={styles.confirmText}>
              Are you sure you want to delete <strong>{confirm.name}</strong>? This action cannot be undone.
            </div>
            <div className={styles.confirmActions}>
              <button className={styles.confirmCancel} onClick={() => setConfirm(null)}>Cancel</button>
              <button className={styles.confirmDelete} onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
