import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import Header from '../components/ui/Header';
import TextInput from '../components/ui/TextInput';
import Button from '../components/ui/Button';
import Card, { CardBody } from '../components/ui/Card';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import { LoadingCenter } from '../components/ui/Loading';
import MediaCollage, { MediaUploader, MediaItem } from '../components/ui/MediaCollage';
import ResourcePicker from '../components/ui/ResourcePicker';
import headerStyles from '../components/ui/Header.module.css';
import { DiamondIcon, LocationIcon, EmailIcon, PhoneIcon, BuildingIcon, EditIcon, SearchIcon, SunIcon, MoonIcon, LogoutIcon } from '../components/ui/Icons';
import { ORG_SIZES } from '../utils/resources';

interface OrgResource {
  id: number;
  resource: string;
  direction: string;
  isCustom: boolean;
}

interface Organization {
  id?: number;
  name: string;
  description: string;
  mission: string;
  category: string;
  city: string;
  state: string;
  latitude?: number | null;
  longitude?: number | null;
  website: string;
  contactEmail: string;
  contactPhone: string;
  registrationNo: string;
  size: string;
  logoUrl?: string;
  media?: MediaItem[];
  resources?: OrgResource[];
}

const EMPTY_ORG: Organization = {
  name: '',
  description: '',
  mission: '',
  category: '',
  city: '',
  state: '',
  website: '',
  contactEmail: '',
  contactPhone: '',
  registrationNo: '',
  size: '',
};

const STANDARD_CATEGORIES = [
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

const CATEGORIES = [...STANDARD_CATEGORIES, 'Other'];

function isStandardCategory(cat: string): boolean {
  return STANDARD_CATEGORIES.includes(cat);
}

export default function MyOrgPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [org, setOrg] = useState<Organization>(EMPTY_ORG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isNew, setIsNew] = useState(true);
  const [message, setMessage] = useState('');
  const [scraping, setScraping] = useState(false);
  const [editing, setEditing] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [offeredResources, setOfferedResources] = useState<string[]>([]);
  const [neededResources, setNeededResources] = useState<string[]>([]);

  const handleLogout = async () => {
    await logout();
    navigate('/welcome', { replace: true });
  };

  useEffect(() => {
    api.get<Organization>('/organizations/mine')
      .then((data) => {
        setOrg(data);
        setIsNew(false);
        // Initialize resource selections from loaded data
        if (data.resources) {
          setOfferedResources(data.resources.filter(r => r.direction === 'offer').map(r => r.resource));
          setNeededResources(data.resources.filter(r => r.direction === 'need').map(r => r.resource));
        }
      })
      .catch(() => {
        setIsNew(true);
      })
      .finally(() => setLoading(false));
  }, []);

  const scrapeContact = async (url: string) => {
    if (!url || scraping) return;
    setScraping(true);
    try {
      const data = await api.get<{ contactEmail: string | null; contactPhone: string | null }>(
        `/scrape-contact?url=${encodeURIComponent(url)}`
      );
      setOrg(prev => ({
        ...prev,
        contactEmail: data.contactEmail || prev.contactEmail,
        contactPhone: data.contactPhone || prev.contactPhone,
      }));
    } catch { /* ignore */ }
    finally { setScraping(false); }
  };

  const handleWebsiteBlur = () => {
    scrapeContact(org.website.trim());
  };

  const handleWebsitePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').trim();
    if (pasted && /^https?:\/\//i.test(pasted)) {
      // Update the value immediately since onChange may fire after paste
      setOrg(prev => ({ ...prev, website: pasted }));
      setTimeout(() => scrapeContact(pasted), 100);
    }
  };

  const uploadMedia = async (orgId: number) => {
    if (mediaFiles.length === 0 && mediaUrls.length === 0) return;
    setUploadingMedia(true);
    try {
      const formData = new FormData();
      formData.append('orgId', String(orgId));
      mediaFiles.forEach((f) => formData.append('files', f));
      if (mediaUrls.length > 0) formData.append('urls', JSON.stringify(mediaUrls));
      const uploaded = await api.upload<MediaItem[]>('/media/upload', formData);
      setOrg(prev => ({ ...prev, media: [...(prev.media || []), ...uploaded] }));
      setMediaFiles([]);
      setMediaUrls([]);
    } catch { /* ignore upload errors */ }
    finally { setUploadingMedia(false); }
  };

  const handleRemoveExistingMedia = async (mediaId: number) => {
    try {
      await api.delete(`/media/${mediaId}`);
      setOrg(prev => ({ ...prev, media: (prev.media || []).filter(m => m.id !== mediaId) }));
    } catch { /* ignore */ }
  };

  const handleDeleteAllMedia = async () => {
    if (!org.media || org.media.length === 0) return;
    try {
      await Promise.all(org.media.map(m => api.delete(`/media/${m.id}`)));
      setOrg(prev => ({ ...prev, media: [] }));
    } catch { /* ignore */ }
  };

  const saveResources = async (orgId: number) => {
    await Promise.all([
      api.put('/resources', {
        orgId,
        direction: 'offer',
        resources: offeredResources.map((resource) => ({ resource })),
      }),
      api.put('/resources', {
        orgId,
        direction: 'need',
        resources: neededResources.map((resource) => ({ resource })),
      }),
    ]);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      if (isNew) {
        const created = await api.post<Organization>('/organizations', org);
        setOrg(created);
        setIsNew(false);
        setEditing(false);
        await uploadMedia(created.id!);
        await saveResources(created.id!);
        const refreshed = await api.get<Organization>('/organizations/mine');
        setOrg(refreshed);
        if (refreshed.resources) {
          setOfferedResources(refreshed.resources.filter(r => r.direction === 'offer').map(r => r.resource));
          setNeededResources(refreshed.resources.filter(r => r.direction === 'need').map(r => r.resource));
        }
        setMessage('Organization created successfully!');
      } else {
        const updated = await api.put<Organization>(`/organizations/${org.id}`, org);
        setOrg(updated);
        setEditing(false);
        await uploadMedia(org.id!);
        await saveResources(org.id!);
        const refreshed = await api.get<Organization>('/organizations/mine');
        setOrg(refreshed);
        if (refreshed.resources) {
          setOfferedResources(refreshed.resources.filter(r => r.direction === 'offer').map(r => r.resource));
          setNeededResources(refreshed.resources.filter(r => r.direction === 'need').map(r => r.resource));
        }
        setMessage('Organization updated successfully!');
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingCenter size="lg" />;

  return (
    <div>
      <Header title={isNew ? 'Create Organization' : 'My Organization'}
        actions={
          <>
            {!isNew && !editing && (
              <button
                className={headerStyles.actionBtn}
                onClick={() => setEditing(true)}
                aria-label="Edit organization"
              >
                <EditIcon size={22} />
              </button>
            )}
            <button
              className={headerStyles.actionBtn}
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <SunIcon size={22} /> : <MoonIcon size={22} />}
            </button>
            <button
              className={headerStyles.actionBtn}
              onClick={handleLogout}
              aria-label="Log out"
            >
              <LogoutIcon size={22} />
            </button>
          </>
        }
      />

      <div style={{ padding: 'var(--space-4)' }}>
        {/* Profile View (read-only) */}
        {!isNew && !editing && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-4)' }}>
              <Avatar name={org.name || 'O'} src={org.logoUrl} size="xl" />
              <h2 style={{ marginTop: 'var(--space-3)', fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)' }}>
                {org.name}
              </h2>
              <Badge variant={isStandardCategory(org.category) ? 'primary' : 'neutral'}>
                {!isStandardCategory(org.category) && <><DiamondIcon size={14} />{' '}</>}{org.category}
              </Badge>
              {org.city && (
                <p style={{ color: 'var(--color-gray-500)', marginTop: 'var(--space-2)', fontSize: 'var(--font-size-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                  <LocationIcon size={16} /> {org.city}{org.state ? `, ${org.state}` : ''}
                </p>
              )}
            </div>

            {/* Location map preview */}
            {org.latitude && org.longitude && (
              <div style={{
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                border: '1.5px solid var(--color-gray-300)',
                height: '150px',
                marginBottom: 'var(--space-4)',
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

            {org.media && org.media.length > 0 && (
              <div style={{ marginBottom: 'var(--space-4)', maxHeight: '120px', overflow: 'hidden', borderRadius: 'var(--radius-lg)' }}>
                <MediaCollage media={org.media} />
              </div>
            )}

            <Card>
              <CardBody>
                <h3 style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-2)' }}>Mission</h3>
                <p style={{ color: 'var(--color-gray-600)', lineHeight: '1.6' }}>{org.mission}</p>
              </CardBody>
            </Card>

            {org.description && (
              <Card style={{ marginTop: 'var(--space-3)' }}>
                <CardBody>
                  <h3 style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-2)' }}>About</h3>
                  <p style={{ color: 'var(--color-gray-600)', lineHeight: '1.6' }}>{org.description}</p>
                </CardBody>
              </Card>
            )}

            {org.website && (
              <Card style={{ marginTop: 'var(--space-3)' }}>
                <CardBody>
                  <h3 style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-2)' }}>Website</h3>
                  <a href={org.website} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)' }}>
                    {org.website}
                  </a>
                </CardBody>
              </Card>
            )}

            {(org.contactEmail || org.contactPhone) && (
              <Card style={{ marginTop: 'var(--space-3)' }}>
                <CardBody>
                  <h3 style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-2)' }}>Contact</h3>
                  {org.contactEmail && (
                    <p style={{ color: 'var(--color-gray-600)', marginBottom: 'var(--space-1)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <EmailIcon size={16} /> {org.contactEmail}
                    </p>
                  )}
                  {org.contactPhone && (
                    <p style={{ color: 'var(--color-gray-600)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <PhoneIcon size={16} /> {org.contactPhone}
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

            {offeredResources.length > 0 && (
              <Card style={{ marginTop: 'var(--space-3)' }}>
                <CardBody>
                  <h3 style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-2)' }}>Resources We Offer</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                    {offeredResources.map(r => <Badge key={r} variant="success">{r}</Badge>)}
                  </div>
                </CardBody>
              </Card>
            )}

            {neededResources.length > 0 && (
              <Card style={{ marginTop: 'var(--space-3)' }}>
                <CardBody>
                  <h3 style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-2)' }}>Resources We Need</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                    {neededResources.map(r => <Badge key={r} variant="warning">{r}</Badge>)}
                  </div>
                </CardBody>
              </Card>
            )}
          </>
        )}

        {/* Edit Form (shown for new orgs or when editing) */}
        {(isNew || editing) && (
          <>
            {!isNew && (
              <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
                <Avatar name={org.name || 'O'} src={org.logoUrl} size="xl" />
              </div>
            )}

            <Card>
          <CardBody>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <TextInput
                label="Organization Name"
                placeholder="Enter your organization's name"
                value={org.name}
                onChange={(e) => setOrg({ ...org, name: e.target.value })}
                required
              />

              <div>
                <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-gray-700)', display: 'block', marginBottom: 'var(--space-1)' }}>
                  Category
                </label>
                <select
                  value={isStandardCategory(org.category) ? org.category : (org.category !== '' ? 'Other' : '')}
                  onChange={(e) => {
                    const val = e.target.value;
                    setOrg({ ...org, category: val === 'Other' ? '' : val });
                  }}
                  required={!org.category}
                  style={{
                    width: '100%',
                    padding: 'var(--space-3) var(--space-4)',
                    fontSize: 'var(--font-size-base)',
                    border: '1.5px solid var(--color-gray-300)',
                    borderRadius: 'var(--radius-lg)',
                    outline: 'none',
                    backgroundColor: 'var(--color-white)',
                    color: 'var(--color-gray-900)',
                    minHeight: '48px',
                  }}
                >
                  <option value="">Select a category</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                {!isStandardCategory(org.category) && (
                  <TextInput
                    placeholder="Enter your custom category"
                    value={org.category}
                    onChange={(e) => setOrg({ ...org, category: e.target.value })}
                    required
                    style={{ marginTop: 'var(--space-2)' }}
                  />
                )}
              </div>

              <TextInput
                label="Mission Statement"
                placeholder="What is your organization's mission?"
                value={org.mission}
                onChange={(e) => setOrg({ ...org, mission: e.target.value })}
                required
              />

              <div>
                <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-gray-700)', display: 'block', marginBottom: 'var(--space-1)' }}>
                  Description
                </label>
                <textarea
                  placeholder="Tell us more about your organization..."
                  value={org.description}
                  onChange={(e) => setOrg({ ...org, description: e.target.value })}
                  rows={4}
                  style={{
                    width: '100%',
                    padding: 'var(--space-3) var(--space-4)',
                    fontSize: 'var(--font-size-base)',
                    border: '1.5px solid var(--color-gray-300)',
                    borderRadius: 'var(--radius-lg)',
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    backgroundColor: 'var(--color-white)',
                    color: 'var(--color-gray-900)',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <TextInput
                  label="City"
                  placeholder="City"
                  value={org.city}
                  onChange={(e) => setOrg({ ...org, city: e.target.value })}
                />
                <TextInput
                  label="State"
                  placeholder="State"
                  value={org.state}
                  onChange={(e) => setOrg({ ...org, state: e.target.value })}
                />
              </div>

              {/* Location preview */}
              {org.latitude && org.longitude && (
                <div style={{
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden',
                  border: '1.5px solid var(--color-gray-300)',
                  height: '150px',
                  position: 'relative',
                }}>
                  <iframe
                    title="Organization location"
                    width="100%"
                    height="150"
                    style={{ border: 0 }}
                    loading="lazy"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${org.longitude - 0.15},${org.latitude - 0.1},${org.longitude + 0.15},${org.latitude + 0.1}&layer=mapnik&marker=${org.latitude},${org.longitude}`}
                  />
                  <div style={{
                    position: 'absolute',
                    bottom: '8px',
                    left: '8px',
                    backgroundColor: 'rgba(255,255,255,0.9)',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-gray-600)',
                  }}>
                    <LocationIcon size={12} /> {org.city}, {org.state}
                  </div>
                </div>
              )}

              <TextInput
                label="Website"
                type="url"
                placeholder="https://yourorg.org"
                value={org.website}
                onChange={(e) => setOrg({ ...org, website: e.target.value })}
                onBlur={handleWebsiteBlur}
                onPaste={handleWebsitePaste}
              />

              {scraping && (
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-500)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <SearchIcon size={14} /> Looking up contact info from website...
                </p>
              )}

              <TextInput
                label="Contact Email"
                type="email"
                placeholder="contact@yourorg.org"
                value={org.contactEmail}
                onChange={(e) => setOrg({ ...org, contactEmail: e.target.value })}
              />

              <TextInput
                label="Contact Phone"
                type="tel"
                placeholder="(555) 123-4567"
                value={org.contactPhone}
                onChange={(e) => setOrg({ ...org, contactPhone: e.target.value })}
              />

              <TextInput
                label="Registration No."
                placeholder="e.g. 501(c)(3)-1234567"
                value={org.registrationNo}
                onChange={(e) => setOrg({ ...org, registrationNo: e.target.value })}
              />

              <MediaUploader
                files={mediaFiles}
                onFilesChange={setMediaFiles}
                urls={mediaUrls}
                onUrlsChange={setMediaUrls}
                existingMedia={org.media || []}
                onRemoveExisting={handleRemoveExistingMedia}
                label="Brand Photos & Videos"
              />

              {uploadingMedia && (
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-500)' }}>
                  Uploading media...
                </p>
              )}

              {org.media && org.media.length > 0 && (
                <button
                  type="button"
                  onClick={handleDeleteAllMedia}
                  style={{
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-error, #e53e3e)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    marginTop: 'calc(-1 * var(--space-2))',
                  }}
                >
                  Delete all photos
                </button>
              )}

              {/* Organization Size */}
              <div>
                <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-gray-700)', display: 'block', marginBottom: 'var(--space-2)' }}>
                  Organization Size
                </label>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  {ORG_SIZES.map(s => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setOrg({ ...org, size: s.value })}
                      style={{
                        flex: 1,
                        padding: 'var(--space-3)',
                        borderRadius: 'var(--radius-lg)',
                        border: org.size === s.value ? '2px solid var(--color-primary)' : '1.5px solid var(--color-gray-300)',
                        backgroundColor: org.size === s.value ? 'var(--color-primary-50)' : 'var(--color-white)',
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-sm)', color: org.size === s.value ? 'var(--color-primary)' : 'var(--color-gray-700)' }}>
                        {s.label}
                      </div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-500)', marginTop: '2px' }}>
                        {s.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Resources Offered */}
              <div>
                <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-gray-700)', display: 'block' }}>
                  Resources We Can Offer
                </label>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-500)', marginBottom: 'var(--space-1)' }}>
                  Select services and resources your organization can provide to others
                </p>
                <ResourcePicker
                  label="Resources to Offer"
                  selected={offeredResources}
                  onChange={setOfferedResources}
                  placeholder="Add resources"
                />
              </div>

              {/* Resources Needed */}
              <div>
                <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-gray-700)', display: 'block' }}>
                  Resources We Need
                </label>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-500)', marginBottom: 'var(--space-1)' }}>
                  Select services and resources your organization is looking for
                </p>
                <ResourcePicker
                  label="Resources Needed"
                  selected={neededResources}
                  onChange={setNeededResources}
                  placeholder="Add needs"
                />
              </div>

              {message && (
                <p style={{
                  color: message.includes('success') ? 'var(--color-success)' : 'var(--color-error)',
                  fontSize: 'var(--font-size-sm)',
                }}>
                  {message}
                </p>
              )}

              <Button type="submit" fullWidth disabled={saving}>
                {saving ? 'Saving...' : isNew ? 'Create Organization' : 'Save Changes'}
              </Button>
              {!isNew && (
                <Button type="button" variant="outline" fullWidth onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              )}
            </form>
          </CardBody>
        </Card>
          </>
        )}
      </div>
    </div>
  );
}
