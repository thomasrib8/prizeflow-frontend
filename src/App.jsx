import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useAdmin } from './hooks/useAdmin';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Campaigns from './pages/Campaigns';
import NewCampaign from './pages/NewCampaign';
import CampaignDetail from './pages/CampaignDetail';
import LaunchCampaign from './pages/LaunchCampaign';
import Guest from './pages/Guest';
import RedeemPage from './pages/RedeemPage';
import Rewards from './pages/Rewards';
import Calibration from './pages/Calibration';
import History from './pages/History';
import Settings from './pages/Settings';
import Users from './pages/Users';
import UserDetail from './pages/UserDetail';
import AppHealth from './pages/AppHealth';
import Magic from './pages/Magic';
import SequenceBuilder from './pages/SequenceBuilder';

function PrivateRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function AdminRoute({ children }) {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          {/* Public guest flow — scanned via QR code, no login, outside the authenticated shell */}
          <Route path="/play/:token" element={<Guest />} />
          {/* Reward redemption — scanned via the QR code in the reward email. Not
              wrapped in PrivateRoute: it's its own full-screen page (not the
              app shell) that redirects to /login itself if not signed in. */}
          <Route path="/redeem/:code" element={<RedeemPage />} />
          <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/campaigns" element={<PrivateRoute><Campaigns /></PrivateRoute>} />
          <Route path="/campaigns/new" element={<PrivateRoute><NewCampaign /></PrivateRoute>} />
          <Route path="/campaigns/:id" element={<PrivateRoute><CampaignDetail /></PrivateRoute>} />
          <Route path="/launch" element={<PrivateRoute><LaunchCampaign /></PrivateRoute>} />
          <Route path="/calibration" element={<PrivateRoute><Calibration /></PrivateRoute>} />
          <Route path="/history" element={<PrivateRoute><History /></PrivateRoute>} />
          <Route path="/rewards" element={<PrivateRoute><Rewards /></PrivateRoute>} />
          <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
          <Route path="/users" element={<AdminRoute><Users /></AdminRoute>} />
          <Route path="/users/:id" element={<AdminRoute><UserDetail /></AdminRoute>} />
          <Route path="/health" element={<AdminRoute><AppHealth /></AdminRoute>} />
          <Route path="/magic" element={<AdminRoute><Magic /></AdminRoute>} />
          <Route path="/sequence" element={<AdminRoute><SequenceBuilder /></AdminRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
