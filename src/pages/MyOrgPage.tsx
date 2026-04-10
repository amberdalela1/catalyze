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

interface Organization {
  id?: number;
  name: string;
  description: string;
  mission: string;
  category: string;
  city: string;
  state: string;
  website: string;
  contactEmail: string;
  contactPhone: string;
  registrationNo: string;
  logoUrl?: string;
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

  const handleLogout = async () => {
    await logout();
    navigate('/welcome', { replace: true });
  };

  useEffect(() => {
    api.get<Organization>('/organizations/mine')
      .then((data) => {
        setOrg(data);
        setIsNew(false);
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
        setMessage('Organization created successfully!');
      } else {
        const updated = await api.put<Organization>(`/organizations/${org.id}`, org);
        setOrg(updated);
        setEditing(false);
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
      <Header title={isNew ? 'Create Organization' : 'My Organization'} />

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
                {!isStandardCategory(org.category) && '✦ '}{org.category}
              </Badge>
              {org.city && (
                <p style={{ color: 'var(--color-gray-500)', marginTop: 'var(--space-2)', fontSize: 'var(--font-size-sm)' }}>
                  📍 {org.city}{org.state ? `, ${org.state}` : ''}
                </p>
              )}
            </div>

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
                    <p style={{ color: 'var(--color-gray-600)', marginBottom: 'var(--space-1)' }}>
                      ✉️ {org.contactEmail}
                    </p>
                  )}
                  {org.contactPhone && (
                    <p style={{ color: 'var(--color-gray-600)' }}>
                      📞 {org.contactPhone}
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

            <Button fullWidth onClick={() => setEditing(true)} style={{ marginTop: 'var(--space-4)' }}>
              ✏️ Edit Organization
            </Button>
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
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-500)' }}>
                  🔍 Looking up contact info from website...
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

        <div style={{ marginTop: 'var(--space-6)', padding: '0 var(--space-4) var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <button
            onClick={toggleTheme}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: 'var(--space-3) var(--space-4)',
              borderRadius: 'var(--radius-lg)',
              border: '1.5px solid var(--color-gray-200)',
              backgroundColor: 'var(--color-white)',
              color: 'var(--color-gray-900)',
              fontSize: 'var(--font-size-base)',
              fontWeight: 'var(--font-weight-medium)',
            }}
          >
            <span>{theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}</span>
            <span style={{
              width: 44,
              height: 24,
              borderRadius: 'var(--radius-full)',
              backgroundColor: theme === 'dark' ? 'var(--color-primary)' : 'var(--color-gray-300)',
              position: 'relative',
              display: 'inline-block',
              transition: 'background-color var(--transition-fast)',
            }}>
              <span style={{
                position: 'absolute',
                top: 2,
                left: theme === 'dark' ? 22 : 2,
                width: 20,
                height: 20,
                borderRadius: '50%',
                backgroundColor: '#fff',
                transition: 'left var(--transition-fast)',
                boxShadow: 'var(--shadow-sm)',
              }} />
            </span>
          </button>
          <Button variant="outline" fullWidth onClick={handleLogout}>
            Log Out
          </Button>
        </div>
      </div>
    </div>
  );
}
