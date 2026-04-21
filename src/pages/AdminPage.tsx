import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import Avatar from '../components/ui/Avatar';
import { LoadingCenter } from '../components/ui/Loading';
import { SearchIcon } from '../components/ui/Icons';
import styles from './AdminPage.module.css';

type Tab = 'dashboard' | 'users' | 'organizations' | 'posts' | 'messages' | 'testing';

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
  { key: 'testing', label: 'Testing' },
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
  const [postAs, setPostAs] = useState<{ orgId: number; orgName: string } | null>(null);
  const [postForm, setPostForm] = useState({ title: '', content: '', type: 'tip' });
  const [postSubmitting, setPostSubmitting] = useState(false);
  
  // Testing/impersonation forms
  const [messageForm, setMessageForm] = useState({ senderOrgId: '', receiverOrgId: '', content: '' });
  const [connectForm, setConnectForm] = useState({ requesterId: '', targetId: '' });
  const [acceptForm, setAcceptForm] = useState({ partnershipId: '' });
  const [updateOrgForm, setUpdateOrgForm] = useState({
    orgRef: '',
    name: '',
    mission: '',
    category: '',
    city: '',
    state: '',
    website: '',
  });
  const [testingSubmitting, setTestingSubmitting] = useState(false);
  const [testingMessage, setTestingMessage] = useState<string | null>(null);

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
    else if (tab === 'testing') loadOrgs();
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

  function resolveOrgId(input: string): number | null {
    const trimmed = input.trim();
    if (!trimmed) return null;

    if (/^\d+$/.test(trimmed)) {
      return Number(trimmed);
    }

    const taggedMatch = trimmed.match(/\(#(\d+)\)$/);
    if (taggedMatch) {
      return Number(taggedMatch[1]);
    }

    const exact = orgs.find((o) => o.name.toLowerCase() === trimmed.toLowerCase());
    return exact ? exact.id : null;
  }

  async function handlePostAs() {
    if (!postAs || !postForm.title.trim() || !postForm.content.trim()) return;
    setPostSubmitting(true);
    try {
      await api.post('/admin/posts', {
        orgId: postAs.orgId,
        title: postForm.title,
        content: postForm.content,
        type: postForm.type,
      });
      setPostAs(null);
      setPostForm({ title: '', content: '', type: 'tip' });
      loadStats();
      if (tab === 'posts') loadPosts(search);
    } catch { /* ignore */ }
    setPostSubmitting(false);
  }

  async function handleMessageAs() {
    if (!messageForm.senderOrgId || !messageForm.receiverOrgId || !messageForm.content.trim()) return;
    const senderOrgId = resolveOrgId(messageForm.senderOrgId);
    const receiverOrgId = resolveOrgId(messageForm.receiverOrgId);
    if (!senderOrgId || !receiverOrgId) {
      setTestingMessage('Error: Select a valid sender and receiver org (name from list or numeric ID)');
      return;
    }
    setTestingSubmitting(true);
    try {
      await api.post('/admin/message-as', {
        senderOrgId,
        receiverOrgId,
        content: messageForm.content,
      });
      setMessageForm({ senderOrgId: '', receiverOrgId: '', content: '' });
      setTestingMessage('Message sent successfully');
      setTimeout(() => setTestingMessage(null), 3000);
    } catch (err) {
      setTestingMessage(`Error: ${err instanceof Error ? err.message : 'Failed to send message'}`);
    }
    setTestingSubmitting(false);
  }

  async function handleConnectAs() {
    if (!connectForm.requesterId || !connectForm.targetId) return;
    const requesterId = resolveOrgId(connectForm.requesterId);
    const targetId = resolveOrgId(connectForm.targetId);
    if (!requesterId || !targetId) {
      setTestingMessage('Error: Select valid requester and target orgs (name from list or numeric ID)');
      return;
    }
    setTestingSubmitting(true);
    try {
      await api.post('/admin/connect-as', {
        requesterId,
        targetId,
      });
      setConnectForm({ requesterId: '', targetId: '' });
      setTestingMessage('Connection request sent successfully');
      setTimeout(() => setTestingMessage(null), 3000);
    } catch (err) {
      setTestingMessage(`Error: ${err instanceof Error ? err.message : 'Failed to send request'}`);
    }
    setTestingSubmitting(false);
  }

  async function handleAcceptAs() {
    if (!acceptForm.partnershipId) return;
    setTestingSubmitting(true);
    try {
      await api.post('/admin/accept-as', {
        partnershipId: Number(acceptForm.partnershipId),
      });
      setAcceptForm({ partnershipId: '' });
      setTestingMessage('Connection accepted successfully');
      setTimeout(() => setTestingMessage(null), 3000);
      if (tab === 'testing') loadMessages();
    } catch (err) {
      setTestingMessage(`Error: ${err instanceof Error ? err.message : 'Failed to accept'}`);
    }
    setTestingSubmitting(false);
  }

  async function handleUpdateOrgAs() {
    if (!updateOrgForm.orgRef.trim()) return;
    const orgId = resolveOrgId(updateOrgForm.orgRef);
    if (!orgId) {
      setTestingMessage('Error: Select a valid organization (name from list or numeric ID)');
      return;
    }

    const payload: Record<string, unknown> = { orgId };
    if (updateOrgForm.name.trim()) payload.name = updateOrgForm.name.trim();
    if (updateOrgForm.mission.trim()) payload.mission = updateOrgForm.mission.trim();
    if (updateOrgForm.category.trim()) payload.category = updateOrgForm.category.trim();
    if (updateOrgForm.city.trim()) payload.city = updateOrgForm.city.trim();
    if (updateOrgForm.state.trim()) payload.state = updateOrgForm.state.trim();
    if (updateOrgForm.website.trim()) payload.website = updateOrgForm.website.trim();

    if (Object.keys(payload).length === 1) {
      setTestingMessage('Error: Enter at least one field to update');
      return;
    }

    setTestingSubmitting(true);
    try {
      await api.post('/admin/update-org-as', payload);
      setTestingMessage('Organization updated successfully');
      setUpdateOrgForm({
        orgRef: updateOrgForm.orgRef,
        name: '',
        mission: '',
        category: '',
        city: '',
        state: '',
        website: '',
      });
      setTimeout(() => setTestingMessage(null), 3000);
      loadOrgs();
    } catch (err) {
      setTestingMessage(`Error: ${err instanceof Error ? err.message : 'Failed to update organization'}`);
    }
    setTestingSubmitting(false);
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
      {(tab === 'users' || tab === 'organizations' || tab === 'posts' || tab === 'messages') && (
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
                  {`ID: ${org.id}`} ·
                  {org.category}
                  {org.city && ` · ${org.city}, ${org.state}`}
                  {org.owner && ` · ${org.owner.name}`}
                </div>
              </div>
              <div className={styles.itemActions}>
                <button
                  className={styles.actionBtn}
                  onClick={() => { setPostAs({ orgId: org.id, orgName: org.name }); setPostForm({ title: '', content: '', type: 'tip' }); }}
                >
                  Post as
                </button>
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

      {/* Testing / Impersonation */}
      {tab === 'testing' && (
        <div className={styles.testingPanel}>
          <datalist id="admin-org-options">
            {orgs.map((org) => (
              <option key={org.id} value={`${org.name} (#${org.id})`} />
            ))}
          </datalist>

          {testingMessage && (
            <div style={{
              padding: 'var(--space-3)',
              marginBottom: 'var(--space-3)',
              backgroundColor: testingMessage.startsWith('Error') ? '#fee' : '#efe',
              border: `1px solid ${testingMessage.startsWith('Error') ? '#fcc' : '#cfc'}`,
              borderRadius: 'var(--radius)',
              color: testingMessage.startsWith('Error') ? '#c33' : '#3c3',
            }}>
              {testingMessage}
            </div>
          )}

          <div className={styles.formSection}>
            <h3>Message As</h3>
            <input
              type="text"
              list="admin-org-options"
              placeholder="Sender org name or ID"
              value={messageForm.senderOrgId}
              onChange={(e) => setMessageForm((f) => ({ ...f, senderOrgId: e.target.value }))}
              className={styles.formInput}
              style={{ marginBottom: 'var(--space-2)' }}
            />
            <input
              type="text"
              list="admin-org-options"
              placeholder="Receiver org name or ID"
              value={messageForm.receiverOrgId}
              onChange={(e) => setMessageForm((f) => ({ ...f, receiverOrgId: e.target.value }))}
              className={styles.formInput}
              style={{ marginBottom: 'var(--space-2)' }}
            />
            <textarea
              placeholder="Message content..."
              value={messageForm.content}
              onChange={(e) => setMessageForm((f) => ({ ...f, content: e.target.value }))}
              className={styles.formInput}
              rows={3}
              style={{ marginBottom: 'var(--space-2)', resize: 'vertical' }}
            />
            <button
              className={styles.actionBtn}
              onClick={handleMessageAs}
              disabled={testingSubmitting || !messageForm.senderOrgId || !messageForm.receiverOrgId || !messageForm.content.trim()}
              style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
            >
              {testingSubmitting ? 'Sending...' : 'Send Message'}
            </button>
          </div>

          <div className={styles.formSection}>
            <h3>Connect As</h3>
            <input
              type="text"
              list="admin-org-options"
              placeholder="Requester org name or ID"
              value={connectForm.requesterId}
              onChange={(e) => setConnectForm((f) => ({ ...f, requesterId: e.target.value }))}
              className={styles.formInput}
              style={{ marginBottom: 'var(--space-2)' }}
            />
            <input
              type="text"
              list="admin-org-options"
              placeholder="Target org name or ID"
              value={connectForm.targetId}
              onChange={(e) => setConnectForm((f) => ({ ...f, targetId: e.target.value }))}
              className={styles.formInput}
              style={{ marginBottom: 'var(--space-2)' }}
            />
            <button
              className={styles.actionBtn}
              onClick={handleConnectAs}
              disabled={testingSubmitting || !connectForm.requesterId || !connectForm.targetId}
              style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
            >
              {testingSubmitting ? 'Connecting...' : 'Send Connection Request'}
            </button>
          </div>

          <div className={styles.formSection}>
            <h3>Accept Connection As</h3>
            <input
              type="number"
              placeholder="Partnership ID"
              value={acceptForm.partnershipId}
              onChange={(e) => setAcceptForm((f) => ({ ...f, partnershipId: e.target.value }))}
              className={styles.formInput}
              style={{ marginBottom: 'var(--space-2)' }}
            />
            <div className={styles.formHint}>Tip: Open the Partners tab to find pending partnership IDs.</div>
            <button
              className={styles.actionBtn}
              onClick={handleAcceptAs}
              disabled={testingSubmitting || !acceptForm.partnershipId}
              style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
            >
              {testingSubmitting ? 'Accepting...' : 'Accept Connection'}
            </button>
          </div>

          <div className={styles.formSection}>
            <h3>Update Org As</h3>
            <input
              type="text"
              list="admin-org-options"
              placeholder="Org name or ID"
              value={updateOrgForm.orgRef}
              onChange={(e) => setUpdateOrgForm((f) => ({ ...f, orgRef: e.target.value }))}
              className={styles.formInput}
              style={{ marginBottom: 'var(--space-2)' }}
            />
            <input
              type="text"
              placeholder="Name (optional)"
              value={updateOrgForm.name}
              onChange={(e) => setUpdateOrgForm((f) => ({ ...f, name: e.target.value }))}
              className={styles.formInput}
              style={{ marginBottom: 'var(--space-2)' }}
            />
            <input
              type="text"
              placeholder="Mission (optional)"
              value={updateOrgForm.mission}
              onChange={(e) => setUpdateOrgForm((f) => ({ ...f, mission: e.target.value }))}
              className={styles.formInput}
              style={{ marginBottom: 'var(--space-2)' }}
            />
            <input
              type="text"
              placeholder="Category (optional)"
              value={updateOrgForm.category}
              onChange={(e) => setUpdateOrgForm((f) => ({ ...f, category: e.target.value }))}
              className={styles.formInput}
              style={{ marginBottom: 'var(--space-2)' }}
            />
            <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
              <input
                type="text"
                placeholder="City (optional)"
                value={updateOrgForm.city}
                onChange={(e) => setUpdateOrgForm((f) => ({ ...f, city: e.target.value }))}
                className={styles.formInput}
              />
              <input
                type="text"
                placeholder="State (optional)"
                value={updateOrgForm.state}
                onChange={(e) => setUpdateOrgForm((f) => ({ ...f, state: e.target.value }))}
                className={styles.formInput}
              />
            </div>
            <input
              type="url"
              placeholder="Website (optional)"
              value={updateOrgForm.website}
              onChange={(e) => setUpdateOrgForm((f) => ({ ...f, website: e.target.value }))}
              className={styles.formInput}
              style={{ marginBottom: 'var(--space-2)' }}
            />
            <div className={styles.formHint}>Only filled fields are updated.</div>
            <button
              className={styles.actionBtn}
              onClick={handleUpdateOrgAs}
              disabled={testingSubmitting || !updateOrgForm.orgRef.trim()}
              style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
            >
              {testingSubmitting ? 'Updating...' : 'Update Organization'}
            </button>
          </div>
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

      {/* Post-as dialog */}
      {postAs && (
        <div className={styles.confirmOverlay} onClick={() => setPostAs(null)}>
          <div className={styles.confirmDialog} onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className={styles.confirmTitle}>Post as {postAs.orgName}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                {(['tip', 'experience', 'announcement'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={postForm.type === t ? styles.restrictedBtn : styles.actionBtn}
                    style={{ flex: 1, textTransform: 'capitalize' }}
                    onClick={() => setPostForm((f) => ({ ...f, type: t }))}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <input
                className={styles.searchInput}
                placeholder="Title"
                value={postForm.title}
                onChange={(e) => setPostForm((f) => ({ ...f, title: e.target.value }))}
                style={{ width: '100%' }}
              />
              <textarea
                className={styles.searchInput}
                placeholder="Content..."
                value={postForm.content}
                onChange={(e) => setPostForm((f) => ({ ...f, content: e.target.value }))}
                rows={4}
                style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>
            <div className={styles.confirmActions}>
              <button className={styles.confirmCancel} onClick={() => setPostAs(null)}>Cancel</button>
              <button
                className={styles.actionBtn}
                style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
                onClick={handlePostAs}
                disabled={postSubmitting || !postForm.title.trim() || !postForm.content.trim()}
              >
                {postSubmitting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
