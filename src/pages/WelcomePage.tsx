import { useNavigate } from 'react-router-dom';
import styles from './WelcomePage.module.css';

export default function WelcomePage() {
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <h1 className={styles.logo}>Catalyze</h1>
      <p className={styles.slogan}>Connect, Collaborate, and Grow</p>
      <p className={styles.description}>
        Helping non-profit organizations form partnerships, share experiences,
        and reach their goals together.
      </p>
      <div className={styles.actions}>
        <button className={styles.getStartedBtn} onClick={() => navigate('/signup')}>
          Get Started
        </button>
        <button className={styles.loginLink} onClick={() => navigate('/login')}>
          Already have an account? Log in
        </button>
      </div>
    </div>
  );
}
