import { useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import Card from '../components/ui/Card';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import { Spinner } from '../components/ui/Loading';
import { SearchIcon, TagIcon, CheckIcon, LocationIcon, DiamondIcon, BuildingIcon, EducationIcon, HealthIcon, EnvironmentIcon, CommunityIcon, ArtsIcon, YouthIcon, HousingIcon, FoodIcon, AnimalIcon } from '../components/ui/Icons';
import MessageBubbleIcon from '../components/ui/MessageBubbleIcon';
import HandshakeIcon from '../components/ui/HandshakeIcon';
import styles from './SearchPage.module.css';

const CATEGORIES: { name: string; icon: ReactNode }[] = [
  { name: 'Education', icon: <EducationIcon size={20} /> },
  { name: 'Health', icon: <HealthIcon size={20} /> },
  { name: 'Environment', icon: <EnvironmentIcon size={20} /> },
  { name: 'Community', icon: <CommunityIcon size={20} /> },
  { name: 'Arts & Culture', icon: <ArtsIcon size={20} /> },
  { name: 'Youth', icon: <YouthIcon size={20} /> },
  { name: 'Housing', icon: <HousingIcon size={20} /> },
  { name: 'Food Security', icon: <FoodIcon size={20} /> },
  { name: 'Animal Welfare', icon: <AnimalIcon size={20} /> },
  { name: 'Other', icon: <DiamondIcon size={20} /> },
];

const STANDARD_CATEGORIES = CATEGORIES.map(c => c.name);

interface Organization {
  id: number;
  name: string;
  category: string;
  city?: string;
  state?: string;
  logoUrl?: string;
  mission?: string;
}

interface MsgStatus {
  isConnected: boolean;
  sentCount: number;
  maxMessages: number | null;
  canMessage: boolean;
}

type ViewFilter = 'all' | 'favorites' | 'connected' | 'recommended';

const VIEW_TABS: { key: ViewFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'favorites', label: 'Favorites' },
  { key: 'connected', label: 'Connected' },
  { key: 'recommended', label: 'Recommended' },
];

export default function SearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [results, setResults] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [msgStatus, setMsgStatus] = useState<Record<number, MsgStatus>>({});
  const [viewFilter, setViewFilterState] = useState<ViewFilter>(
    () => (sessionStorage.getItem('discoverTab') as ViewFilter) || 'all'
  );
  const setViewFilter = (tab: ViewFilter) => {
    setViewFilterState(tab);
    sessionStorage.setItem('discoverTab', tab);
  };
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [connectedIds, setConnectedIds] = useState<Set<number>>(new Set());
  const [recommendedIds, setRecommendedIds] = useState<Set<number>>(new Set());
  const [recommendedOrder, setRecommendedOrder] = useState<number[]>([]);
  const [recommendedReasons, setRecommendedReasons] = useState<Record<number, string>>({});

  const fetchMsgStatus = useCallback(async (orgIds: number[]) => {
    const unique = [...new Set(orgIds)].filter(Boolean);
    if (unique.length === 0) return;
    try {
      const data = await api.post<Record<number, MsgStatus>>('/messages/status', { orgIds: unique });
      setMsgStatus(prev => ({ ...prev, ...data }));
    } catch { /* best effort */ }
  }, []);

  const search = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (category !== 'All') params.set('category', category);
      const data = await api.get<Organization[]>(`/organizations/search?${params}`);
      setResults(data);
      fetchMsgStatus(data.map(o => o.id));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query, category, fetchMsgStatus]);

  // Fetch favorite + connected org IDs once on mount
  useEffect(() => {
    api.get<{ orgId: number }[]>('/favorites')
      .then(favs => setFavoriteIds(new Set(favs.map(f => f.orgId))))
      .catch(() => {});
    api.get<{ status: string; organization: { id: number } }[]>('/partnerships')
      .then(ps => setConnectedIds(new Set(
        ps.filter(p => p.status === 'accepted').map(p => p.organization.id)
      )))
      .catch(() => {});
    api.get<{ id: number; reason?: string }[]>('/feed/recommendations')
      .then(recs => {
        setRecommendedIds(new Set(recs.map(r => r.id)));
        setRecommendedOrder(recs.map(r => r.id));
        const reasons: Record<number, string> = {};
        recs.forEach(r => { if (r.reason) reasons[r.id] = r.reason; });
        setRecommendedReasons(reasons);
      })
      .catch(() => {});
  }, []);

  const filteredResults = viewFilter === 'all'
    ? results
    : viewFilter === 'favorites'
    ? results.filter(o => favoriteIds.has(o.id))
    : viewFilter === 'connected'
    ? results.filter(o => connectedIds.has(o.id))
    : results.filter(o => recommendedIds.has(o.id))
        .sort((a, b) => recommendedOrder.indexOf(a.id) - recommendedOrder.indexOf(b.id));

  useEffect(() => {
    const timeout = setTimeout(search, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const handleCategorySelect = (cat: string) => {
    setCategory(cat);
    setFilterOpen(false);
  };

  return (
    <div className={styles.page}>
      <div className={styles.searchBar}>
        <div className={styles.searchWrapper}>
          <span className={styles.searchIcon}><SearchIcon size={18} /></span>
          <input
            className={styles.searchInput}
            placeholder="Search organizations..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {/* View filter tabs */}
      <div className={styles.filterTabs}>
        {VIEW_TABS.map((t) => (
          <button
            key={t.key}
            className={`${styles.filterTab} ${viewFilter === t.key ? styles.filterTabActive : ''}`}
            onClick={() => setViewFilter(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filter accordion */}
      <div className={styles.filterSection}>
        <button
          className={styles.filterToggle}
          onClick={() => setFilterOpen(!filterOpen)}
        >
          <span className={styles.filterLabel}>
            {category === 'All' ? <><TagIcon size={16} /> All Categories</> : <>{CATEGORIES.find(c => c.name === category)?.icon || <TagIcon size={16} />} {category}</>}
          </span>
          <span className={`${styles.filterArrow} ${filterOpen ? styles.filterArrowOpen : ''}`}>▾</span>
        </button>

        {filterOpen && (
          <div className={styles.filterPanel}>
            <button
              className={`${styles.filterItem} ${category === 'All' ? styles.filterItemActive : ''}`}
              onClick={() => handleCategorySelect('All')}
            >
              <span className={styles.filterItemIcon}><TagIcon size={16} /></span>
              <span className={styles.filterItemName}>All Categories</span>
              {category === 'All' && <span className={styles.filterCheck}><CheckIcon size={16} /></span>}
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.name}
                className={`${styles.filterItem} ${category === cat.name ? styles.filterItemActive : ''}`}
                onClick={() => handleCategorySelect(cat.name)}
              >
                <span className={styles.filterItemIcon}>{cat.icon}</span>
                <span className={styles.filterItemName}>{cat.name}</span>
                {category === cat.name && <span className={styles.filterCheck}><CheckIcon size={16} /></span>}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={styles.resultsHeader}>
        <span className={styles.resultsCount}>
          {loading ? 'Searching...' : `${filteredResults.length} organization${filteredResults.length !== 1 ? 's' : ''}`}
        </span>
      </div>

      <div className={styles.results}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <Spinner />
          </div>
        ) : filteredResults.length === 0 ? (
          <div className={styles.emptySearch}>
            {viewFilter === 'favorites'
              ? <p>No favorite organizations found. Star an org's profile to save it.</p>
              : viewFilter === 'connected'
              ? <p>No connected organizations found. Send a partnership request to connect.</p>
              : viewFilter === 'recommended'
              ? <p>No recommended organizations yet. Complete your org profile for better matches.</p>
              : <p>No organizations found. Try a different search.</p>}
          </div>
        ) : (
          filteredResults.map((org) => (
            <Card key={org.id} clickable onClick={() => navigate(`/org/${org.id}`)}>
              <div className={styles.orgItem}>
                <Avatar name={org.name} src={org.logoUrl} size="lg" />
                <div className={styles.orgInfo}>
                  <p className={styles.orgName}>{org.name}</p>
                  <Badge variant={STANDARD_CATEGORIES.includes(org.category) ? 'primary' : 'neutral'} className={styles.orgBadge}>
                    {!STANDARD_CATEGORIES.includes(org.category) && <><DiamondIcon size={14} />{' '}</>}{org.category}
                  </Badge>
                  {org.city && (
                    <p className={styles.orgLocation}>
                      <LocationIcon size={14} /> {org.city}{org.state ? `, ${org.state}` : ''}
                    </p>
                  )}
                  {org.mission && (
                    <p className={styles.orgMission}>
                      {org.mission.length > 120 ? org.mission.slice(0, 120) + '…' : org.mission}
                    </p>
                  )}
                  {viewFilter === 'recommended' && recommendedReasons[org.id] && (
                    <div className={styles.matchSignals}>
                      {recommendedReasons[org.id].split(' · ').map((signal, i) => {
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
                          <span key={i} className={styles.matchSignal} title={signal}>
                            {icon} {label}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className={styles.orgActions}>
                  <button
                    className={`${styles.orgActionBtn} ${msgStatus[org.id]?.canMessage === false ? styles.orgActionDisabled : ''}`}
                    title={msgStatus[org.id]?.canMessage === false ? 'Message limit reached — connect first' : 'Message'}
                    disabled={msgStatus[org.id]?.canMessage === false}
                    onClick={(e) => { e.stopPropagation(); navigate(`/messages/${org.id}`); }}
                  >
                    <MessageBubbleIcon size={18} />
                  </button>
                  <button
                    className={styles.orgActionBtn}
                    title="Connect"
                    onClick={(e) => { e.stopPropagation(); navigate(`/org/${org.id}`); }}
                  >
                    <HandshakeIcon size={18} />
                  </button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
