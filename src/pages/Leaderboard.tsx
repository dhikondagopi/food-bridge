import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Medal, Award, Utensils, Truck, TrendingUp, Star } from 'lucide-react';
import { StaggerContainer, StaggerItem, FadeInSection } from '@/components/motion/StaggerContainer';
import DashboardLayout from '@/components/layout/DashboardLayout';

interface RankedUser {
  id: string;
  full_name: string;
  organization_name: string | null;
  avatar_url: string | null;
  count: number;
  avgRating?: number | null;
}

const rankIcons = [Trophy, Medal, Award];
const rankColors = [
  'text-yellow-500',
  'text-slate-400',
  'text-amber-600',
];

const Leaderboard = () => {
  const [topRestaurants, setTopRestaurants] = useState<RankedUser[]>([]);
  const [topVolunteers, setTopVolunteers] = useState<RankedUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboards = async () => {
      // Top restaurants by donation count
      const { data: donations } = await supabase
        .from('food_donations')
        .select('restaurant_id');

      const restaurantCounts: Record<string, number> = {};
      donations?.forEach(d => {
        restaurantCounts[d.restaurant_id] = (restaurantCounts[d.restaurant_id] || 0) + 1;
      });

      const restaurantIds = Object.keys(restaurantCounts);
      if (restaurantIds.length > 0) {
        const { data: restaurantProfiles } = await supabase
          .from('profiles')
          .select('id, full_name, organization_name, avatar_url')
          .in('id', restaurantIds);

        const ranked = (restaurantProfiles || [])
          .map(p => ({ ...p, count: restaurantCounts[p.id] || 0 }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);
        setTopRestaurants(ranked);
      }

      // Top volunteers by completed deliveries
      const { data: pickups } = await supabase
        .from('pickup_requests')
        .select('volunteer_id')
        .eq('status', 'delivered')
        .not('volunteer_id', 'is', null);

      const volunteerCounts: Record<string, number> = {};
      pickups?.forEach(p => {
        if (p.volunteer_id) {
          volunteerCounts[p.volunteer_id] = (volunteerCounts[p.volunteer_id] || 0) + 1;
        }
      });

      // Fetch average ratings for volunteers
      const { data: allRatings } = await supabase
        .from('volunteer_ratings')
        .select('volunteer_id, rating');

      const ratingAgg: Record<string, { sum: number; count: number }> = {};
      allRatings?.forEach(r => {
        if (!ratingAgg[r.volunteer_id]) ratingAgg[r.volunteer_id] = { sum: 0, count: 0 };
        ratingAgg[r.volunteer_id].sum += r.rating;
        ratingAgg[r.volunteer_id].count += 1;
      });

      const volunteerIds = Object.keys(volunteerCounts);
      if (volunteerIds.length > 0) {
        const { data: volunteerProfiles } = await supabase
          .from('profiles')
          .select('id, full_name, organization_name, avatar_url')
          .in('id', volunteerIds);

        const ranked = (volunteerProfiles || [])
          .map(p => ({
            ...p,
            count: volunteerCounts[p.id] || 0,
            avgRating: ratingAgg[p.id] ? ratingAgg[p.id].sum / ratingAgg[p.id].count : null,
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);
        setTopVolunteers(ranked);
      }

      setLoading(false);
    };

    fetchLeaderboards();
  }, []);

  const totalDonations = topRestaurants.reduce((sum, r) => sum + r.count, 0);
  const totalDeliveries = topVolunteers.reduce((sum, v) => sum + v.count, 0);

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <FadeInSection className="mb-8">
          <h1 className="font-heading text-3xl font-bold text-foreground flex items-center gap-3">
            <Trophy className="h-8 w-8 text-primary" />
            Leaderboard
          </h1>
          <p className="text-muted-foreground mt-1">Celebrating our top contributors in the fight against food waste</p>
        </FadeInSection>

        {/* Summary Stats */}
        <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Donations', value: totalDonations, icon: Utensils },
            { label: 'Total Deliveries', value: totalDeliveries, icon: Truck },
            { label: 'Top Restaurants', value: topRestaurants.length, icon: TrendingUp },
            { label: 'Active Volunteers', value: topVolunteers.length, icon: Award },
          ].map(s => (
            <StaggerItem key={s.label}>
              <Card className="shadow-card">
                <CardContent className="p-4 text-center">
                  <s.icon className="h-6 w-6 text-primary mx-auto mb-2" />
                  <div className="font-heading text-2xl font-bold text-foreground">{s.value}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </CardContent>
              </Card>
            </StaggerItem>
          ))}
        </StaggerContainer>

        <Tabs defaultValue="restaurants" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="restaurants" className="gap-2">
              <Utensils className="h-4 w-4" /> Top Restaurants
            </TabsTrigger>
            <TabsTrigger value="volunteers" className="gap-2">
              <Truck className="h-4 w-4" /> Top Volunteers
            </TabsTrigger>
          </TabsList>

          <TabsContent value="restaurants">
            <LeaderboardList
              items={topRestaurants}
              loading={loading}
              emptyMessage="No donations yet. Be the first restaurant to contribute!"
              metricLabel="donations"
            />
          </TabsContent>

          <TabsContent value="volunteers">
            <LeaderboardList
              items={topVolunteers}
              loading={loading}
              emptyMessage="No deliveries completed yet. Volunteer and make a difference!"
              metricLabel="deliveries"
            />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

function LeaderboardList({
  items,
  loading,
  emptyMessage,
  metricLabel,
}: {
  items: RankedUser[];
  loading: boolean;
  emptyMessage: string;
  metricLabel: string;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Card key={i} className="shadow-card animate-pulse">
            <CardContent className="p-5 h-16" />
          </Card>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <Card className="shadow-card">
        <CardContent className="p-8 text-center text-muted-foreground">
          {emptyMessage}
        </CardContent>
      </Card>
    );
  }

  return (
    <StaggerContainer className="space-y-3">
      {items.map((item, index) => {
        const RankIcon = rankIcons[index] || null;
        const rankColor = rankColors[index] || 'text-muted-foreground';
        const isTopThree = index < 3;

        return (
          <StaggerItem key={item.id}>
            <Card className={`shadow-card hover:shadow-elevated transition-shadow ${isTopThree ? 'border-primary/20' : ''}`}>
              <CardContent className="p-5 flex items-center gap-4">
                {/* Rank */}
                <div className={`flex items-center justify-center w-10 h-10 rounded-full shrink-0 ${isTopThree ? 'bg-primary/10' : 'bg-muted'}`}>
                  {RankIcon ? (
                    <RankIcon className={`h-5 w-5 ${rankColor}`} />
                  ) : (
                    <span className="font-heading text-sm font-bold text-muted-foreground">#{index + 1}</span>
                  )}
                </div>

                {/* Avatar */}
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden">
  {item.avatar_url ? (
    <img
      src={item.avatar_url}
      alt={item.full_name || 'User'}
      className="h-full w-full object-cover"
    />
  ) : (
    <span className="font-heading text-sm font-bold text-muted-foreground">
      {(item.full_name?.[0] || '?').toUpperCase()}
    </span>
  )}
</div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-heading text-base font-semibold text-foreground truncate">
                    {item.organization_name || item.full_name}
                  </h3>
                  {item.organization_name && (
                    <p className="text-xs text-muted-foreground truncate">{item.full_name}</p>
                  )}
                </div>

                {/* Count + Rating */}
                <div className="flex items-center gap-3 shrink-0">
                  {item.avgRating != null && (
                    <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                      <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                      {item.avgRating.toFixed(1)}
                    </span>
                  )}
                  <Badge variant={isTopThree ? 'default' : 'outline'} className="text-sm px-3 py-1">
                    {item.count} {metricLabel}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
        );
      })}
    </StaggerContainer>
  );
}

export default Leaderboard;
