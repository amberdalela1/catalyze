import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loginWithEmail } from '../services/auth';
import { isNative } from '../utils/platform';
import TextInput from '../components/ui/TextInput';
import Button from '../components/ui/Button';
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

  const handleGoogleLogin = () => {
    // Google OAuth integration — handled via @react-oauth/google
    // Placeholder for Google sign-in flow
  };

  const handleAppleLogin = async () => {
    if (!isNative()) return;
    // Apple Sign-In — handled via @capacitor-community/apple-sign-in
    // Placeholder for Apple sign-in flow
  };

  return (
    <div className={styles.page}>
      <button className={styles.backBtn} onClick={() => navigate('/welcome')}>
        ← Back
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

      <div className={styles.divider}>
        <span className={styles.dividerLine} />
        <span>or continue with</span>
        <span className={styles.dividerLine} />
      </div>

      <div className={styles.socialButtons}>
        <button className={styles.socialBtn} onClick={handleGoogleLogin} type="button">
          <span className={styles.socialIcon}>G</span>
          Google
        </button>
        {isNative() && (
          <button className={styles.socialBtn} onClick={handleAppleLogin} type="button">
            <span className={styles.socialIcon}></span>
            Apple
          </button>
        )}
        <button
          className={styles.socialBtn}
          onClick={() => {/* Phone OTP flow placeholder */}}
          type="button"
        >
          <span className={styles.socialIcon}>📱</span>
          Phone Number
        </button>
      </div>

      <div className={styles.footer}>
        Don&apos;t have an account?{' '}
        <button onClick={() => navigate('/signup')}>Sign Up</button>
      </div>
    </div>
  );
}
