import { useAuth } from '@/hooks/useAuth';
import { Navigate, useLocation } from 'react-router-dom';
import RestaurantDashboard from '@/components/dashboards/RestaurantDashboard';
import NgoDashboard from '@/components/dashboards/NgoDashboard';
import VolunteerDashboard from '@/components/dashboards/VolunteerDashboard';
import AdminPage from '@/pages/Admin';
import AdminFoodListings from '@/pages/AdminFoodListings';
import AdminVolunteers from '@/pages/AdminVolunteers';
import Analytics from '@/pages/Analytics';
import Profile from '@/pages/Profile';
import Chat from '@/pages/Chat';
import CallHistory from '@/pages/CallHistory';
import MapPage from '@/pages/MapPage';
import Leaderboard from '@/pages/Leaderboard';
import DashboardLayout from '@/components/motion/layout/DashboardLayout';

const Dashboard = () => {
  const { profile, loading } = useAuth();
  const location = useLocation();
  const path = location.pathname;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) return <Navigate to="/login" />;

  // ── Admin routes ──
  if (path.startsWith('/admin')) {
    if (profile.role !== 'admin') return <Navigate to="/dashboard" />;
    const adminContent = () => {
      if (path.startsWith('/admin/food-listings')) return <AdminFoodListings />;
      if (path.startsWith('/admin/volunteers'))    return <AdminVolunteers />;
      if (path.startsWith('/admin/analytics'))     return <Analytics />;
      return <AdminPage />;
    };
    return <DashboardLayout key="admin">{adminContent()}</DashboardLayout>;
  }

  // ── General protected pages (need sidebar layout) ──
  if (path === '/profile')      return <DashboardLayout key="profile"><Profile /></DashboardLayout>;
  if (path === '/analytics')    return <DashboardLayout key="analytics"><Analytics /></DashboardLayout>;
  if (path === '/chat')         return <DashboardLayout key="chat"><Chat /></DashboardLayout>;
  if (path === '/call-history') return <DashboardLayout key="calls"><CallHistory /></DashboardLayout>;
  if (path === '/map')          return <DashboardLayout key="map"><MapPage /></DashboardLayout>;
  if (path === '/leaderboard')  return <DashboardLayout key="leaderboard"><Leaderboard /></DashboardLayout>;

  // ── Role-based dashboards ──
  const dashboardMap: Record<string, JSX.Element> = {
    restaurant: <RestaurantDashboard />,
    ngo:        <NgoDashboard />,
    volunteer:  <VolunteerDashboard />,
    admin:      <AdminPage />,
  };

  return (
    <DashboardLayout key={profile.role}>
      {dashboardMap[profile.role] || <VolunteerDashboard />}
    </DashboardLayout>
  );
};

export default Dashboard;