import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import Header from '../components/ui/Header';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card, { CardBody } from '../components/ui/Card';
import { LoadingCenter } from '../components/ui/Loading';

interface OrgDetail {
  id: number;
  name: string;
  description: string;
  mission: string;
  category: string;
  city?: string;
  state?: string;
  website?: string;
  contactEmail?: string;
  contactPhone?: string;
  registrationNo?: string;
  logoUrl?: string;
  isOwner?: boolean;
  isFavorited?: boolean;
  partnershipStatus?: 'none' | 'pending' | 'accepted';
  partnershipId?: number;
}

const STANDARD_CATEGORIES = [
  'Education', 'Health', 'Environment', 'Community', 'Arts & Culture',
  'Youth', 'Housing', 'Food Security', 'Animal Welfare',
];

export default function OrgProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [org, setOrg] = useState<OrgDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [favorited, setFavorited] = useState(false);

  useEffect(() => {
    api.get<OrgDetail>(`/organizations/${id}`)
      .then((data) => { setOrg(data); setFavorited(!!data.isFavorited); })
      .catch(() => navigate('/feed', { replace: true }))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleConnect = async () => {
    if (!org) return;
    setConnecting(true);
    try {
      await api.post('/partnerships', { targetId: org.id });
      setOrg({ ...org, partnershipStatus: 'pending' });
    } finally {
      setConnecting(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!org) return;
    try {
      if (favorited) {
        await api.delete(`/favorites/${org.id}`);
      } else {
        await api.post(`/favorites/${org.id}`, {});
      }
      setFavorited(!favorited);
    } catch { /* ignore */ }
  };

  if (loading) return <LoadingCenter size="lg" />;
  if (!org) return null;

  return (
    <div>
      <Header title={org.name} showBack
        actions={
          <button
            onClick={handleToggleFavorite}
            style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', padding: 'var(--space-1)' }}
            aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
          >
            {favorited ? '⭐' : '☆'}
          </button>
        }
      />

      <div style={{ textAlign: 'center', padding: 'var(--space-8) var(--space-4) var(--space-4)' }}>
        <Avatar name={org.name} src={org.logoUrl} size="xl" />
        <h2 style={{ marginTop: 'var(--space-3)', fontSize: 'var(--font-size-2xl)' }}>
          {org.name}
        </h2>
        <Badge variant={STANDARD_CATEGORIES.includes(org.category) ? 'primary' : 'neutral'}>
          {!STANDARD_CATEGORIES.includes(org.category) && '✦ '}{org.category}
        </Badge>
        {org.city && (
          <p style={{ color: 'var(--color-gray-500)', marginTop: 'var(--space-2)', fontSize: 'var(--font-size-sm)' }}>
            📍 {org.city}{org.state ? `, ${org.state}` : ''}
          </p>
        )}
      </div>

      <div style={{ padding: '0 var(--space-4) var(--space-4)' }}>
        {!org.isOwner && org.partnershipStatus === 'none' && (
          <Button fullWidth onClick={handleConnect} disabled={connecting}>
            {connecting ? 'Sending...' : '🤝 Connect'}
          </Button>
        )}
        {org.partnershipStatus === 'pending' && (
          <Button
            fullWidth
            variant="outline"
            onClick={async () => {
              if (!org.partnershipId) return;
              setWithdrawing(true);
              try {
                await api.delete(`/partnerships/${org.partnershipId}`);
                setOrg({ ...org, partnershipStatus: 'none', partnershipId: undefined });
              } finally {
                setWithdrawing(false);
              }
            }}
            disabled={withdrawing}
          >
            {withdrawing ? 'Withdrawing...' : '⏳ Pending — Tap to Withdraw'}
          </Button>
        )}
        {org.partnershipStatus === 'accepted' && (
          <Button fullWidth variant="secondary" disabled>
            ✅ Connected
          </Button>
        )}
        {!org.isOwner && (
          <Button
            fullWidth
            variant="outline"
            onClick={() => navigate(`/messages/${org.id}`)}
            style={{ marginTop: 'var(--space-2)' }}
          >
            💬 Message
          </Button>
        )}
      </div>

      <div style={{ padding: 'var(--space-4)' }}>
        <Card>
          <CardBody>
            <h3 style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-2)' }}>
              Mission
            </h3>
            <p style={{ color: 'var(--color-gray-600)', lineHeight: '1.6' }}>
              {org.mission}
            </p>
          </CardBody>
        </Card>

        {org.description && (
          <Card style={{ marginTop: 'var(--space-3)' }}>
            <CardBody>
              <h3 style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-2)' }}>
                About
              </h3>
              <p style={{ color: 'var(--color-gray-600)', lineHeight: '1.6' }}>
                {org.description}
              </p>
            </CardBody>
          </Card>
        )}

        {org.website && (
          <Card style={{ marginTop: 'var(--space-3)' }}>
            <CardBody>
              <h3 style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-2)' }}>
                Website
              </h3>
              <a
                href={org.website}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--color-primary)' }}
              >
                {org.website}
              </a>
            </CardBody>
          </Card>
        )}

        {(org.contactEmail || org.contactPhone) && (
          <Card style={{ marginTop: 'var(--space-3)' }}>
            <CardBody>
              <h3 style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-2)' }}>
                Contact Us
              </h3>
              {org.contactEmail && (
                <p style={{ color: 'var(--color-gray-600)', marginBottom: 'var(--space-1)' }}>
                  ✉️{' '}
                  <a href={`mailto:${org.contactEmail}`} style={{ color: 'var(--color-primary)' }}>
                    {org.contactEmail}
                  </a>
                </p>
              )}
              {org.contactPhone && (
                <p style={{ color: 'var(--color-gray-600)' }}>
                  📞{' '}
                  <a href={`tel:${org.contactPhone}`} style={{ color: 'var(--color-primary)' }}>
                    {org.contactPhone}
                  </a>
                </p>
              )}
            </CardBody>
          </Card>
        )}

        {org.registrationNo && (
          <Card style={{ marginTop: 'var(--space-3)' }}>
            <CardBody>
              <h3 style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-2)' }}>Registration No.</h3>
              <p style={{ color: 'var(--color-gray-600)' }}>🏛️ {org.registrationNo}</p>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
