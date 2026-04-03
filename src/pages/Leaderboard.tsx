import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Trophy,
  Users,
  Package,
  Truck,
  TrendingUp,
  Crown,
  MapPin,
  ChevronRight,
  Utensils,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  StaggerContainer,
  StaggerItem,
  FadeInSection,
} from '@/components/motion/StaggerContainer';
import DashboardLayout from '@/components/motion/layout/DashboardLayout';

interface RankedUser {
  id: string;
  full_name: string;
  organization_name: string | null;
  avatar_url: string | null;
  count: number;
}

const Leaderboard = () => {
  const navigate = useNavigate();
  const [topRestaurants, setTopRestaurants] = useState<RankedUser[]>([]);
  const [topVolunteers, setTopVolunteers] = useState<RankedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'restaurants' | 'volunteers'>('restaurants');

  useEffect(() => {
    const fetchLeaderboards = async () => {
      setLoading(true);
      try {
        const { data: donations, error: donationError } = await supabase
          .from('food_donations')
          .select('restaurant_id');

        if (donationError) throw donationError;

        const restaurantCounts: Record<string, number> = {};
        donations?.forEach((d) => {
          if (d.restaurant_id) {
            restaurantCounts[d.restaurant_id] = (restaurantCounts[d.restaurant_id] || 0) + 1;
          }
        });

        const restaurantIds = Object.keys(restaurantCounts);
        if (restaurantIds.length > 0) {
          const { data: restaurantProfiles, error: restaurantError } = await supabase
            .from('profiles')
            .select('id, full_name, organization_name, avatar_url')
            .in('id', restaurantIds);

          if (restaurantError) throw restaurantError;

          const rankedRestaurants = (restaurantProfiles || [])
            .map((p) => ({
              ...p,
              count: restaurantCounts[p.id] || 0,
              full_name: p.full_name || 'Unknown User',
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

          setTopRestaurants(rankedRestaurants);
        } else {
          setTopRestaurants([]);
        }

        const { data: pickups, error: pickupError } = await supabase
          .from('pickup_requests')
          .select('volunteer_id')
          .eq('status', 'delivered')
          .not('volunteer_id', 'is', null);

        if (pickupError) throw pickupError;

        const volunteerCounts: Record<string, number> = {};
        pickups?.forEach((p) => {
          if (p.volunteer_id) {
            volunteerCounts[p.volunteer_id] = (volunteerCounts[p.volunteer_id] || 0) + 1;
          }
        });

        const volunteerIds = Object.keys(volunteerCounts);
        if (volunteerIds.length > 0) {
          const { data: volunteerProfiles, error: volunteerError } = await supabase
            .from('profiles')
            .select('id, full_name, organization_name, avatar_url')
            .in('id', volunteerIds);

          if (volunteerError) throw volunteerError;

          const rankedVolunteers = (volunteerProfiles || [])
            .map((p) => ({
              ...p,
              count: volunteerCounts[p.id] || 0,
              full_name: p.full_name || 'Unknown User',
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

          setTopVolunteers(rankedVolunteers);
        } else {
          setTopVolunteers([]);
        }
      } catch (error) {
        console.error('Leaderboard fetch failed:', error);
        setTopRestaurants([]);
        setTopVolunteers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboards();
  }, []);

  const totalDonations = topRestaurants.reduce((sum, r) => sum + r.count, 0);
  const totalDeliveries = topVolunteers.reduce((sum, v) => sum + v.count, 0);

  const featuredUser =
    activeTab === 'restaurants' ? topRestaurants[0] : topVolunteers[0];

  const handleViewItem = (userId: string, type: 'restaurant' | 'volunteer') => {
    if (type === 'restaurant') {
      navigate(`/dashboard?restaurant=${userId}`);
      return;
    }
    navigate(`/dashboard?volunteer=${userId}`);
  };

  const handlePrimaryAction = () => {
    navigate('/dashboard');
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[#0f172a]">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <FadeInSection className="mb-10">
            <div className="flex items-center gap-3 mb-2">
              <Trophy className="h-8 w-8 text-blue-500" />
              <h1 className="text-4xl font-bold text-white">Leaderboard</h1>
            </div>
            <p className="text-slate-400 text-lg">
              Celebrating our top contributors in the fight against food waste
            </p>
          </FadeInSection>

          <StaggerContainer className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
            {[
              { label: 'Total Donations', value: totalDonations, icon: Package },
              { label: 'Total Deliveries', value: totalDeliveries, icon: Truck },
              { label: 'Top Restaurants', value: topRestaurants.length, icon: TrendingUp },
              { label: 'Active Volunteers', value: topVolunteers.length, icon: Users },
            ].map((stat) => (
              <StaggerItem key={stat.label}>
                <Card className="bg-slate-800/70 border border-slate-700 shadow-none rounded-xl">
                  <CardContent className="p-6">
                    <stat.icon className="h-6 w-6 text-blue-500 mb-4" />
                    <div className="text-4xl font-bold text-white leading-none mb-2">
                      {stat.value}
                    </div>
                    <div className="text-slate-400 text-sm">{stat.label}</div>
                  </CardContent>
                </Card>
              </StaggerItem>
            ))}
          </StaggerContainer>

          <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-8 items-start">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="bg-slate-800/70 border border-slate-700 rounded-2xl overflow-hidden">
                <CardContent className="p-8 text-center">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center">
                    <Crown className="h-10 w-10 text-slate-900" />
                  </div>

                  <div className="text-5xl font-bold text-white mb-4">#1</div>

                  <h2 className="text-3xl font-semibold text-white truncate mb-2">
                    {featuredUser?.organization_name || featuredUser?.full_name || 'No Leader Yet'}
                  </h2>

                  <div className="flex items-center justify-center gap-2 text-slate-400 mb-8">
                    <MapPin className="h-4 w-4" />
                    <span>Vāghodia, Gujarat</span>
                  </div>

                  <div className="bg-slate-900/60 border border-slate-700 rounded-xl py-5 mb-6">
                    <div className="text-4xl font-bold text-white">
                      {featuredUser?.count || 0}
                    </div>
                    <div className="text-xs tracking-[0.2em] uppercase text-slate-400 mt-1">
                      {activeTab === 'restaurants' ? 'Donations' : 'Deliveries'}
                    </div>
                  </div>

                  <Button
                    onClick={() =>
                      featuredUser &&
                      handleViewItem(
                        featuredUser.id,
                        activeTab === 'restaurants' ? 'restaurant' : 'volunteer'
                      )
                    }
                    disabled={!featuredUser}
                    className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
                  >
                    View Details
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="bg-slate-800/50 border border-slate-700 rounded-2xl">
                <CardHeader className="pb-4">
                  <CardTitle className="text-white text-3xl flex items-center gap-3">
                    <span className="w-2 h-10 rounded-full bg-emerald-400" />
                    Top {activeTab === 'restaurants' ? 'Restaurants' : 'Volunteers'}
                  </CardTitle>
                  <CardDescription className="text-slate-400 text-base">
                    Ranked by total contributions
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <Tabs
                    value={activeTab}
                    onValueChange={(value) =>
                      setActiveTab(value as 'restaurants' | 'volunteers')
                    }
                    className="w-full"
                  >
                    <TabsList className="grid grid-cols-2 w-full h-14 bg-slate-900/60 rounded-xl mb-6">
                      <TabsTrigger
                        value="restaurants"
                        className="rounded-lg text-base data-[state=active]:bg-slate-700 data-[state=active]:text-white"
                      >
                        Top Restaurants
                      </TabsTrigger>
                      <TabsTrigger
                        value="volunteers"
                        className="rounded-lg text-base data-[state=active]:bg-slate-700 data-[state=active]:text-white"
                      >
                        Top Volunteers
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="restaurants" className="mt-0">
                      <LeaderboardList
                        items={topRestaurants.slice(1)}
                        loading={loading}
                        metricLabel="donations"
                        type="restaurant"
                        onView={handleViewItem}
                      />
                    </TabsContent>

                    <TabsContent value="volunteers" className="mt-0">
                      <LeaderboardList
                        items={topVolunteers.slice(1)}
                        loading={loading}
                        metricLabel="deliveries"
                        type="volunteer"
                        onView={handleViewItem}
                      />
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <div className="flex justify-center mt-12">
            <Button
              onClick={handlePrimaryAction}
              className="h-12 px-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
            >
              <Utensils className="mr-2 h-4 w-4" />
              Go to Donations
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

interface LeaderboardListProps {
  items: RankedUser[];
  loading: boolean;
  metricLabel: string;
  type: 'restaurant' | 'volunteer';
  onView: (userId: string, type: 'restaurant' | 'volunteer') => void;
}

function LeaderboardList({
  items,
  loading,
  metricLabel,
  type,
  onView,
}: LeaderboardListProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-slate-800/60 border border-slate-700 rounded-xl animate-pulse">
            <CardContent className="p-6 h-24" />
          </Card>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <Card className="bg-slate-800/60 border border-slate-700 rounded-xl">
        <CardContent className="p-12 text-center text-slate-400">
          No ranking data available.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.06 }}
        >
          <Card className="bg-slate-800/70 border border-slate-700 rounded-xl hover:border-slate-600 transition-colors">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-slate-700 flex items-center justify-center text-white text-2xl font-bold shrink-0">
                #{index + 2}
              </div>

              <div className="h-14 w-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                {item.avatar_url ? (
                  <img
                    src={item.avatar_url}
                    alt={item.full_name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-slate-300 font-semibold text-lg">
                    {(item.full_name?.[0] || '?').toUpperCase()}
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-white text-2xl font-semibold truncate">
                  {item.organization_name || item.full_name}
                </h3>
                <p className="text-slate-500 text-sm truncate">
                  {item.full_name}
                </p>
              </div>

              <div className="text-right min-w-[110px]">
                <div className="text-4xl font-bold text-white leading-none">
                  {item.count}
                </div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500 mt-1">
                  {metricLabel}
                </div>
              </div>

              <Button
                onClick={() => onView(item.id, type)}
                variant="ghost"
                className="h-11 px-4 text-slate-200 hover:text-white hover:bg-slate-700 rounded-xl"
              >
                View
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

export default Leaderboard;