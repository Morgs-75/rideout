import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';

// Admin utilities (available in browser console as window.adminCleanup)
import './utils/adminCleanup';

// Auto-update checker
const APP_VERSION = '1.3.0';

const checkForUpdates = async () => {
  try {
    const response = await fetch('/version.json?t=' + Date.now());
    const data = await response.json();
    const storedVersion = localStorage.getItem('app_version');

    if (storedVersion && storedVersion !== data.version) {
      // New version available - force reload
      localStorage.setItem('app_version', data.version);
      window.location.reload(true);
    } else if (!storedVersion) {
      localStorage.setItem('app_version', data.version);
    }
  } catch (error) {
    console.log('Version check failed:', error);
  }
};
import Layout from './components/Layout';
import BiometricLock from './components/BiometricLock';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import Onboarding from './pages/Onboarding';
import Feed from './pages/Feed';
import Explore from './pages/Explore';
import CreatePost from './pages/CreatePost';
import PostDetail from './pages/PostDetail';
import Profile from './pages/Profile';
import EditProfile from './pages/EditProfile';
import Messages from './pages/Messages';
import Chat from './pages/Chat';
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';
import Splash from './pages/Splash';
import RiderMap from './pages/RiderMap';
import RideAnnouncements from './pages/RideAnnouncements';
import Leaderboard from './pages/Leaderboard';
import EditPost from './pages/EditPost';
import RateMyRide from './pages/RateMyRide';
import BlockedUsers from './pages/BlockedUsers';
import PrivacySettings from './pages/PrivacySettings';
import HelpCenter from './pages/HelpCenter';
import ReportProblem from './pages/ReportProblem';
import TrackingManagement from './pages/TrackingManagement';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-neon-blue border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <BiometricLock>{children}</BiometricLock>;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-neon-blue border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (user) {
    return <Navigate to="/feed" replace />;
  }
  
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Splash />} />
      <Route path="/login" element={
        <PublicRoute>
          <Login />
        </PublicRoute>
      } />
      <Route path="/signup" element={
        <PublicRoute>
          <SignUp />
        </PublicRoute>
      } />
      <Route path="/onboarding" element={<Onboarding />} />
      
      {/* Full-screen map without Layout */}
      <Route path="/map" element={
        <ProtectedRoute>
          <RiderMap />
        </ProtectedRoute>
      } />

      {/* RideOut Announcements */}
      <Route path="/rides" element={
        <ProtectedRoute>
          <RideAnnouncements />
        </ProtectedRoute>
      } />

      <Route element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route path="/feed" element={<Feed />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/create" element={<CreatePost />} />
        <Route path="/post/:postId" element={<PostDetail />} />
        <Route path="/edit-post/:postId" element={<EditPost />} />
        <Route path="/profile/:userId" element={<Profile />} />
        <Route path="/edit-profile" element={<EditProfile />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/chat/:chatId" element={<Chat />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/rate-my-ride" element={<RateMyRide />} />
        <Route path="/blocked-users" element={<BlockedUsers />} />
        <Route path="/privacy-settings" element={<PrivacySettings />} />
        <Route path="/help-center" element={<HelpCenter />} />
        <Route path="/report-problem" element={<ReportProblem />} />
        <Route path="/tracking" element={<TrackingManagement />} />
      </Route>
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  useEffect(() => {
    // Check for updates on app load
    checkForUpdates();
    // Check every 30 seconds
    const interval = setInterval(checkForUpdates, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
