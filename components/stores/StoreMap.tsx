'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Store } from '@/lib/supabase/database.types';

// Fix for default marker icons in Next.js
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const UserIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface StoreMapProps {
  stores: Store[];
  userLocation?: { lat: number; lng: number } | null;
  selectedStore?: Store | null;
  onSelectStore?: (store: Store) => void;
  locale: 'tr' | 'en';
}

// Component to handle map center changes
function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  
  return null;
}

export default function StoreMap({ 
  stores, 
  userLocation, 
  selectedStore,
  onSelectStore,
  locale 
}: StoreMapProps) {
  // Default center (Istanbul)
  const defaultCenter: [number, number] = [41.0082, 28.9784];
  
  // Calculate center based on user location or selected store
  const center: [number, number] = selectedStore 
    ? [selectedStore.latitude, selectedStore.longitude]
    : userLocation 
      ? [userLocation.lat, userLocation.lng]
      : stores.length > 0 
        ? [stores[0].latitude, stores[0].longitude]
        : defaultCenter;

  const zoom = selectedStore ? 15 : userLocation ? 13 : 11;

  const t = {
    tr: {
      open: 'Açık',
      closed: 'Kapalı',
      getDirections: 'Yol Tarifi',
      select: 'Seç',
      yourLocation: 'Konumunuz',
    },
    en: {
      open: 'Open',
      closed: 'Closed',
      getDirections: 'Get Directions',
      select: 'Select',
      yourLocation: 'Your Location',
    },
  }[locale];

  const isStoreOpen = (store: Store): boolean => {
    const now = new Date();
    const day = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const hours = store.opening_hours as Record<string, { open: string; close: string }>;
    const todayHours = hours?.[day];
    
    if (!todayHours) return false;
    
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const [openHour, openMin] = todayHours.open.split(':').map(Number);
    const [closeHour, closeMin] = todayHours.close.split(':').map(Number);
    const openTime = openHour * 60 + openMin;
    const closeTime = closeHour * 60 + closeMin;
    
    return currentTime >= openTime && currentTime <= closeTime;
  };

  const openDirections = (store: Store) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${store.latitude},${store.longitude}`;
    window.open(url, '_blank');
  };

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className="h-full w-full rounded-2xl"
      style={{ minHeight: '400px' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      <MapController center={center} zoom={zoom} />
      
      {/* User location marker */}
      {userLocation && (
        <Marker position={[userLocation.lat, userLocation.lng]} icon={UserIcon}>
          <Popup>
            <div className="text-center font-medium">{t.yourLocation}</div>
          </Popup>
        </Marker>
      )}
      
      {/* Store markers */}
      {stores.map((store) => {
        const open = isStoreOpen(store);
        return (
          <Marker 
            key={store.id} 
            position={[store.latitude, store.longitude]}
            icon={DefaultIcon}
          >
            <Popup>
              <div className="min-w-48">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-gray-800">{store.name}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ml-2 ${
                    open ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {open ? t.open : t.closed}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{store.address}</p>
                <p className="text-sm text-gray-500 mb-3">{store.phone}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => openDirections(store)}
                    className="flex-1 py-1.5 bg-gray-100 text-gray-700 rounded text-sm font-medium hover:bg-gray-200 transition-colors"
                  >
                    {t.getDirections}
                  </button>
                  {onSelectStore && (
                    <button
                      onClick={() => onSelectStore(store)}
                      className="flex-1 py-1.5 bg-amber-500 text-white rounded text-sm font-medium hover:bg-amber-600 transition-colors"
                    >
                      {t.select}
                    </button>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
