import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabaseClient';
import DashboardLayout from '@/components/motion/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Navigate } from 'react-router-dom';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Utensils, Users, Truck, Leaf, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

const COLORS = ['hsl(200, 98%, 39%)', 'hsl(152, 55%, 32%)', 'hsl(36, 90%, 55%)', 'hsl(0, 72%, 50%)'];

// Constants for impact calculation
const CO2_PER_MEAL_KG = 2.5; // avg kg CO₂ saved per meal rescued
const AVG_PICKUP_HOURS = 0.75; // avg volunteer hours per delivery

const Analytics = () => {
  const { profile, loading } = useAuth();
  const [donations, setDonations] = useState<any[]>([]);
  const [pickups, setPickups] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);

  useEffect(() => {
    const fetchAll = async () => {
      const [donRes, pickRes, profRes] = await Promise.all([
        supabase.from('food_donations').select('*').order('created_at', { ascending: true }),
        supabase.from('pickup_requests').select('*'),
        supabase.from('profiles').select('id, role, full_name, created_at'),
      ]);
      setDonations(donRes.data || []);
      setPickups(pickRes.data || []);
      setProfiles(profRes.data || []);
    };
    fetchAll();
  }, []);

  if (loading) return <DashboardLayout><div className="py-20 text-center text-muted-foreground">Loading...</div></DashboardLayout>;
  if (!profile) return <Navigate to="/login" />;

  // Core stats
  const totalMeals = donations.reduce((s, d) => s + (d.quantity || 0), 0);
  const deliveredDonations = donations.filter(d => d.status === 'delivered');
  const deliveredMeals = deliveredDonations.reduce((s, d) => s + (d.quantity || 0), 0);
  const totalRestaurants = profiles.filter(p => p.role === 'restaurant').length;
  const totalVolunteers = profiles.filter(p => p.role === 'volunteer').length;

  // Impact metrics
  const co2Saved = (deliveredMeals * CO2_PER_MEAL_KG).toFixed(1);
  const completedDeliveries = pickups.filter(p => p.status === 'delivered').length;
  const volunteerHours = (completedDeliveries * AVG_PICKUP_HOURS).toFixed(1);

  // Donations over time (by day)
  const donationsByDay: Record<string, number> = {};
  donations.forEach(d => {
    const day = new Date(d.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    donationsByDay[day] = (donationsByDay[day] || 0) + 1;
  });
  const timelineData = Object.entries(donationsByDay).map(([date, count]) => ({ date, donations: count }));

  // Category breakdown
  const categoryCount: Record<string, number> = {};
  donations.forEach(d => { categoryCount[d.food_category] = (categoryCount[d.food_category] || 0) + 1; });
  const categoryData = Object.entries(categoryCount).map(([name, value]) => ({ name: name === 'veg' ? 'Vegetarian' : 'Non-Vegetarian', value }));

  // Status breakdown
  const statusCount: Record<string, number> = {};
  donations.forEach(d => { statusCount[d.status] = (statusCount[d.status] || 0) + 1; });
  const statusData = Object.entries(statusCount).map(([name, value]) => ({ name: name.replace('_', ' '), value }));

  // Top contributors
  const restaurantDonations: Record<string, number> = {};
  donations.forEach(d => { restaurantDonations[d.restaurant_id] = (restaurantDonations[d.restaurant_id] || 0) + 1; });
  const topContributors = Object.entries(restaurantDonations)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => ({
      name: profiles.find(p => p.id === id)?.full_name || 'Unknown',
      donations: count,
    }));

  // Meals delivered over time
  const deliveredByDay: Record<string, number> = {};
  deliveredDonations.forEach(d => {
    const day = new Date(d.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    deliveredByDay[day] = (deliveredByDay[day] || 0) + (d.quantity || 0);
  });
  const mealsTimelineData = Object.entries(deliveredByDay).map(([date, meals]) => ({ date, meals }));

  const statCards = [
    { label: 'Total Meals Listed', value: totalMeals, icon: Utensils, color: 'text-primary' },
    { label: 'Meals Delivered', value: deliveredMeals, icon: Truck, color: 'text-success' },
    { label: 'CO₂ Saved (kg)', value: co2Saved, icon: Leaf, color: 'text-success' },
    { label: 'Volunteer Hours', value: volunteerHours, icon: Clock, color: 'text-warning' },
    { label: 'Restaurants', value: totalRestaurants, icon: Users, color: 'text-primary' },
    { label: 'Volunteers', value: totalVolunteers, icon: TrendingUp, color: 'text-destructive' },
  ];

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-foreground">Impact Analytics</h1>
        <p className="text-muted-foreground mt-1">Track your environmental and social impact</p>
      </div>

      {/* Impact Banner */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="mb-8 bg-gradient-to-r from-primary/10 via-success/10 to-warning/10 border-primary/20 shadow-card">
          <CardContent className="p-6">
            <h2 className="font-heading text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Leaf className="h-5 w-5 text-success" /> Environmental Impact Summary
            </h2>
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <div className="font-heading text-3xl font-bold text-success">{deliveredMeals}</div>
                <div className="text-sm text-muted-foreground">Meals Rescued</div>
              </div>
              <div>
                <div className="font-heading text-3xl font-bold text-success">{co2Saved} kg</div>
                <div className="text-sm text-muted-foreground">CO₂ Emissions Prevented</div>
              </div>
              <div>
                <div className="font-heading text-3xl font-bold text-warning">{volunteerHours} hrs</div>
                <div className="text-sm text-muted-foreground">Volunteer Hours Contributed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {statCards.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="shadow-card">
              <CardContent className="p-4 text-center">
                <c.icon className={`h-6 w-6 ${c.color} mx-auto mb-2`} />
                <div className="font-heading text-xl font-bold text-foreground">{c.value}</div>
                <div className="text-xs text-muted-foreground">{c.label}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Donations Over Time */}
        <Card className="shadow-card">
          <CardHeader><CardTitle className="font-heading text-base">Donations Over Time</CardTitle></CardHeader>
          <CardContent>
            {timelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                  <Line type="monotone" dataKey="donations" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))' }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
            )}
          </CardContent>
        </Card>

        {/* Meals Delivered Over Time */}
        <Card className="shadow-card">
          <CardHeader><CardTitle className="font-heading text-base">Meals Rescued Over Time</CardTitle></CardHeader>
          <CardContent>
            {mealsTimelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={mealsTimelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                  <Line type="monotone" dataKey="meals" stroke="hsl(152, 55%, 32%)" strokeWidth={2} dot={{ fill: 'hsl(152, 55%, 32%)' }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
            )}
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card className="shadow-card">
          <CardHeader><CardTitle className="font-heading text-base">Food Categories</CardTitle></CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
            )}
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card className="shadow-card">
          <CardHeader><CardTitle className="font-heading text-base">Donation Status</CardTitle></CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={statusData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
            )}
          </CardContent>
        </Card>

        {/* Top Contributors */}
        <Card className="shadow-card md:col-span-2">
          <CardHeader><CardTitle className="font-heading text-base">Top Contributors</CardTitle></CardHeader>
          <CardContent>
            {topContributors.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={topContributors} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="donations" fill="hsl(152, 55%, 32%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Analytics;
