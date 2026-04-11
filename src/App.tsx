import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import WelcomePage from './pages/WelcomePage';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import FeedPage from './pages/FeedPage';
import SearchPage from './pages/SearchPage';
import OrgProfilePage from './pages/OrgProfilePage';
import MyOrgPage from './pages/MyOrgPage';
import PartnershipPage from './pages/PartnershipPage';
import CreatePostPage from './pages/CreatePostPage';
import InboxPage from './pages/InboxPage';
import ConversationPage from './pages/ConversationPage';
import AdminPage from './pages/AdminPage';
import AppLayout from './components/layout/AppLayout';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/welcome" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/feed" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/welcome" element={<PublicRoute><WelcomePage /></PublicRoute>} />
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><SignUpPage /></PublicRoute>} />

      {/* Protected routes with bottom tab navigation */}
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/feed" element={<FeedPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/inbox" element={<InboxPage />} />
        <Route path="/partnerships" element={<PartnershipPage />} />
        <Route path="/my-org" element={<MyOrgPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Route>

      {/* Protected standalone routes */}
      <Route path="/org/:id" element={<ProtectedRoute><OrgProfilePage /></ProtectedRoute>} />
      <Route path="/messages/:orgId" element={<ProtectedRoute><ConversationPage /></ProtectedRoute>} />
      <Route path="/create-post" element={<ProtectedRoute><CreatePostPage /></ProtectedRoute>} />

      {/* Default redirect */}
      <Route path="*" element={<Navigate to="/welcome" replace />} />
    </Routes>
  );
}
