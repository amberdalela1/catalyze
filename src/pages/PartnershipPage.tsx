import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import Header from '../components/ui/Header';
import Card, { CardBody } from '../components/ui/Card';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { LoadingCenter } from '../components/ui/Loading';

interface Partnership {
  id: number;
  status: 'pending' | 'accepted' | 'declined';
  message?: string;
  createdAt: string;
  organization: {
    id: number;
    name: string;
    category: string;
    logoUrl?: string;
  };
  direction: 'incoming' | 'outgoing';
}

export default function PartnershipPage() {
  const navigate = useNavigate();
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'all' | 'pending' | 'connected'>('all');

  useEffect(() => {
    api.get<Partnership[]>('/partnerships')
      .then(setPartnerships)
      .catch(() => setPartnerships([]))
      .finally(() => setLoading(false));
  }, []);

  const handleAction = async (id: number, action: 'accepted' | 'declined') => {
    try {
      await api.put(`/partnerships/${id}`, { status: action });
      setPartnerships((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: action } : p))
      );
    } catch {
      // Handle error
    }
  };

  const handleWithdraw = async (id: number) => {
    try {
      await api.delete(`/partnerships/${id}`);
      setPartnerships((prev) => prev.filter((p) => p.id !== id));
    } catch {
      // Handle error
    }
  };

  const filtered = partnerships.filter((p) => {
    if (tab === 'pending') return p.status === 'pending';
    if (tab === 'connected') return p.status === 'accepted';
    return true;
  });

  if (loading) return <LoadingCenter size="lg" />;

  return (
    <div>
      <Header title="Partnerships" />

      <div style={{ display: 'flex', gap: 'var(--space-2)', padding: 'var(--space-3) var(--space-4)', borderBottom: '1px solid var(--color-gray-200)' }}>
        {(['all', 'pending', 'connected'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: 'var(--space-2) var(--space-4)',
              borderRadius: 'var(--radius-full)',
              fontSize: 'var(--font-size-sm)',
              fontWeight: tab === t ? 'var(--font-weight-semibold)' : 'var(--font-weight-normal)',
              backgroundColor: tab === t ? 'var(--color-primary)' : 'transparent',
              color: tab === t ? 'var(--color-white)' : 'var(--color-gray-600)',
              border: tab === t ? 'none' : '1px solid var(--color-gray-200)',
              textTransform: 'capitalize',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--color-gray-400)' }}>
            <p style={{ fontSize: '48px', marginBottom: 'var(--space-4)' }}>🤝</p>
            <p>No partnerships yet. Discover organizations to connect with!</p>
          </div>
        ) : (
          filtered.map((p) => (
            <Card key={p.id}>
              <CardBody>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <Avatar
                    name={p.organization.name}
                    src={p.organization.logoUrl}
                    size="lg"
                  />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 'var(--font-weight-semibold)' }}>
                      {p.organization.name}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-1)' }}>
                      <Badge variant={
                        p.status === 'accepted' ? 'success' :
                        p.status === 'pending' ? 'warning' : 'error'
                      }>
                        {p.status}
                      </Badge>
                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-400)' }}>
                        {p.direction === 'incoming' ? 'Received' : 'Sent'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/org/${p.organization.id}`)}
                    style={{ color: 'var(--color-primary)', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}
                  >
                    View
                  </button>
                </div>

                {p.status === 'pending' && p.direction === 'incoming' && (
                  <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
                    <Button size="sm" onClick={() => handleAction(p.id, 'accepted')}>
                      Accept
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleAction(p.id, 'declined')}>
                      Decline
                    </Button>
                  </div>
                )}
                {p.status === 'pending' && p.direction === 'outgoing' && (
                  <div style={{ marginTop: 'var(--space-3)' }}>
                    <Button size="sm" variant="outline" onClick={() => handleWithdraw(p.id)}>
                      Withdraw Request
                    </Button>
                  </div>
                )}
              </CardBody>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
