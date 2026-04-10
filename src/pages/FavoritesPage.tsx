import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import Header from '../components/ui/Header';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import Card, { CardBody } from '../components/ui/Card';
import { LoadingCenter } from '../components/ui/Loading';

interface FavoriteOrg {
  id: number;
  orgId: number;
  createdAt: string;
  organization: {
    id: number;
    name: string;
    category: string;
    city?: string;
    state?: string;
    logoUrl?: string;
    mission: string;
  };
}

export default function FavoritesPage() {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<FavoriteOrg[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<FavoriteOrg[]>('/favorites')
      .then(setFavorites)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleRemove = async (orgId: number) => {
    await api.delete(`/favorites/${orgId}`);
    setFavorites(prev => prev.filter(f => f.orgId !== orgId));
  };

  if (loading) return <LoadingCenter size="lg" />;

  return (
    <div>
      <Header title="Favorites" />

      <div style={{ padding: 'var(--space-4)' }}>
        {favorites.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-12) var(--space-4)', color: 'var(--color-gray-500)' }}>
            <p style={{ fontSize: 'var(--font-size-2xl)', marginBottom: 'var(--space-2)' }}>☆</p>
            <p style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-1)' }}>
              No favorites yet
            </p>
            <p style={{ fontSize: 'var(--font-size-sm)' }}>
              Tap the star on an organization's profile to save it here.
            </p>
          </div>
        ) : (
          favorites.map(fav => (
            <Card
              key={fav.id}
              style={{ marginBottom: 'var(--space-3)', cursor: 'pointer' }}
              onClick={() => navigate(`/org/${fav.organization.id}`)}
            >
              <CardBody>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <Avatar name={fav.organization.name} src={fav.organization.logoUrl} size="md" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{
                      fontWeight: 'var(--font-weight-semibold)',
                      fontSize: 'var(--font-size-base)',
                      marginBottom: 'var(--space-1)',
                    }}>
                      {fav.organization.name}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                      <Badge>{fav.organization.category}</Badge>
                      {fav.organization.city && (
                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-500)' }}>
                          📍 {fav.organization.city}{fav.organization.state ? `, ${fav.organization.state}` : ''}
                        </span>
                      )}
                    </div>
                    <p style={{
                      fontSize: 'var(--font-size-sm)',
                      color: 'var(--color-gray-600)',
                      marginTop: 'var(--space-1)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {fav.organization.mission}
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRemove(fav.orgId); }}
                    style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', padding: 'var(--space-1)' }}
                    aria-label="Remove from favorites"
                  >
                    ⭐
                  </button>
                </div>
              </CardBody>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
