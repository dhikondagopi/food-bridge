import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, Utensils, Clock, Navigation } from 'lucide-react';
import { motion } from 'framer-motion';

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
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const nonVegIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const LocationFinder = ({ userPosition }: { userPosition: [number, number] | null }) => {
  const map = useMap();
  useEffect(() => { if (userPosition) map.flyTo(userPosition, 13); }, [userPosition, map]);
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
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    const fetchDonations = async () => {
      const { data, error } = await supabase
        .from('food_donations')
        .select('id, food_name, quantity, food_category, address, pickup_time, expiry_time, latitude, longitude, status, description, image_url, profiles:restaurant_id(full_name, organization_name)')
        .eq('status', 'available');
      if (!error && data) {
        setDonations((data as unknown as DonationWithProfile[]).filter(d => d.latitude !== 0 || d.longitude !== 0));
      }
      setLoading(false);
    };
    fetchDonations();
  }, []);

  const locateUser = () => {
    if (!('geolocation' in navigator)) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => { setUserPosition([pos.coords.latitude, pos.coords.longitude]); setLocating(false); },
      () => setLocating(false)
    );
  };

  useEffect(() => { locateUser(); }, []);

  const vegCount = donations.filter(d => d.food_category === 'veg').length;
  const nonVegCount = donations.filter(d => d.food_category === 'non-veg').length;

  return (
    // ✅ NO DashboardLayout — already wrapped
    <div className="flex flex-col gap-4" style={{ height: 'calc(100vh - 104px)' }}>

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-shrink-0"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Food Donation Map</h1>
            <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
              {loading
                ? 'Loading donations...'
                : `${donations.length} available donation${donations.length !== 1 ? 's' : ''} near you`}
            </p>
          </div>

          {/* Legend + locate button */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1.5 rounded-full text-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Veg ({vegCount})
            </Badge>
            <Badge variant="outline" className="gap-1.5 rounded-full text-xs">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              Non-Veg ({nonVegCount})
            </Badge>
            <button
              onClick={locateUser}
              disabled={locating}
              className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition hover:bg-muted"
            >
              {locating
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Navigation className="h-3.5 w-3.5 text-primary" />
              }
              My Location
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Map ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="relative flex-1 overflow-hidden rounded-2xl border border-border/60 shadow-sm"
        style={{ minHeight: '300px' }}
      >
        {loading && (
          <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-background/60 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading map...</p>
            </div>
          </div>
        )}

        <MapContainer
          center={userPosition || [22.3072, 73.1812]}
          zoom={11}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <LocationFinder userPosition={userPosition} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {donations.map(d => (
            <Marker
              key={d.id}
              position={[d.latitude, d.longitude]}
              icon={d.food_category === 'non-veg' ? nonVegIcon : vegIcon}
            >
              <Popup maxWidth={260} minWidth={200}>
                <div className="space-y-2">
                  {d.image_url && (
                    <img src={d.image_url} alt={d.food_name} className="h-28 w-full rounded-lg object-cover" />
                  )}

                  <div>
                    <p className="font-semibold text-sm text-gray-900">{d.food_name}</p>
                    {d.profiles && (
                      <p className="text-xs text-gray-500">
                        by {d.profiles.organization_name || d.profiles.full_name}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                      <Utensils className="h-3 w-3 flex-shrink-0" />
                      {d.quantity} meals · {d.food_category === 'veg' ? '🥦 Veg' : '🍗 Non-veg'}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{d.address}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                      <Clock className="h-3 w-3 flex-shrink-0" />
                      Pickup: {new Date(d.pickup_time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                      <Clock className="h-3 w-3 flex-shrink-0 text-red-500" />
                      Expires: {new Date(d.expiry_time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </div>
                  </div>

                  {d.description && (
                    <p className="text-xs italic text-gray-500 border-t pt-1.5">{d.description}</p>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Empty state overlay */}
        {!loading && donations.length === 0 && (
          <div className="absolute inset-0 z-[999] flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <MapPin className="h-8 w-8 text-muted-foreground opacity-50" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-foreground">No donations on map</p>
              <p className="mt-1 text-sm text-muted-foreground">Available donations will appear here</p>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default MapPage;