import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import Card from '../components/ui/Card';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import { Spinner } from '../components/ui/Loading';
import styles from './SearchPage.module.css';

const CATEGORIES: { name: string; icon: string }[] = [
  { name: 'Education', icon: '📚' },
  { name: 'Health', icon: '🏥' },
  { name: 'Environment', icon: '🌿' },
  { name: 'Community', icon: '🏘️' },
  { name: 'Arts & Culture', icon: '🎨' },
  { name: 'Youth', icon: '👦' },
  { name: 'Housing', icon: '🏠' },
  { name: 'Food Security', icon: '🍎' },
  { name: 'Animal Welfare', icon: '🐾' },
  { name: 'Other', icon: '✦' },
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

export default function SearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [results, setResults] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const search = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (category !== 'All') params.set('category', category);
      const data = await api.get<Organization[]>(`/organizations/search?${params}`);
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query, category]);

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
          <span className={styles.searchIcon}>🔍</span>
          <input
            className={styles.searchInput}
            placeholder="Search organizations..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Filter accordion */}
      <div className={styles.filterSection}>
        <button
          className={styles.filterToggle}
          onClick={() => setFilterOpen(!filterOpen)}
        >
          <span className={styles.filterLabel}>
            {category === 'All' ? '🏷️ All Categories' : `${CATEGORIES.find(c => c.name === category)?.icon || '🏷️'} ${category}`}
          </span>
          <span className={`${styles.filterArrow} ${filterOpen ? styles.filterArrowOpen : ''}`}>▾</span>
        </button>

        {filterOpen && (
          <div className={styles.filterPanel}>
            <button
              className={`${styles.filterItem} ${category === 'All' ? styles.filterItemActive : ''}`}
              onClick={() => handleCategorySelect('All')}
            >
              <span className={styles.filterItemIcon}>🏷️</span>
              <span className={styles.filterItemName}>All Categories</span>
              {category === 'All' && <span className={styles.filterCheck}>✓</span>}
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.name}
                className={`${styles.filterItem} ${category === cat.name ? styles.filterItemActive : ''}`}
                onClick={() => handleCategorySelect(cat.name)}
              >
                <span className={styles.filterItemIcon}>{cat.icon}</span>
                <span className={styles.filterItemName}>{cat.name}</span>
                {category === cat.name && <span className={styles.filterCheck}>✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={styles.resultsHeader}>
        <span className={styles.resultsCount}>
          {loading ? 'Searching...' : `${results.length} organization${results.length !== 1 ? 's' : ''}`}
        </span>
      </div>

      <div className={styles.results}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <Spinner />
          </div>
        ) : results.length === 0 ? (
          <div className={styles.emptySearch}>
            <p>No organizations found. Try a different search.</p>
          </div>
        ) : (
          results.map((org) => (
            <Card key={org.id} clickable onClick={() => navigate(`/org/${org.id}`)}>
              <div className={styles.orgItem}>
                <Avatar name={org.name} src={org.logoUrl} size="lg" />
                <div className={styles.orgInfo}>
                  <p className={styles.orgName}>{org.name}</p>
                  <Badge variant={STANDARD_CATEGORIES.includes(org.category) ? 'primary' : 'neutral'} className={styles.orgBadge}>
                    {!STANDARD_CATEGORIES.includes(org.category) && '✦ '}{org.category}
                  </Badge>
                  {org.city && (
                    <p className={styles.orgLocation}>
                      📍 {org.city}{org.state ? `, ${org.state}` : ''}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
