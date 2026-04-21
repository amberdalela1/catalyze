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
import { StarIcon, DiamondIcon, LocationIcon, HourglassIcon, CheckCircleIcon } from '../components/ui/Icons';
import { ORG_SIZES } from '../utils/resources';
import { RecommendationSignal } from '../utils/recommendationSignals';
import headerStyles from '../components/ui/Header.module.css';

const SIGNAL_COLORS: Record<RecommendationSignal['type'], string> = {
  category: 'var(--color-primary)',
  location: 'var(--color-success)',
  size: 'var(--color-warning)',
  resource: 'var(--color-accent)',
};

function computeResourceSignals(myOffered: string[], myNeeded: string[], theirOffered: string[], theirNeeded: string[]): RecommendationSignal[] {
  const myNeededSet = new Set(myNeeded.map(r => r.toLowerCase()));
  const myOfferedSet = new Set(myOffered.map(r => r.toLowerCase()));
  const theyOfferINeed = theirOffered.filter(r => myNeededSet.has(r.toLowerCase()));
  const iOfferTheyNeed = myOffered.filter(r => new Set(theirNeeded.map(x => x.toLowerCase())).has(r.toLowerCase()));
  void myOfferedSet;
  const signals: RecommendationSignal[] = [];
  const titles: string[] = [];
  let count = 0;
  if (theyOfferINeed.length > 0) {
    titles.push(`They offer ${theyOfferINeed.slice(0, 3).join(', ')} that you need`);
    count += theyOfferINeed.length;
  }
  if (iOfferTheyNeed.length > 0) {
    titles.push(`You can offer them ${iOfferTheyNeed.slice(0, 3).join(', ')}`);
    count += iOfferTheyNeed.length;
  }
  if (count > 0) {
    signals.push({
      type: 'resource',
      label: `${count} resource${count === 1 ? '' : 's'} matched`,
      title: titles.join(' · '),
    });
  }
  return signals;
}

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
  latitude?: number | null;
  longitude?: number | null;
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
  const [matchSignals, setMatchSignals] = useState<RecommendationSignal[]>([]);

  useEffect(() => {
    Promise.all([
      api.get<OrgDetail>(`/organizations/${id}`),
      api.get<{ resources?: OrgResource[] }>('/organizations/mine').catch(() => null),
    ]).then(([data, mine]) => {
      setOrg(data);
      setFavorited(!!data.isFavorited);
      if (mine?.resources && data.resources) {
        const myOffered = mine.resources.filter(r => r.direction === 'offer').map(r => r.resource);
        const myNeeded = mine.resources.filter(r => r.direction === 'need').map(r => r.resource);
        const theirOffered = data.resources.filter(r => r.direction === 'offer').map(r => r.resource);
        const theirNeeded = data.resources.filter(r => r.direction === 'need').map(r => r.resource);
        setMatchSignals(computeResourceSignals(myOffered, myNeeded, theirOffered, theirNeeded));
      }
    }).catch(() => navigate('/feed', { replace: true }))
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

  const offeredResources = (org.resources ?? []).filter((resource) => resource.direction === 'offer');
  const neededResources = (org.resources ?? []).filter((resource) => resource.direction === 'need');
  const sizeOption = org.size
    ? ORG_SIZES.find((option) => option.value.toLowerCase() === org.size?.toLowerCase())
    : undefined;
  const isStandardCategory = STANDARD_CATEGORIES.some(
    (category) => category.toLowerCase() === org.category.toLowerCase()
  );

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
        <Badge variant={isStandardCategory ? 'primary' : 'neutral'}>
          {!isStandardCategory && <><DiamondIcon size={14} />{' '}</>}{org.category}
        </Badge>
        {org.city && (
          <p style={{ color: 'var(--color-gray-500)', marginTop: 'var(--space-2)', fontSize: 'var(--font-size-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
            <LocationIcon size={16} /> {org.city}{org.state ? `, ${org.state}` : ''}
          </p>
        )}
        {matchSignals.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1)', justifyContent: 'center', marginTop: 'var(--space-2)' }}>
            {matchSignals.map((signal, i) => {
              const color = SIGNAL_COLORS[signal.type];
              return (
                <span
                  key={i}
                  title={signal.title}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    fontSize: '10px',
                    fontWeight: 500,
                    color,
                    background: `color-mix(in srgb, ${color} 10%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${color} 24%, transparent)`,
                    borderRadius: 'var(--radius-full)',
                    padding: '2px 6px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {signal.label}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Location map */}
      {org.latitude && org.longitude && (
        <div style={{
          margin: '0 var(--space-4) var(--space-4)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          border: '1.5px solid var(--color-gray-300)',
          height: '150px',
        }}>
          <iframe
            title="Organization location"
            width="100%"
            height="150"
            style={{ border: 0 }}
            loading="lazy"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${org.longitude - 0.15},${org.latitude - 0.1},${org.longitude + 0.15},${org.latitude + 0.1}&layer=mapnik&marker=${org.latitude},${org.longitude}`}
          />
        </div>
      )}

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
            <h3 style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-3)' }}>
              Organization Details
            </h3>
            <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
              <p style={{ color: 'var(--color-gray-600)' }}>
                <strong>Category:</strong> {org.category}
              </p>
              {(org.city || org.state) && (
                <p style={{ color: 'var(--color-gray-600)' }}>
                  <strong>Location:</strong> {[org.city, org.state].filter(Boolean).join(', ')}
                </p>
              )}
              {org.size && (
                <p style={{ color: 'var(--color-gray-600)' }}>
                  <strong>Size:</strong> {sizeOption?.label || org.size}
                </p>
              )}
              {org.registrationNo && (
                <p style={{ color: 'var(--color-gray-600)' }}>
                  <strong>Registration No.:</strong> {org.registrationNo}
                </p>
              )}
              {org.website && (
                <p style={{ color: 'var(--color-gray-600)' }}>
                  <strong>Website:</strong>{' '}
                  <a href={org.website} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)' }}>
                    {org.website}
                  </a>
                </p>
              )}
              {org.contactEmail && (
                <p style={{ color: 'var(--color-gray-600)' }}>
                  <strong>Email:</strong>{' '}
                  <a href={`mailto:${org.contactEmail}`} style={{ color: 'var(--color-primary)' }}>
                    {org.contactEmail}
                  </a>
                </p>
              )}
              {org.contactPhone && (
                <p style={{ color: 'var(--color-gray-600)' }}>
                  <strong>Phone:</strong>{' '}
                  <a href={`tel:${org.contactPhone}`} style={{ color: 'var(--color-primary)' }}>
                    {org.contactPhone}
                  </a>
                </p>
              )}
            </div>
          </CardBody>
        </Card>

        {(offeredResources.length > 0 || neededResources.length > 0) && (
          <Card style={{ marginTop: 'var(--space-3)' }}>
            <CardBody>
              <h3 style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-3)' }}>
                Resources
              </h3>
              {offeredResources.length > 0 && (
                <div style={{ marginBottom: neededResources.length > 0 ? 'var(--space-3)' : 0 }}>
                  <p style={{ color: 'var(--color-gray-600)', marginBottom: 'var(--space-2)' }}>
                    <strong>They Offer</strong>
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                    {offeredResources.map((resource) => (
                      <Badge key={resource.id} variant="success">{resource.resource}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {neededResources.length > 0 && (
                <div>
                  <p style={{ color: 'var(--color-gray-600)', marginBottom: 'var(--space-2)' }}>
                    <strong>They Need</strong>
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                    {neededResources.map((resource) => (
                      <Badge key={resource.id} variant="warning">{resource.resource}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        )}

        <Card style={{ marginTop: 'var(--space-3)' }}>
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

      </div>
    </div>
  );
}
