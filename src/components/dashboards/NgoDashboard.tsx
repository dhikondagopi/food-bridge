import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { FoodDonation } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { sendNotification } from '@/lib/notifications';
import { StaggerContainer, StaggerItem, FadeInSection } from '@/components/motion/StaggerContainer';

interface Volunteer {
  id: string;
  full_name: string;
  phone: string | null;
}

const NgoDashboard = () => {
  const { user } = useAuth();

  const [donations, setDonations] = useState<FoodDonation[]>([]);
  const [myPickups, setMyPickups] = useState<any[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [reservingId, setReservingId] = useState<string | null>(null);

  // ✅ FETCH DONATIONS
  const fetchDonations = async () => {
  const { data, error } = await supabase
  .from('pickup_requests')
  .select(`
    *,
    food_donations!pickup_requests_donation_id_fkey(*),
    profiles!pickup_requests_ngo_id_fkey(*)
  `)
  .eq('ngo_id', user.id)
  .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      toast.error('Failed to fetch donations');
      return;
    }

    setDonations((data as unknown as FoodDonation[]) || []);
  };

  // ✅ FETCH PICKUPS
  const fetchMyPickups = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('pickup_requests')
      .select(`
  *,
  food_donations!pickup_requests_donation_id_fkey(*)
`)
      .eq('ngo_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      toast.error('Failed to fetch pickups');
      return;
    }

    setMyPickups(data || []);
  };

  // ✅ FETCH VOLUNTEERS
  const fetchVolunteers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, phone')
      .eq('role', 'volunteer');

    if (error) {
      console.error(error);
      toast.error('Failed to fetch volunteers');
      return;
    }

    setVolunteers((data as Volunteer[]) || []);
  };

  useEffect(() => {
    fetchDonations();
    fetchMyPickups();
    fetchVolunteers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ✅ RESERVE FOOD
  const reserveFood = async (donation: FoodDonation) => {
    if (!user) return;

    setReservingId(donation.id);

    try {
      const { error } = await supabase.from('pickup_requests').insert({
        donation_id: donation.id,
        ngo_id: user.id,
        status: 'pending',
      });

      if (error) {
        toast.error('Failed to reserve');
        return;
      }

      await supabase
        .from('food_donations')
        .update({ status: 'reserved' })
        .eq('id', donation.id);

      sendNotification({
        event_type: 'donation_reserved',
        user_id: donation.restaurant_id,
        donation_id: donation.id,
        message: `Your donation "${donation.food_name}" has been reserved.`,
      });

      toast.success('Food reserved!');
      fetchDonations();
      fetchMyPickups();
    } catch (err) {
      console.error(err);
      toast.error('Something went wrong');
    } finally {
      setReservingId(null);
    }
  };

  // ✅ FILTER (SAFE VERSION)
  const filtered = donations.filter(d => {
    const matchesSearch =
      (d.food_name?.toLowerCase().includes(search.toLowerCase()) || false) ||
      (d.location?.toLowerCase().includes(search.toLowerCase()) || false);

    const matchesCategory =
      categoryFilter === 'all' || d.food_category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  return (
    <div>
      <FadeInSection className="mb-8">
        <h1 className="text-3xl font-bold">NGO Dashboard</h1>
      </FadeInSection>

      {/* 🔍 SEARCH */}
      <Input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search food or location..."
      />

      {/* 📦 DONATIONS */}
      <StaggerContainer className="grid md:grid-cols-2 gap-4 mt-6">
        {filtered.map(d => (
          <StaggerItem key={d.id}>
            <Card>
              <CardContent className="p-5 space-y-2">
                <h3 className="text-lg font-semibold">
                  {d.food_name || 'Unnamed Food'}
                </h3>

                {/* 📍 LOCATION */}
                <span className="flex items-center gap-1 text-sm text-gray-600">
                  <MapPin className="h-4 w-4" />
                  {d.location || 'No location provided'}
                </span>

                {/* 🍽 CATEGORY */}
                <Badge>
                  {d.food_category || 'Unknown'}
                </Badge>

                {/* 🚀 BUTTON */}
                <Button
                  disabled={reservingId === d.id}
                  onClick={() => reserveFood(d)}
                  className="w-full mt-2"
                >
                  {reservingId === d.id ? 'Reserving...' : 'Reserve'}
                </Button>
              </CardContent>
            </Card>
          </StaggerItem>
        ))}
      </StaggerContainer>
    </div>
  );
};

export default NgoDashboard;