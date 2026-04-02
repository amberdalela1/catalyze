import { useNavigate } from 'react-router-dom';
import styles from './WelcomePage.module.css';

export default function WelcomePage() {
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <span className={styles.headerText}>WELCOME</span>
      </div>

      <div className={styles.body}>
        <div className={styles.logoCircle}>
          <div className={styles.logoIcon}>
            <svg viewBox="0 0 120 100" className={styles.handshakeSvg}>
              {/* Left hand */}
              <path d="M15,55 Q20,40 35,45 L50,50" stroke="#6b8e6e" strokeWidth="3" fill="none" strokeLinecap="round"/>
              <path d="M50,50 L55,45 Q58,43 60,45" stroke="#6b8e6e" strokeWidth="3" fill="none" strokeLinecap="round"/>
              {/* Right hand */}
              <path d="M105,55 Q100,40 85,45 L70,50" stroke="#6b8e6e" strokeWidth="3" fill="none" strokeLinecap="round"/>
              <path d="M70,50 L65,45 Q62,43 60,45" stroke="#6b8e6e" strokeWidth="3" fill="none" strokeLinecap="round"/>
              {/* Handshake clasp */}
              <path d="M50,50 Q55,55 60,52 Q65,55 70,50" stroke="#6b8e6e" strokeWidth="3" fill="none" strokeLinecap="round"/>
              {/* Left arm line */}
              <path d="M5,60 L25,52 L35,45" stroke="#6b8e6e" strokeWidth="3" fill="none" strokeLinecap="round"/>
              {/* Right arm line */}
              <path d="M115,60 L95,52 L85,45" stroke="#6b8e6e" strokeWidth="3" fill="none" strokeLinecap="round"/>
              {/* Decorative accents */}
              <circle cx="56" cy="32" r="2.5" fill="#d4774a"/>
              <circle cx="64" cy="32" r="2.5" fill="#d4774a"/>
              <path d="M60,28 L58,24 M60,28 L62,24" stroke="#6b8e6e" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
            </svg>
          </div>
          <div className={styles.logoText}>
            <span className={styles.logoName}>CATALY</span>
            <span className={styles.logoAccent}>ZE</span>
          </div>
          <p className={styles.logoTagline}>CONNECT, COLLABORATE, GROW</p>
        </div>

        <div className={styles.actions}>
          <p className={styles.actionLabel}>New Here?</p>
          <button className={styles.actionBtn} onClick={() => navigate('/signup')}>
            SIGN UP
          </button>

          <p className={styles.actionLabel}>Coming Back?</p>
          <button className={styles.actionBtn} onClick={() => navigate('/login')}>
            LOG IN
          </button>
        </div>
      </div>
    </div>
  );
}
