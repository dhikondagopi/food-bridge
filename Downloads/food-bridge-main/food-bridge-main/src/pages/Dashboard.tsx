import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import RestaurantDashboard from '@/components/dashboards/RestaurantDashboard';
import NgoDashboard from '@/components/dashboards/NgoDashboard';
import VolunteerDashboard from '@/components/dashboards/VolunteerDashboard';
import AdminDashboard from '@/components/dashboards/AdminDashboard';
import DashboardLayout from '@/components/layout/DashboardLayout';

const Dashboard = () => {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!profile) return <Navigate to="/login" />;

  const dashboardMap = {
    restaurant: <RestaurantDashboard />,
    ngo: <NgoDashboard />,
    volunteer: <VolunteerDashboard />,
    admin: <AdminDashboard />,
  };

  return (
    <DashboardLayout>
      {dashboardMap[profile.role] || <RestaurantDashboard />}
    </DashboardLayout>
  );
};

export default Dashboard;
