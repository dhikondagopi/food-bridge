import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Utensils, Users, Heart, TrendingUp } from 'lucide-react';
import { StaggerContainer, StaggerItem, FadeInSection } from '@/components/motion/StaggerContainer';

const AdminDashboard = () => {
  const [stats, setStats] = useState({ donations: 0, restaurants: 0, ngos: 0, volunteers: 0, delivered: 0, meals: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const [donationsRes, restaurantsRes, ngosRes, volunteersRes, deliveredRes] = await Promise.all([
        supabase.from('food_donations').select('id, quantity', { count: 'exact' }),
        supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'restaurant'),
        supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'ngo'),
        supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'volunteer'),
        supabase.from('food_donations').select('id, quantity', { count: 'exact' }).eq('status', 'delivered'),
      ]);
      const totalMeals = (donationsRes.data || []).reduce((sum, d) => sum + (d.quantity || 0), 0);
      setStats({
        donations: donationsRes.count || 0,
        restaurants: restaurantsRes.count || 0,
        ngos: ngosRes.count || 0,
        volunteers: volunteersRes.count || 0,
        delivered: deliveredRes.count || 0,
        meals: totalMeals,
      });
    };
    fetchStats();
  }, []);

  const cards = [
    { label: 'Total Donations', value: stats.donations, icon: Utensils, color: 'text-primary' },
    { label: 'Meals Saved', value: stats.meals, icon: TrendingUp, color: 'text-primary' },
    { label: 'Restaurants', value: stats.restaurants, icon: Utensils, color: 'text-secondary' },
    { label: 'NGOs', value: stats.ngos, icon: Users, color: 'text-primary' },
    { label: 'Volunteers', value: stats.volunteers, icon: Heart, color: 'text-destructive' },
    { label: 'Delivered', value: stats.delivered, icon: TrendingUp, color: 'text-primary' },
  ];

  return (
    <div>
      <FadeInSection className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">System overview and analytics</p>
      </FadeInSection>
      <StaggerContainer className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {cards.map(c => (
          <StaggerItem key={c.label}>
            <Card className="shadow-card">
              <CardContent className="p-6 text-center">
                <c.icon className={`h-8 w-8 ${c.color} mx-auto mb-3`} />
                <div className="font-heading text-3xl font-bold text-foreground">{c.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{c.label}</div>
              </CardContent>
            </Card>
          </StaggerItem>
        ))}
      </StaggerContainer>
    </div>
  );
};

export default AdminDashboard;
