import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import Card, { CardBody, CardHeader, CardFooter } from '../components/ui/Card';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import { LoadingCenter, Spinner } from '../components/ui/Loading';
import MediaCollage, { MediaItem } from '../components/ui/MediaCollage';
import { HeartIcon, MegaphoneIcon, PlusIcon, CheckCircleIcon, TagIcon, LocationIcon, BuildingIcon } from '../components/ui/Icons';
import MessageBubbleIcon from '../components/ui/MessageBubbleIcon';
import HandshakeIcon from '../components/ui/HandshakeIcon';
import { parseRecommendationSignals } from '../utils/recommendationSignals';
import styles from './FeedPage.module.css';

interface Post {
  id: number;
  title: string;
  content: string;
  type: string;
  createdAt: string;
  orgId?: number;
  author: { name: string; avatarUrl?: string };
  organization: { id: number; name: string; logoUrl?: string };
  media?: MediaItem[];
  _count?: { reactions: number };
  recommendationReason?: string | null;
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
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<FeedTab>(
    () => (sessionStorage.getItem('feedTab') as FeedTab) || 'all'
  );
  const [msgStatus, setMsgStatus] = useState<Record<number, MsgStatus>>({});
  const [favSet, setFavSet] = useState<Set<number>>(new Set());
  const [recommendedReasons, setRecommendedReasons] = useState<Record<number, string>>({});
  const refreshedRecommendedRef = useRef(false);

  const fetchRecommendations = useCallback(async (forceRefresh = false) => {
    try {
      const endpoint = forceRefresh ? '/feed/recommendations?refresh=1' : '/feed/recommendations';
      const recs = await api.get<{ id: number; reason?: string }[]>(endpoint);
      const reasons: Record<number, string> = {};
      recs.forEach((r) => {
        if (r.reason) reasons[r.id] = r.reason;
      });
      setRecommendedReasons(reasons);
    } catch {
      setRecommendedReasons({});
    }
  }, []);

  const fetchMsgStatus = useCallback(async (orgIds: number[]) => {
    const unique = [...new Set(orgIds)].filter(Boolean);
    if (unique.length === 0) return;
    try {
      const data = await api.post<Record<number, MsgStatus>>('/messages/status', { orgIds: unique });
      setMsgStatus(prev => ({ ...prev, ...data }));
    } catch { /* best effort */ }
  }, []);

  const fetchFavorites = useCallback(async () => {
    try {
      const favs = await api.get<{ orgId: number }[]>('/favorites');
      setFavSet(new Set(favs.map(f => f.orgId)));
    } catch { /* best effort */ }
  }, []);

  const toggleFavorite = useCallback(async (orgId: number) => {
    const isFav = favSet.has(orgId);
    try {
      if (isFav) {
        await api.delete(`/favorites/${orgId}`);
        setFavSet(prev => { const next = new Set(prev); next.delete(orgId); return next; });
      } else {
        await api.post(`/favorites/${orgId}`, {});
        setFavSet(prev => new Set(prev).add(orgId));
      }
    } catch { /* best effort */ }
  }, [favSet]);

  const fetchPosts = useCallback(async (tab: FeedTab, forceRefresh = false) => {
    const endpoint = forceRefresh && tab === 'recommended'
      ? `${TAB_ENDPOINTS[tab]}?refresh=1`
      : TAB_ENDPOINTS[tab];
    const data = await api.get<Post[]>(endpoint).catch(() => []);
    setPosts(data);
    fetchMsgStatus(data.map(p => p.organization.id));
    return data;
  }, [fetchMsgStatus]);

  useEffect(() => {
    async function loadFeed() {
      try {
        const shouldRefreshRecommended = activeTab === 'recommended' && !refreshedRecommendedRef.current;
        if (shouldRefreshRecommended) {
          refreshedRecommendedRef.current = true;
        }
        await Promise.all([
          fetchPosts(activeTab, shouldRefreshRecommended),
          fetchFavorites(),
          fetchRecommendations(shouldRefreshRecommended),
        ]);
      } finally {
        setLoading(false);
      }
    }
    loadFeed();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchTab = useCallback(async (tab: FeedTab) => {
    setActiveTab(tab);
    sessionStorage.setItem('feedTab', tab);
    setTabLoading(true);
    try {
      const shouldRefreshRecommended = tab === 'recommended' && !refreshedRecommendedRef.current;
      if (shouldRefreshRecommended) {
        refreshedRecommendedRef.current = true;
      }
      await fetchPosts(tab, shouldRefreshRecommended);
      if (shouldRefreshRecommended) {
        await fetchRecommendations(true);
      }
    } finally {
      setTabLoading(false);
    }
  }, [fetchPosts, fetchRecommendations]);

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
        ) : posts.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}><MegaphoneIcon size={48} /></div>
            <h3 className={styles.emptyTitle}>No posts yet</h3>
            <p className={styles.emptyText}>
              {activeTab === 'connected'
                ? 'Connect with other organizations to see their posts here.'
                : activeTab === 'favorites'
                ? 'Favorite some organizations to see their posts here.'
                : activeTab === 'recommended'
                ? 'Posts from recommended organizations will appear here once your profile is set up.'
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
                      <p className={styles.postAuthor}>{post.organization.name}</p>
                      <p className={styles.postTime}>
                        {new Date(post.createdAt).toLocaleDateString()}
                      </p>
                      {(post.recommendationReason || recommendedReasons[post.organization.id]) && (
                        <div className={styles.matchSignals}>
                          {parseRecommendationSignals(post.recommendationReason || recommendedReasons[post.organization.id]).map((signal, i) => {
                            let icon: React.ReactNode | null = null;
                            if (signal.type === 'category') {
                              icon = <TagIcon size={11} />;
                            } else if (signal.type === 'location') {
                              icon = <LocationIcon size={11} />;
                            } else if (signal.type === 'size') {
                              icon = <BuildingIcon size={11} />;
                            } else if (signal.type === 'resource') {
                              icon = <HandshakeIcon size={11} />;
                            }
                            if (!icon) return null;
                            const variantClass =
                              signal.type === 'category' ? styles.matchSignalCategory
                              : signal.type === 'location' ? styles.matchSignalLocation
                              : signal.type === 'size' ? styles.matchSignalSize
                              : styles.matchSignalResource;
                            return (
                              <span key={i} className={`${styles.matchSignal} ${variantClass}`} title={signal.title}>
                                {icon} {signal.label}
                              </span>
                            );
                          })}
                        </div>
                      )}
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
                  <button
                    className={`${styles.postAction} ${favSet.has(post.organization.id) ? styles.postActionActive : ''}`}
                    onClick={() => toggleFavorite(post.organization.id)}
                    title={favSet.has(post.organization.id) ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <HeartIcon size={16} filled={favSet.has(post.organization.id)} />
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
