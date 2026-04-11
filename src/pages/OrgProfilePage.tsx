import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import Header from '../components/ui/Header';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card, { CardBody } from '../components/ui/Card';
import { LoadingCenter } from '../components/ui/Loading';
import MediaCollage, { MediaItem } from '../components/ui/MediaCollage';
import MessageBubbleIcon from '../components/ui/MessageBubbleIcon';
import HandshakeIcon from '../components/ui/HandshakeIcon';
import { StarIcon, DiamondIcon, LocationIcon, EmailIcon, PhoneIcon, BuildingIcon, HourglassIcon, CheckCircleIcon } from '../components/ui/Icons';
import { ORG_SIZES } from '../utils/resources';
import headerStyles from '../components/ui/Header.module.css';

interface OrgResource {
  id: number;
  resource: string;
  direction: string;
  isCustom: boolean;
}

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
  size?: string;
  logoUrl?: string;
  isOwner?: boolean;
  isFavorited?: boolean;
  partnershipStatus?: 'none' | 'pending' | 'accepted';
  partnershipId?: number;
  media?: MediaItem[];
  resources?: OrgResource[];
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
            className={headerStyles.actionBtn}
            onClick={handleToggleFavorite}
            aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
          >
            <StarIcon filled={favorited} />
          </button>
        }
      />

      <div style={{ textAlign: 'center', padding: 'var(--space-8) var(--space-4) var(--space-4)' }}>
        <Avatar name={org.name} src={org.logoUrl} size="xl" />
        <h2 style={{ marginTop: 'var(--space-3)', fontSize: 'var(--font-size-2xl)' }}>
          {org.name}
        </h2>
        <Badge variant={STANDARD_CATEGORIES.includes(org.category) ? 'primary' : 'neutral'}>
          {!STANDARD_CATEGORIES.includes(org.category) && <><DiamondIcon size={14} />{' '}</>}{org.category}
        </Badge>
        {org.city && (
          <p style={{ color: 'var(--color-gray-500)', marginTop: 'var(--space-2)', fontSize: 'var(--font-size-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
            <LocationIcon size={16} /> {org.city}{org.state ? `, ${org.state}` : ''}
          </p>
        )}
      </div>

      <div style={{ padding: '0 var(--space-4) var(--space-4)' }}>
        {!org.isOwner && org.partnershipStatus === 'none' && (
          <Button fullWidth onClick={handleConnect} disabled={connecting}>
            {connecting ? 'Sending...' : <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><HandshakeIcon size={18} /> Connect</span>}
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
            {withdrawing ? 'Withdrawing...' : <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><HourglassIcon size={18} /> Pending — Tap to Withdraw</span>}
          </Button>
        )}
        {org.partnershipStatus === 'accepted' && (
          <Button fullWidth variant="secondary" disabled>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><CheckCircleIcon size={18} /> Connected</span>
          </Button>
        )}
        {!org.isOwner && (
          <Button
            fullWidth
            variant="outline"
            onClick={() => navigate(`/messages/${org.id}`)}
            style={{ marginTop: 'var(--space-2)' }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><MessageBubbleIcon size={18} /> Message</span>
          </Button>
        )}
      </div>

      {org.media && org.media.length > 0 && (
        <div style={{ padding: '0 var(--space-4) var(--space-4)' }}>
          <MediaCollage media={org.media} />
        </div>
      )}

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
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><EmailIcon size={16} />{' '}
                  <a href={`mailto:${org.contactEmail}`} style={{ color: 'var(--color-primary)' }}>
                    {org.contactEmail}
                  </a></span>
                </p>
              )}
              {org.contactPhone && (
                <p style={{ color: 'var(--color-gray-600)' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><PhoneIcon size={16} />{' '}
                  <a href={`tel:${org.contactPhone}`} style={{ color: 'var(--color-primary)' }}>
                    {org.contactPhone}
                  </a></span>
                </p>
              )}
            </CardBody>
          </Card>
        )}

        {org.registrationNo && (
          <Card style={{ marginTop: 'var(--space-3)' }}>
            <CardBody>
              <h3 style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-2)' }}>Registration No.</h3>
              <p style={{ color: 'var(--color-gray-600)', display: 'flex', alignItems: 'center', gap: '6px' }}><BuildingIcon size={16} /> {org.registrationNo}</p>
            </CardBody>
          </Card>
        )}

        {org.size && (
          <Card style={{ marginTop: 'var(--space-3)' }}>
            <CardBody>
              <h3 style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-2)' }}>Organization Size</h3>
              <Badge variant="primary">{ORG_SIZES.find(s => s.value === org.size)?.label || org.size}</Badge>
              <p style={{ color: 'var(--color-gray-500)', fontSize: 'var(--font-size-xs)', marginTop: 'var(--space-1)' }}>
                {ORG_SIZES.find(s => s.value === org.size)?.description}
              </p>
            </CardBody>
          </Card>
        )}

        {org.resources && org.resources.filter(r => r.direction === 'offer').length > 0 && (
          <Card style={{ marginTop: 'var(--space-3)' }}>
            <CardBody>
              <h3 style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-2)' }}>Resources They Offer</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                {org.resources.filter(r => r.direction === 'offer').map(r => (
                  <Badge key={r.id} variant="success">{r.resource}</Badge>
                ))}
              </div>
            </CardBody>
          </Card>
        )}

        {org.resources && org.resources.filter(r => r.direction === 'need').length > 0 && (
          <Card style={{ marginTop: 'var(--space-3)' }}>
            <CardBody>
              <h3 style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-2)' }}>Resources They Need</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                {org.resources.filter(r => r.direction === 'need').map(r => (
                  <Badge key={r.id} variant="warning">{r.resource}</Badge>
                ))}
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
