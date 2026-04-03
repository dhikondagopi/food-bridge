import { useAuth } from '@/hooks/useAuth';
import { Navigate, useLocation } from 'react-router-dom';
import RestaurantDashboard from '@/components/dashboards/RestaurantDashboard';
import NgoDashboard from '@/components/dashboards/NgoDashboard';
import VolunteerDashboard from '@/components/dashboards/VolunteerDashboard';
import AdminPage from '@/pages/Admin';
import DashboardLayout from '@/components/motion/layout/DashboardLayout';

const Dashboard = () => {
  const { profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) return <Navigate to="/login" />;

  // ✅ Admin routes always show AdminPage inside DashboardLayout
  const isAdminRoute = location.pathname.startsWith('/admin');
  if (isAdminRoute || profile.role === 'admin') {
    return (
      <DashboardLayout key="admin">
        <AdminPage />
      </DashboardLayout>
    );
  }

  const dashboardMap: Record<string, JSX.Element> = {
    restaurant: <RestaurantDashboard />,
    ngo: <NgoDashboard />,
    volunteer: <VolunteerDashboard />,
  };

  return (
    <DashboardLayout key={profile.role}>
      {dashboardMap[profile.role] || <RestaurantDashboard />}
    </DashboardLayout>
  );
};

export default Dashboard;