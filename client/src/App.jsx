import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

import LoginPage          from './pages/LoginPage.jsx';
import SignupPage         from './pages/SignupPage.jsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';
import ResetPasswordPage  from './pages/ResetPasswordPage.jsx';
import VerifyEmailPage    from './pages/VerifyEmailPage.jsx';
import LandingPage        from './pages/LandingPage.jsx';
import HomePage           from './pages/HomePage.jsx';
import SessionEditPage    from './pages/SessionEditPage.jsx';
import PostQuizPage       from './pages/PostQuizPage.jsx';
import SessionJoinPage    from './pages/SessionJoinPage.jsx';
import QuizDashboardPage  from './pages/QuizDashboardPage.jsx';
import StudentPerformancePage from './pages/StudentPerformancePage.jsx';
import PollSessionPage    from './pages/PollSessionPage.jsx';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login"  element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

          {/* Public routes — no login needed */}
          <Route path="/sessions/:id/join"      element={<SessionJoinPage />} />
          <Route path="/sessions/:id/post-quiz" element={<PostQuizPage />} />

          {/* Host-only protected routes */}
          <Route path="/home" element={
            <ProtectedRoute><HomePage /></ProtectedRoute>
          } />
          <Route path="/sessions/:id/edit" element={
            <ProtectedRoute><SessionEditPage /></ProtectedRoute>
          } />
          <Route path="/sessions/:id/quiz-dashboard" element={
            <ProtectedRoute><QuizDashboardPage /></ProtectedRoute>
          } />
          <Route path="/sessions/:id/poll-manage" element={
            <ProtectedRoute><PollSessionPage /></ProtectedRoute>
          } />
          <Route path="/students/:userId/performance" element={
            <ProtectedRoute><StudentPerformancePage /></ProtectedRoute>
          } />
          <Route path="/performance/me" element={
            <ProtectedRoute><StudentPerformancePage /></ProtectedRoute>
          } />

          {/* Landing page — public entry point */}
          <Route path="/" element={<LandingPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
