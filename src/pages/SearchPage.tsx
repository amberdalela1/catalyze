import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import Card from '../components/ui/Card';
import Avatar from '../components/ui/Avatar';
import { Spinner } from '../components/ui/Loading';
import styles from './SearchPage.module.css';

const CATEGORIES = [
  'All',
  'Education',
  'Health',
  'Environment',
  'Community',
  'Arts & Culture',
  'Youth',
  'Housing',
  'Food Security',
  'Animal Welfare',
];

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

      <div className={styles.categories}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`${styles.categoryPill} ${category === cat ? styles.categoryActive : ''}`}
            onClick={() => setCategory(cat)}
          >
            {cat}
          </button>
        ))}
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
                  <p className={styles.orgCategory}>{org.category}</p>
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
