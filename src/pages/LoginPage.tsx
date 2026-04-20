import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loginWithEmail } from '../services/auth';
import TextInput from '../components/ui/TextInput';
import Button from '../components/ui/Button';

function ChevronLeftIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path fill="currentColor" d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
    </svg>
  );
}

import styles from './AuthPage.module.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await loginWithEmail(email, password, rememberMe);
      login(data.user);
      navigate('/feed', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <button className={styles.backBtn} onClick={() => navigate('/welcome')}>
        <ChevronLeftIcon size={20} /> Back
      </button>

      <h1 className={styles.heading}>Welcome back</h1>
      <p className={styles.subtitle}>Log in to your Catalyze account</p>

      <form className={styles.form} onSubmit={handleSubmit}>
        <TextInput
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <TextInput
          label="Password"
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
        {error && <p style={{ color: 'var(--color-error)', fontSize: 'var(--font-size-sm)' }}>{error}</p>}
        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-600)', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            style={{ width: 18, height: 18, accentColor: 'var(--color-primary)' }}
          />
          Remember me
        </label>
        <Button type="submit" fullWidth disabled={loading}>
          {loading ? 'Logging in...' : 'Log In'}
        </Button>
      </form>

      <div className={styles.footer}>
        Don&apos;t have an account?{' '}
        <button onClick={() => navigate('/signup')}>Sign Up</button>
      </div>
    </div>
  );
}
