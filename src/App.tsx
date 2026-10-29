import { BarChart3, Gauge, Home, Info, Lightbulb, Link2, MessageCircle, Settings, Share2, SlidersHorizontal, User, Users } from 'lucide-react';
import { lazy, Suspense, useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { dataSource } from './api';
import { ServiceError } from './api/errors';
import { AuthProvider } from './hooks/useAuth';
import { RequireRole } from './components/layout/Guards';
import { PortalLayout, type NavItem } from './components/layout/PortalLayout';
import { PublicLayout } from './components/layout/PublicLayout';
import { DemoBanner, ResetDemoDataButton } from './components/layout/Chrome';
import { Loading, Notice } from './components/ui/Feedback';
import { buttonClass } from './components/ui/Button';
import Landing from './pages/public/Landing';
import Register from './pages/public/Register';
import Login from './pages/public/Login';
import ForgotPassword from './pages/public/ForgotPassword';
import NotFound from './pages/public/NotFound';
import StudentDashboard from './pages/student/Dashboard';
import CampaignDetails from './pages/student/CampaignDetails';
import Referrals from './pages/student/Referrals';
import Community from './pages/student/Community';
import Suggestions from './pages/student/Suggestions';
import StudentProfile from './pages/student/Profile';
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminRegistrations = lazy(() => import('./pages/admin/Registrations'));
const AdminReferrals = lazy(() => import('./pages/admin/Referrals'));
const AdminAnalytics = lazy(() => import('./pages/admin/Analytics'));
const AdminSuggestions = lazy(() => import('./pages/admin/Suggestions'));
const AdminCampaigns = lazy(() => import('./pages/admin/Campaigns'));
const AdminProfile = lazy(() => import('./pages/admin/Profile'));
const AdminSettings = lazy(() => import('./pages/admin/Settings'));

const STUDENT_NAV: NavItem[] = [
  { to: '/student/dashboard', label: 'Dashboard', icon: Home },
  { to: '/student/campaign', label: 'Campaign Details', icon: Info },
  { to: '/student/referrals', label: 'Referral', icon: Share2 },
  { to: '/student/community', label: 'Community', icon: MessageCircle },
  { to: '/student/suggestions', label: 'Suggestions', icon: Lightbulb },
  { to: '/student/profile', label: 'Profile', icon: User },
];

const ADMIN_NAV: NavItem[] = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: Gauge },
  { to: '/admin/registrations', label: 'Registrations', icon: Users },
  { to: '/admin/referrals', label: 'Referrals', icon: Link2 },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/admin/suggestions', label: 'Suggestions', icon: Lightbulb },
  { to: '/admin/campaigns', label: 'Campaign Settings', icon: SlidersHorizontal },
  { to: '/admin/profile', label: 'Profile', icon: User },
  { to: '/admin/settings', label: 'Demo Settings', icon: Settings },
];

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<Landing />} />
        <Route path="register" element={<Register />} />
        <Route path="login" element={<Login portal="student" />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="admin/login" element={<Login portal="admin" />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route
        path="student"
        element={
          <RequireRole role="student">
            <PortalLayout nav={STUDENT_NAV} portal="Student" home="/student/dashboard" loginPath="/login" />
          </RequireRole>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<StudentDashboard />} />
        <Route path="campaign" element={<CampaignDetails />} />
        <Route path="referrals" element={<Referrals />} />
        <Route path="community" element={<Community />} />
        <Route path="suggestions" element={<Suggestions />} />
        <Route path="profile" element={<StudentProfile />} />
      </Route>
      <Route
        path="admin"
        element={
          <RequireRole role="admin">
            <Suspense fallback={<Loading label="Loading admin portal…" />}>
              <PortalLayout nav={ADMIN_NAV} portal="Admin" home="/admin/dashboard" loginPath="/admin/login" />
            </Suspense>
          </RequireRole>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="registrations" element={<AdminRegistrations />} />
        <Route path="referrals" element={<AdminReferrals />} />
        <Route path="analytics" element={<AdminAnalytics />} />
        <Route path="suggestions" element={<AdminSuggestions />} />
        <Route path="campaigns" element={<AdminCampaigns />} />
        <Route path="profile" element={<AdminProfile />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  const [status, setStatus] = useState<'loading' | 'ready' | { error: string }>('loading');

  useEffect(() => {
    dataSource
      .init()
      .then(() => setStatus('ready'))
      .catch((err) => setStatus({ error: err instanceof ServiceError ? err.message : String(err) }));
    return dataSource.subscribe(() => setStatus((s) => (typeof s === 'object' ? 'ready' : s)));
  }, []);

  if (status === 'loading') return <Loading label="Preparing demo data…" />;
  if (typeof status === 'object') {
    return (
      <div>
        <DemoBanner />
        <main id="main" className="mx-auto max-w-md space-y-4 px-4 py-16">
          <h1 className="text-xl font-bold">Demo data can't be read</h1>
          <Notice tone="error">{status.error}</Notice>
          <ResetDemoDataButton className={buttonClass('danger')} />
        </main>
      </div>
    );
  }
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
