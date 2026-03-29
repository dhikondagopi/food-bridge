import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface LocationPickerProps {
  latitude: number;
  longitude: number;
  onChange: (lat: number, lng: number) => void;
  onAddressChange?: (address: string) => void;
}

const ClickHandler = ({ onChange }: { onChange: (lat: number, lng: number) => void }) => {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

const FlyToLocation = ({ lat, lng }: { lat: number; lng: number }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
};

const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    return data.display_name || '';
  } catch {
    return '';
  }
};

const LocationPicker = ({ latitude, longitude, onChange, onAddressChange }: LocationPickerProps) => {
  const [geolocated, setGeolocated] = useState(false);

  const handleLocationChange = async (lat: number, lng: number) => {
    onChange(lat, lng);
    if (onAddressChange) {
      const address = await reverseGeocode(lat, lng);
      if (address) onAddressChange(address);
    }
  };

  useEffect(() => {
    if (!geolocated && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          handleLocationChange(pos.coords.latitude, pos.coords.longitude);
          setGeolocated(true);
        },
        () => setGeolocated(true)
      );
    }
  }, []);

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Click on the map to set pickup location</p>
      <div className="rounded-lg overflow-hidden border border-border" style={{ height: '250px' }}>
        <MapContainer center={[latitude, longitude]} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[latitude, longitude]} />
          <ClickHandler onChange={handleLocationChange} />
          <FlyToLocation lat={latitude} lng={longitude} />
        </MapContainer>
      </div>
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span>Lat: {latitude.toFixed(5)}</span>
        <span>Lng: {longitude.toFixed(5)}</span>
      </div>
    </div>
  );
};

export default LocationPicker;
