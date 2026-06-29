import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import '../landing.css';

const FEATURES = [
  {
    id: 'quiz',
    icon: '🧠',
    iconClass: 'land-card-icon--indigo',
    cardClass: 'land-card--quiz',
    badge: { label: 'AI-Powered', cls: 'land-card-badge--ai' },
    name: 'Post-Class Quiz',
    desc: 'Generate smart quizzes with AI or create them manually. Players answer in real-time after every session.',
    path: '/home',
    publicPath: '/login',
    arrow: 'Open Quiz →',
  },
  {
    id: 'sessions',
    icon: '🎙️',
    iconClass: 'land-card-icon--purple',
    cardClass: '',
    badge: null,
    name: 'Session Management',
    desc: 'Create and manage your teaching sessions. Share a join code so anyone can connect instantly.',
    path: '/home',
    publicPath: '/login',
    arrow: 'Manage Sessions →',
  },
  {
    id: 'dashboard',
    icon: '📊',
    iconClass: 'land-card-icon--emerald',
    cardClass: '',
    badge: { label: 'Live', cls: 'land-card-badge--live' },
    name: 'Live Dashboard',
    desc: 'Watch real-time leaderboards and per-question accuracy charts update as players submit answers.',
    path: '/home',
    publicPath: '/login',
    arrow: 'View Dashboard →',
  },
  {
    id: 'join',
    icon: '🔗',
    iconClass: 'land-card-icon--sky',
    cardClass: '',
    badge: { label: 'No login', cls: 'land-card-badge--new' },
    name: 'Join a Session',
    desc: 'Jump straight in with a join code — no account needed. Just enter the code your host shared.',
    path: null,
    publicPath: null,
    isJoin: true,
    arrow: 'Enter code above →',
  },
  {
    id: 'generate',
    icon: '✨',
    iconClass: 'land-card-icon--amber',
    cardClass: '',
    badge: { label: 'AI', cls: 'land-card-badge--ai' },
    name: 'AI Question Generator',
    desc: 'Powered by Gemini or Groq — generate a full question set from a topic in seconds.',
    path: '/home',
    publicPath: '/login',
    arrow: 'Try Generator →',
  },
  {
    id: 'analytics',
    icon: '🏆',
    iconClass: 'land-card-icon--rose',
    cardClass: '',
    badge: null,
    name: 'Leaderboard & Scores',
    desc: 'Players see instant feedback and a final score. Hosts get a breakdown of every question\'s accuracy.',
    path: '/home',
    publicPath: '/login',
    arrow: 'See Analytics →',
  },
];

export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  function handleCard(feature) {
    if (feature.isJoin) return;
    navigate(user ? feature.path : feature.publicPath);
  }

  return (
    <div className="land-shell">
      {/* Navbar */}
      <nav className="land-nav">
        <Link to="/" className="land-nav-logo">
          <div className="land-nav-icon">🎓</div>
          <span className="land-nav-name">ExecutiveHub</span>
        </Link>
        <div className="land-nav-actions">
          {user ? (
            <Link to="/home" className="land-btn-primary">Go to Dashboard</Link>
          ) : (
            <>
              <Link to="/login"  className="land-btn-ghost">Sign in</Link>
              <Link to="/signup" className="land-btn-primary">Get started</Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="land-hero">
        <div className="land-hero-badge">🚀 Built for educators &amp; trainers</div>
        <h1 className="land-hero-title">
          Run smarter sessions with <span>AI-powered quizzes</span>
        </h1>
        <p className="land-hero-sub">
          ExecutiveHub lets you create sessions, generate quizzes instantly with AI,
          and track player performance in real-time — all in one place.
        </p>

        <div className="land-hero-cta">
          <Link to={user ? '/home' : '/signup'} className="land-cta-primary">
            {user ? 'Open Dashboard' : 'Start for free'} &nbsp;→
          </Link>
          {!user && (
            <Link to="/login" className="land-cta-secondary">
              Sign in as host
            </Link>
          )}
        </div>
      </section>

      {/* Feature cards */}
      <section className="land-features">
        <p className="land-section-label">Everything you need</p>
        <h2 className="land-section-title">Pick a feature to get started</h2>
        <p className="land-section-sub">
          Click any card below to jump straight into that part of the platform.
        </p>

        <div className="land-grid">
          {FEATURES.map(f => (
            <div
              key={f.id}
              className={`land-card ${f.cardClass}`}
              onClick={() => handleCard(f)}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && handleCard(f)}
            >
              <div className="land-card-top">
                <div className={`land-card-icon ${f.iconClass}`}>{f.icon}</div>
                {f.badge && (
                  <span className={`land-card-badge ${f.badge.cls}`}>{f.badge.label}</span>
                )}
              </div>
              <div className="land-card-name">{f.name}</div>
              <div className="land-card-desc">{f.desc}</div>
              <div className="land-card-arrow">{f.arrow}</div>
            </div>
          ))}
        </div>
      </section>

      <footer className="land-footer">
        © {new Date().getFullYear()} ExecutiveHub · Built for modern educators
      </footer>
    </div>
  );
}
