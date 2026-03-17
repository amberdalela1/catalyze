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
};

const CATEGORIES = [
  'Education',
  'Health',
  'Environment',
  'Community',
  'Arts & Culture',
  'Youth',
  'Housing',
  'Food Security',
  'Animal Welfare',
  'Other',
];

export default function MyOrgPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [org, setOrg] = useState<Organization>(EMPTY_ORG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isNew, setIsNew] = useState(true);
  const [message, setMessage] = useState('');

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      if (isNew) {
        const created = await api.post<Organization>('/organizations', org);
        setOrg(created);
        setIsNew(false);
        setMessage('Organization created successfully!');
      } else {
        const updated = await api.put<Organization>(`/organizations/${org.id}`, org);
        setOrg(updated);
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
                  value={org.category}
                  onChange={(e) => setOrg({ ...org, category: e.target.value })}
                  required
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
            </form>
          </CardBody>
        </Card>

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
