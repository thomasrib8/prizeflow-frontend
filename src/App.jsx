import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Campaigns from './pages/Campaigns';
import NewCampaign from './pages/NewCampaign';
import CampaignDetail from './pages/CampaignDetail';
import LaunchCampaign from './pages/LaunchCampaign';
import Guest from './pages/Guest';
import Calibration from './pages/Calibration';
import History from './pages/History';

function PrivateRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          {/* Public guest flow — scanned via QR code, no login, outside the authenticated shell */}
          <Route path="/play/:token" element={<Guest />} />
          <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/campaigns" element={<PrivateRoute><Campaigns /></PrivateRoute>} />
          <Route path="/campaigns/new" element={<PrivateRoute><NewCampaign /></PrivateRoute>} />
          <Route path="/campaigns/:id" element={<PrivateRoute><CampaignDetail /></PrivateRoute>} />
          <Route path="/launch" element={<PrivateRoute><LaunchCampaign /></PrivateRoute>} />
          <Route path="/calibration" element={<PrivateRoute><Calibration /></PrivateRoute>} />
          <Route path="/history" element={<PrivateRoute><History /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
