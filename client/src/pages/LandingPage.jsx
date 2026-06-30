import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import '../landing.css';

const FEATURES = [
  {
    id: 'quiz',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/></svg>,
    iconClass: 'land-card-icon--pink',
    cardClass: '',
    badge: { label: 'AI-Powered', cls: 'land-card-badge--pink' },
    name: 'Post-Class Quiz',
    desc: 'Generate smart quizzes with AI or create them manually. Players answer in real-time after every session.',
    path: '/home',
    publicPath: '/login',
    arrow: 'Open Quiz →',
  },
  {
    id: 'sessions',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>,
    iconClass: 'land-card-icon--cyan',
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
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>,
    iconClass: 'land-card-icon--green',
    cardClass: '',
    badge: { label: 'Live', cls: 'land-card-badge--green' },
    name: 'Live Dashboard',
    desc: 'Watch real-time leaderboards and per-question accuracy charts update as players submit answers.',
    path: '/home',
    publicPath: '/login',
    arrow: 'View Dashboard →',
  },
  {
    id: 'join',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
    iconClass: 'land-card-icon--blue',
    cardClass: '',
    badge: { label: 'No login', cls: 'land-card-badge--white' },
    name: 'Join a Session',
    desc: 'Jump straight in with a join code — no account needed. Just enter the code your host shared.',
    path: null,
    publicPath: null,
    isJoin: true,
    arrow: 'Enter Code →',
  },
  {
    id: 'generate',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 12 2 2 4-4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/><path d="M5 12V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v5"/></svg>,
    iconClass: 'land-card-icon--orange',
    cardClass: '',
    badge: { label: 'AI', cls: 'land-card-badge--orange' },
    name: 'AI Question Generator',
    desc: 'Powered by Gemini or Groq — generate a full quiz from your notes or a topic in seconds.',
    path: '/home',
    publicPath: '/login',
    arrow: 'Start Generating →',
  },
  {
    id: 'analytics',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>,
    iconClass: 'land-card-icon--gold',
    cardClass: '',
    badge: null,
    name: 'Leaderboard & Scores',
    desc: 'Players see instant feedback and a final position. Export data for your LMS.',
    path: '/home',
    publicPath: '/login',
    arrow: 'View rankings →',
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
          <div className="land-nav-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg></div>
          <span className="land-nav-name">ExecutiveHub</span>
        </Link>
        <div className="land-nav-actions">
          {user ? (
            <Link to="/home" className="land-btn-primary">Dashboard</Link>
          ) : (
            <>
              <Link to="/login"  className="land-btn-ghost">Sign in</Link>
              <Link to="/signup" className="land-btn-primary">Start free</Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="land-hero">
        <div className="land-hero-badge">🚀 NEW: AI SESSION ZERO</div>
        <h1 className="land-hero-title">
          Run smarter sessions
with <span>AI-powered quizzes</span>
        </h1>
        <p className="land-hero-sub">
          ExecutiveHub lets you create sessions, generate quizzes instantly with AI,
          and track player performance in real-time — all in one place.
        </p>

        <div className="land-hero-cta">
          <Link to={user ? '/home' : '/signup'} className="land-cta-primary">
            {user ? 'Dashboard' : 'Start for free'} →
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

      
      <section className="land-active-widget">
        <div className="land-active-top">
          <div className="land-active-dots"><span className="red"></span><span className="yellow"></span><span className="green"></span></div>
          <div className="land-active-header">
            <span>REAL-TIME PERFORMANCE MEASUREMENT</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          </div>
        </div>
        <div className="land-active-inner">
          <div className="land-active-tag">ACTIVE SESSION #K-9PM</div>
          <div className="land-active-score">84.2%</div>
          <div className="land-active-sub">Average Accuracy</div>
        </div>
      </section>

      <footer className="land-footer">
        <div className="land-footer-top">
          <div className="land-nav-logo footer-logo">
            <div className="land-nav-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg></div>
            <span className="land-nav-name">ExecutiveHub</span>
          </div>
          <p>© 2026 ExecutiveHub. Precision performance monitoring.</p>
        </div>
        <div className="land-footer-links">
          <Link to="#">Features</Link>
          <Link to="#">Solutions</Link>
          <Link to="#">Pricing</Link>
          <Link to="#">Privacy</Link>
          <Link to="#">Terms</Link>
        </div>
      </footer>
    </div>
  );
}
