import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { signUpWithEmail } from '../services/auth';
import { isNative } from '../utils/platform';
import TextInput from '../components/ui/TextInput';
import Button from '../components/ui/Button';
import styles from './AuthPage.module.css';

export default function SignUpPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      const data = await signUpWithEmail(name, email, password);
      login(data.user);
      navigate('/my-org', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <button className={styles.backBtn} onClick={() => navigate('/welcome')}>
        ← Back
      </button>

      <h1 className={styles.heading}>Create Account</h1>
      <p className={styles.subtitle}>Join Catalyze and start connecting</p>

      <form className={styles.form} onSubmit={handleSubmit}>
        <TextInput
          label="Full Name"
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoComplete="name"
        />
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
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
        />
        <TextInput
          label="Confirm Password"
          type="password"
          placeholder="Re-enter your password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          autoComplete="new-password"
        />
        {error && <p style={{ color: 'var(--color-error)', fontSize: 'var(--font-size-sm)' }}>{error}</p>}
        <Button type="submit" fullWidth disabled={loading}>
          {loading ? 'Creating account...' : 'Sign Up'}
        </Button>
      </form>

      <div className={styles.divider}>
        <span className={styles.dividerLine} />
        <span>or continue with</span>
        <span className={styles.dividerLine} />
      </div>

      <div className={styles.socialButtons}>
        <button className={styles.socialBtn} type="button">
          <span className={styles.socialIcon}>G</span>
          Google
        </button>
        {isNative() && (
          <button className={styles.socialBtn} type="button">
            <span className={styles.socialIcon}></span>
            Apple
          </button>
        )}
        <button className={styles.socialBtn} type="button">
          <span className={styles.socialIcon}>📱</span>
          Phone Number
        </button>
      </div>

      <div className={styles.footer}>
        Already have an account?{' '}
        <button onClick={() => navigate('/login')}>Log In</button>
      </div>
    </div>
  );
}
