import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const vegIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const nonVegIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Component to fly map to user's location
const LocationFinder = ({ userPosition }: { userPosition: [number, number] | null }) => {
  const map = useMap();
  useEffect(() => {
    if (userPosition) {
      map.flyTo(userPosition, 13);
    }
  }, [userPosition, map]);
  return null;
};

interface DonationWithProfile {
  id: string;
  food_name: string;
  quantity: number;
  food_category: string;
  address: string;
  pickup_time: string;
  expiry_time: string;
  latitude: number;
  longitude: number;
  status: string;
  description: string | null;
  image_url: string | null;
  profiles: { full_name: string; organization_name: string | null } | null;
}

const MapPage = () => {
  const [donations, setDonations] = useState<DonationWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null);

  useEffect(() => {
    const fetchDonations = async () => {
      const { data, error } = await supabase
        .from('food_donations')
        .select('id, food_name, quantity, food_category, address, pickup_time, expiry_time, latitude, longitude, status, description, image_url, profiles:restaurant_id(full_name, organization_name)')
        .eq('status', 'available');

      if (!error && data) {
        const valid = (data as unknown as DonationWithProfile[]).filter(
          (d) => d.latitude !== 0 || d.longitude !== 0
        );
        setDonations(valid);
      }
      setLoading(false);
    };
    fetchDonations();
  }, []);

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserPosition([pos.coords.latitude, pos.coords.longitude]),
        () => console.log('Geolocation denied or unavailable')
      );
    }
  }, []);

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Food Donation Map</h1>
          <p className="text-muted-foreground mt-1">
            {loading ? 'Loading donations...' : `${donations.length} available donation${donations.length !== 1 ? 's' : ''} on map`}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500" />Veg</Badge>
          <Badge variant="outline" className="gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" />Non-Veg</Badge>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden border border-border shadow-card relative" style={{ height: '500px' }}>
        {loading && (
          <div className="absolute inset-0 z-[1000] bg-background/50 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        <MapContainer center={userPosition || [28.6139, 77.209]} zoom={11} style={{ height: '100%', width: '100%' }}>
          <LocationFinder userPosition={userPosition} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {donations.map((d) => (
            <Marker
              key={d.id}
              position={[d.latitude, d.longitude]}
              icon={d.food_category === 'non-veg' ? nonVegIcon : vegIcon}
            >
              <Popup>
                <div className="min-w-[200px] max-w-[260px]">
                  {d.image_url && (
                    <img
                      src={d.image_url}
                      alt={d.food_name}
                      className="w-full h-28 object-cover rounded-md mb-2"
                    />
                  )}
                  <strong className="text-sm">{d.food_name}</strong>
                  {d.profiles && (
                    <p className="text-xs text-gray-500">
                      by {d.profiles.organization_name || d.profiles.full_name}
                    </p>
                  )}
                  <p className="text-xs mt-1">
                    🍽️ {d.quantity} meals • {d.food_category}
                  </p>
                  <p className="text-xs">📍 {d.address}</p>
                  <p className="text-xs">🕐 Pickup: {new Date(d.pickup_time).toLocaleString()}</p>
                  <p className="text-xs">⏳ Expires: {new Date(d.expiry_time).toLocaleString()}</p>
                  {d.description && <p className="text-xs mt-1 italic">{d.description}</p>}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </DashboardLayout>
  );
};

export default MapPage;
