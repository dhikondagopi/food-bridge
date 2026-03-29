import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { FoodDonation } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit, Utensils, Clock, MapPin, ImagePlus, X } from 'lucide-react';
import LocationPicker from '@/components/LocationPicker';
import { toast } from 'sonner';
import { sendNotification } from '@/lib/notifications';
import { motion } from 'framer-motion';
import { StaggerContainer, StaggerItem, FadeInSection } from '@/components/motion/StaggerContainer';

const RestaurantDashboard = () => {
  const { user } = useAuth();
  const [donations, setDonations] = useState<FoodDonation[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    food_name: '', quantity: 1, food_category: 'veg' as 'veg' | 'non-veg',
    preparation_time: '', expiry_time: '', pickup_time: '',
    description: '', address: '', latitude: 28.6139, longitude: 77.209,
  });

  const fetchDonations = async () => {
  if (!user) return;

  const { data, error } = await supabase
    .from('food_donations')
    .select('*')
    .eq('restaurant_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Fetch error:", error);
    return;
  }

  setDonations(data || []);
};

  useEffect(() => { fetchDonations(); }, [user]);

  // Real-time subscription for donation status changes
  useEffect(() => {
    const channel = supabase
      .channel('restaurant-donation-changes')
      .on(
  'postgres_changes',
  {
    event: '*',
    schema: 'public',
    table: 'food_donations',
    filter: `restaurant_id=eq.${user?.id}`,
  },
  () => {
    fetchDonations();
  }
)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile || !user) return null;
    const ext = imageFile.name.split('.').pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('food-images').upload(path, imageFile);
    if (error) { toast.error('Image upload failed'); return null; }
    const { data } = supabase.storage.from('food-images').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setUploading(true);
    const image_url = await uploadImage();
    const { error } = await supabase.from('food_donations').insert({
  food_name: form.food_name,
  quantity: form.quantity,
  food_category: form.food_category,
  preparation_time: form.preparation_time,
  expiry_time: form.expiry_time,
  pickup_time: form.pickup_time,
  description: form.description,
  location: form.address,   // ⭐ IMPORTANT FIX
  latitude: form.latitude,
  longitude: form.longitude,
  restaurant_id: user.id,
  status: 'available',
  ...(image_url ? { image_url } : {}),
});
    setUploading(false);
    if (error) { toast.error('Failed to create donation'); return; }
    toast.success('Food donation posted!');
    // Notify all NGOs about the new donation
    sendNotification({
      event_type: 'donation_created',
      notify_role: 'ngo',
      message: `New food donation "${form.food_name}" (${form.quantity} meals) is available for pickup at ${form.address}.`,
    });
    setShowForm(false);
    clearImage();
    setForm({ food_name: '', quantity: 1, food_category: 'veg', preparation_time: '', expiry_time: '', pickup_time: '', description: '', address: '', latitude: 28.6139, longitude: 77.209 });
    fetchDonations();
  };

  const deleteDonation = async (id: string) => {
    await supabase.from('food_donations').delete().eq('id', id);
    toast.success('Donation deleted');
    fetchDonations();
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'available': return 'bg-success/10 text-success border-success/20';
      case 'reserved': return 'bg-warning/10 text-warning border-warning/20';
      case 'picked_up': return 'bg-primary/10 text-primary border-primary/20';
      case 'delivered': return 'bg-muted text-muted-foreground border-border';
      default: return '';
    }
  };

  return (
    <div>
      <FadeInSection className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Restaurant Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage your food donations</p>
        </div>
        <Button variant="hero" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" />{showForm ? 'Cancel' : 'New Donation'}
        </Button>
      </FadeInSection>

      {showForm && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
          <Card className="mb-8 shadow-card">
            <CardHeader><CardTitle className="font-heading">Post Food Donation</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Food Name</Label>
                  <Input value={form.food_name} onChange={e => setForm({ ...form, food_name: e.target.value })} required className="mt-1" />
                </div>
                <div>
                  <Label>Quantity (meals)</Label>
                  <Input type="number" min={1} value={form.quantity} onChange={e => setForm({ ...form, quantity: +e.target.value })} required className="mt-1" />
                </div>
                <div>
                  <Label>Category</Label>
                  <select value={form.food_category} onChange={e => setForm({ ...form, food_category: e.target.value as any })} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                    <option value="veg">Vegetarian</option>
                    <option value="non-veg">Non-Vegetarian</option>
                  </select>
                </div>
                <div>
                  <Label>Preparation Time</Label>
                  <Input type="datetime-local" value={form.preparation_time} onChange={e => setForm({ ...form, preparation_time: e.target.value })} required className="mt-1" />
                </div>
                <div>
                  <Label>Expiry Time</Label>
                  <Input type="datetime-local" value={form.expiry_time} onChange={e => setForm({ ...form, expiry_time: e.target.value })} required className="mt-1" />
                </div>
                <div>
                  <Label>Pickup Time</Label>
                  <Input type="datetime-local" value={form.pickup_time} onChange={e => setForm({ ...form, pickup_time: e.target.value })} required className="mt-1" />
                </div>
                <div className="md:col-span-2">
                  <Label>Pickup Address</Label>
                  <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} required className="mt-1" placeholder="Full address" />
                </div>
                <div className="md:col-span-2">
                  <Label>Pickup Location</Label>
                  <div className="mt-1">
                    <LocationPicker
                      latitude={form.latitude}
                      longitude={form.longitude}
                      onChange={(lat, lng) => setForm(f => ({ ...f, latitude: lat, longitude: lng }))}
                      onAddressChange={(address) => setForm(f => ({ ...f, address }))}
                    />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <Label>Description (optional)</Label>
                  <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="mt-1" />
                </div>
                <div className="md:col-span-2">
                  <Label>Food Photo (optional)</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  {imagePreview ? (
                    <div className="mt-1 relative inline-block">
                      <img src={imagePreview} alt="Preview" className="h-32 w-32 object-cover rounded-lg border border-border" />
                      <button
                        type="button"
                        onClick={clearImage}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-1"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <ImagePlus className="h-4 w-4 mr-2" /> Add Photo
                    </Button>
                  )}
                </div>
                <div className="md:col-span-2">
                  <Button type="submit" variant="hero" disabled={uploading}>
                    {uploading ? 'Uploading...' : 'Post Donation'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Stats */}
      <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Donations', value: donations.length, icon: Utensils },
          { label: 'Available', value: donations.filter(d => d.status === 'available').length, icon: Clock },
          { label: 'Picked Up', value: donations.filter(d => d.status === 'picked_up').length, icon: MapPin },
          { label: 'Delivered', value: donations.filter(d => d.status === 'delivered').length, icon: Utensils },
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

      {/* Donations List */}
      <StaggerContainer className="space-y-4">
        {donations.length === 0 && (
          <StaggerItem>
            <Card className="shadow-card"><CardContent className="p-8 text-center text-muted-foreground">No donations yet. Click "New Donation" to get started.</CardContent></Card>
          </StaggerItem>
        )}
        {donations.map(d => (
          <StaggerItem key={d.id}>
            <Card className="shadow-card hover:shadow-elevated transition-shadow">
              <CardContent className="p-5 flex items-center justify-between gap-4">
                {d.image_url && (
                  <img src={d.image_url} alt={d.food_name} className="h-16 w-16 rounded-lg object-cover border border-border flex-shrink-0" />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-heading text-lg font-semibold text-foreground">{d.food_name}</h3>
                    <Badge variant="outline" className={statusColor(d.status)}>{d.status.replace('_', ' ')}</Badge>
                    <Badge variant="outline">{d.food_category}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span>{d.quantity} meals</span>
                    <span>Pickup: {new Date(d.pickup_time).toLocaleString()}</span>
                    <span>📍 {d.address}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => deleteDonation(d.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
        ))}
      </StaggerContainer>
    </div>
  );
};

export default RestaurantDashboard;
