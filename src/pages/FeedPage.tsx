import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import Card, { CardBody, CardHeader, CardFooter } from '../components/ui/Card';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import { LoadingCenter, Spinner } from '../components/ui/Loading';
import MediaCollage, { MediaItem } from '../components/ui/MediaCollage';
import type { ReactNode } from 'react';
import { HeartIcon, MegaphoneIcon, PlusIcon, TagIcon, LocationIcon, BuildingIcon, CheckCircleIcon } from '../components/ui/Icons';
import MessageBubbleIcon from '../components/ui/MessageBubbleIcon';
import HandshakeIcon from '../components/ui/HandshakeIcon';
import styles from './FeedPage.module.css';

interface Recommendation {
  id: number;
  name: string;
  mission: string;
  category: string;
  city?: string;
  state?: string;
  logoUrl?: string;
  reason: string;
}

interface Post {
  id: number;
  title: string;
  content: string;
  type: string;
  createdAt: string;
  author: { name: string; avatarUrl?: string };
  organization: { id: number; name: string; logoUrl?: string };
  media?: MediaItem[];
  _count?: { reactions: number };
}

type FeedTab = 'all' | 'connected' | 'favorites' | 'recommended';

const TABS: { key: FeedTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'connected', label: 'Connected' },
  { key: 'favorites', label: 'Favorites' },
  { key: 'recommended', label: 'Recommended' },
];

const TAB_ENDPOINTS: Record<FeedTab, string> = {
  all: '/feed/posts/all',
  connected: '/feed/posts',
  favorites: '/feed/posts/favorites',
  recommended: '/feed/posts/recommended',
};

interface MsgStatus {
  isConnected: boolean;
  sentCount: number;
  maxMessages: number | null;
  canMessage: boolean;
}

export default function FeedPage() {
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<FeedTab>(
    () => (sessionStorage.getItem('feedTab') as FeedTab) || 'all'
  );
  const [msgStatus, setMsgStatus] = useState<Record<number, MsgStatus>>({});

  const fetchMsgStatus = useCallback(async (orgIds: number[]) => {
    const unique = [...new Set(orgIds)].filter(Boolean);
    if (unique.length === 0) return;
    try {
      const data = await api.post<Record<number, MsgStatus>>('/messages/status', { orgIds: unique });
      setMsgStatus(prev => ({ ...prev, ...data }));
    } catch { /* best effort */ }
  }, []);

  useEffect(() => {
    async function loadFeed() {
      try {
        const [postsData, recsData] = await Promise.all([
          api.get<Post[]>(TAB_ENDPOINTS.all).catch(() => []),
          api.get<Recommendation[]>('/feed/recommendations').catch(() => []),
        ]);
        setPosts(postsData);
        setRecommendations(recsData);

        // Fetch messaging status for all visible org IDs
        const orgIds = [
          ...recsData.map(r => r.id),
          ...postsData.map(p => p.organization.id),
        ];
        fetchMsgStatus(orgIds);
      } finally {
        setLoading(false);
      }
    }
    loadFeed().then(() => {
      const saved = sessionStorage.getItem('feedTab') as FeedTab | null;
      if (saved && saved !== 'all') {
        switchTab(saved);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchTab = useCallback(async (tab: FeedTab) => {
    setActiveTab(tab);
    sessionStorage.setItem('feedTab', tab);
    setTabLoading(true);
    try {
      if (tab === 'recommended') {
        const data = await api.get<Recommendation[]>('/feed/recommendations').catch(() => []);
        setRecommendations(data);
        fetchMsgStatus(data.map(r => r.id));
      } else if (tab === 'all') {
        const [postsData, recsData] = await Promise.all([
          api.get<Post[]>(TAB_ENDPOINTS.all).catch(() => []),
          api.get<Recommendation[]>('/feed/recommendations').catch(() => []),
        ]);
        setPosts(postsData);
        setRecommendations(recsData);
        fetchMsgStatus([...recsData.map(r => r.id), ...postsData.map(p => p.organization.id)]);
      } else {
        const data = await api.get<Post[]>(TAB_ENDPOINTS[tab]).catch(() => []);
        setPosts(data);
        fetchMsgStatus(data.map(p => p.organization.id));
      }
    } finally {
      setTabLoading(false);
    }
  }, [fetchMsgStatus]);

  if (loading) return <LoadingCenter size="lg" />;

  return (
    <div className={styles.page}>
      <div className={styles.feedHeader}>
        <span className={styles.brand}>Catalyze</span>
        <button className={styles.newPostBtn} onClick={() => navigate('/create-post')}>
          <PlusIcon size={20} />
        </button>
      </div>

      {/* Feed Tabs */}
      <div className={styles.tabBar}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`}
            onClick={() => switchTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Posts Feed */}
      <section className={styles.section}>
        {tabLoading ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
            <Spinner />
          </div>
        ) : (activeTab === 'recommended' || activeTab === 'all') && recommendations.length > 0 ? (
          <>
            {recommendations.map((rec) => (
              <Card
                key={`rec-${rec.id}`}
                className={styles.postCard}
                clickable
                onClick={() => navigate(`/org/${rec.id}`)}
              >
                <CardBody>
                  <div className={styles.postHeaderRow}>
                    <div className={styles.postHeader} style={{ marginBottom: 'var(--space-3)' }}>
                      <Avatar name={rec.name} src={rec.logoUrl} size="sm" />
                      <div>
                        <p className={styles.postAuthor}>{rec.name}</p>
                        <Badge>{rec.category}</Badge>
                      </div>
                    </div>
                    <div className={styles.cardActions}>
                      <button
                        className={`${styles.cardActionBtn} ${msgStatus[rec.id]?.canMessage === false ? styles.cardActionDisabled : ''}`}
                        title={msgStatus[rec.id]?.canMessage === false ? 'Message limit reached — connect first' : 'Message'}
                        disabled={msgStatus[rec.id]?.canMessage === false}
                        onClick={(e) => { e.stopPropagation(); navigate(`/messages/${rec.id}`); }}
                      >
                        <MessageBubbleIcon size={18} />
                      </button>
                      <button
                        className={styles.cardActionBtn}
                        title="Connect"
                        onClick={(e) => { e.stopPropagation(); navigate(`/org/${rec.id}`); }}
                      >
                        <HandshakeIcon size={18} />
                      </button>
                    </div>
                  </div>
                  <p className={styles.postContent}>{rec.mission}</p>
                  {rec.city && (
                    <p className={styles.recLocation}>
                      <LocationIcon size={14} /> {rec.city}{rec.state ? `, ${rec.state}` : ''}
                    </p>
                  )}
                  <div className={styles.recSignals}>
                    {rec.reason.split(' · ').map((signal, i) => {
                      let icon: ReactNode | null = null;
                      let label = '';
                      if (signal.startsWith('Same category')) {
                        icon = <TagIcon size={12} />;
                        label = 'Same category';
                      } else if (signal.includes('location')) {
                        icon = <LocationIcon size={12} />;
                        label = 'Nearby';
                      } else if (signal.includes('org size')) {
                        icon = <BuildingIcon size={12} />;
                        label = signal.includes('Similar') ? 'Same size' : 'Similar size';
                      } else if (signal.includes('offer') || signal.includes('need')) {
                        icon = <HandshakeIcon size={12} />;
                        label = 'Resource match';
                      }
                      if (!icon) return null;
                      return (
                        <span key={i} className={styles.recSignal} title={signal}>
                          {icon} {label}
                        </span>
                      );
                    })}
                  </div>
                </CardBody>
              </Card>
            ))}
            {activeTab === 'all' && posts.map((post) => (
              <Card key={post.id} className={styles.postCard}>
                <CardHeader>
                  <div className={styles.postHeaderRow}>
                    <div className={styles.postHeader}>
                      <Avatar
                        name={post.organization.name}
                        src={post.organization.logoUrl}
                        size="sm"
                        onClick={() => navigate(`/org/${post.organization.id}`)}
                      />
                      <div>
                        <p className={styles.postAuthor}>{post.author.name}</p>
                        <p className={styles.postTime}>
                          {post.organization.name} · {new Date(post.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className={styles.cardActions}>
                      <button
                        className={`${styles.cardActionBtn} ${msgStatus[post.organization.id]?.canMessage === false ? styles.cardActionDisabled : ''}`}
                        title={msgStatus[post.organization.id]?.canMessage === false ? 'Message limit reached — connect first' : 'Message'}
                        disabled={msgStatus[post.organization.id]?.canMessage === false}
                        onClick={(e) => { e.stopPropagation(); navigate(`/messages/${post.organization.id}`); }}
                      >
                        <MessageBubbleIcon size={18} />
                      </button>
                      <button
                        className={styles.cardActionBtn}
                        title="Connect"
                        onClick={(e) => { e.stopPropagation(); navigate(`/org/${post.organization.id}`); }}
                      >
                        <HandshakeIcon size={18} />
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardBody>
                  {post.type === 'joined' ? (
                    <div className={styles.joinedPost}>
                      <div className={styles.joinedBadge}>
                        <CheckCircleIcon size={14} /> Joined Catalyze
                      </div>
                      <p className={styles.postContent}>{post.content}</p>
                    </div>
                  ) : (
                    <>
                      <Badge variant={post.type === 'tip' ? 'success' : post.type === 'experience' ? 'primary' : 'neutral'}>
                        {post.type}
                      </Badge>
                      <h3 className={styles.postTitle}>{post.title}</h3>
                      <p className={styles.postContent}>{post.content}</p>
                      {post.media && post.media.length > 0 && (
                        <div style={{ marginTop: 'var(--space-3)' }}>
                          <MediaCollage media={post.media} />
                        </div>
                      )}
                    </>
                  )}
                </CardBody>
                <CardFooter>
                  <div className={styles.postActions}>
                    <button className={styles.postAction}>
                      <HeartIcon size={16} /> {post._count?.reactions || 0}
                    </button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </>
        ) : posts.length === 0 && (activeTab === 'recommended' ? recommendations.length === 0 : true) ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}><MegaphoneIcon size={48} /></div>
            <h3 className={styles.emptyTitle}>No posts yet</h3>
            <p className={styles.emptyText}>
              {activeTab === 'connected'
                ? 'Connect with other organizations to see their posts here.'
                : activeTab === 'favorites'
                ? 'Favorite some organizations to see their posts here.'
                : activeTab === 'recommended'
                ? 'AI recommendations will appear here once your profile is set up.'
                : 'No posts have been shared yet. Be the first!'}
            </p>
          </div>
        ) : (
          posts.map((post) => (
            <Card key={post.id} className={styles.postCard}>
              <CardHeader>
                <div className={styles.postHeaderRow}>
                  <div className={styles.postHeader}>
                    <Avatar
                      name={post.organization.name}
                      src={post.organization.logoUrl}
                      size="sm"
                      onClick={() => navigate(`/org/${post.organization.id}`)}
                    />
                    <div>
                      <p className={styles.postAuthor}>{post.author.name}</p>
                      <p className={styles.postTime}>
                        {post.organization.name} · {new Date(post.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className={styles.cardActions}>
                    <button
                      className={`${styles.cardActionBtn} ${msgStatus[post.organization.id]?.canMessage === false ? styles.cardActionDisabled : ''}`}
                      title={msgStatus[post.organization.id]?.canMessage === false ? 'Message limit reached — connect first' : 'Message'}
                      disabled={msgStatus[post.organization.id]?.canMessage === false}
                      onClick={(e) => { e.stopPropagation(); navigate(`/messages/${post.organization.id}`); }}
                    >
                      <MessageBubbleIcon size={18} />
                    </button>
                    <button
                      className={styles.cardActionBtn}
                      title="Connect"
                      onClick={(e) => { e.stopPropagation(); navigate(`/org/${post.organization.id}`); }}
                    >
                      <HandshakeIcon size={18} />
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardBody>
                {post.type === 'joined' ? (
                  <div className={styles.joinedPost}>
                    <div className={styles.joinedBadge}>
                      <CheckCircleIcon size={14} /> Joined Catalyze
                    </div>
                    <p className={styles.postContent}>{post.content}</p>
                  </div>
                ) : (
                  <>
                    <Badge variant={post.type === 'tip' ? 'success' : post.type === 'experience' ? 'primary' : 'neutral'}>
                      {post.type}
                    </Badge>
                    <h3 className={styles.postTitle}>{post.title}</h3>
                    <p className={styles.postContent}>{post.content}</p>
                    {post.media && post.media.length > 0 && (
                      <div style={{ marginTop: 'var(--space-3)' }}>
                        <MediaCollage media={post.media} />
                      </div>
                    )}
                  </>
                )}
              </CardBody>
              <CardFooter>
                <div className={styles.postActions}>
                  <button className={styles.postAction}>
                    <HeartIcon size={16} /> {post._count?.reactions || 0}
                  </button>
                </div>
              </CardFooter>
            </Card>
          ))
        )}
      </section>
    </div>
  );
}
