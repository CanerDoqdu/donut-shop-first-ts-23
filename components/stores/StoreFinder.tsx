'use client';

import { useState, useEffect, useCallback, startTransition } from 'react';
import dynamic from 'next/dynamic';
import { MapPin, Navigation, Phone, Clock, Search, List, Map } from 'lucide-react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { StoreGridSkeleton } from '@/components/ui/skeleton';
import type { Store } from '@/lib/supabase/database.types';

// Dynamic import for Leaflet map (no SSR)
const StoreMap = dynamic(() => import('./StoreMap'), { 
  ssr: false,
  loading: () => (
    <div className="h-125 bg-gray-100 rounded-2xl flex items-center justify-center animate-pulse">
      <Map className="w-16 h-16 text-gray-300" />
    </div>
  )
});

interface StoreWithDistance extends Store {
  distance?: number;
}

interface StoreFinderProps {
  locale: 'tr' | 'en';
  onSelectStore?: (store: Store) => void;
}

export default function StoreFinder({ locale, onSelectStore }: StoreFinderProps) {
  const [stores, setStores] = useState<StoreWithDistance[]>([]);
  const [filteredStores, setFilteredStores] = useState<StoreWithDistance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const supabase = createClient();

  function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  }

  const t = {
    tr: {
      title: 'Mağaza Bulucu',
      searchPlaceholder: 'Şehir veya bölge ara...',
      useMyLocation: 'Konumumu Kullan',
      nearestStores: 'En Yakın Mağazalar',
      allStores: 'Tüm Mağazalar',
      open: 'Açık',
      closed: 'Kapalı',
      getDirections: 'Yol Tarifi Al',
      select: 'Seç',
      openingHours: 'Çalışma Saatleri',
      address: 'Adres',
      phone: 'Telefon',
      kmAway: 'km uzakta',
      listView: 'Liste',
      mapView: 'Harita',
      noStoresFound: 'Mağaza bulunamadı',
      monday: 'Pazartesi',
      tuesday: 'Salı',
      wednesday: 'Çarşamba',
      thursday: 'Perşembe',
      friday: 'Cuma',
      saturday: 'Cumartesi',
      sunday: 'Pazar',
    },
    en: {
      title: 'Store Finder',
      searchPlaceholder: 'Search city or area...',
      useMyLocation: 'Use My Location',
      nearestStores: 'Nearest Stores',
      allStores: 'All Stores',
      open: 'Open',
      closed: 'Closed',
      getDirections: 'Get Directions',
      select: 'Select',
      openingHours: 'Opening Hours',
      address: 'Address',
      phone: 'Phone',
      kmAway: 'km away',
      listView: 'List',
      mapView: 'Map',
      noStoresFound: 'No stores found',
      monday: 'Monday',
      tuesday: 'Tuesday',
      wednesday: 'Wednesday',
      thursday: 'Thursday',
      friday: 'Friday',
      saturday: 'Saturday',
      sunday: 'Sunday',
    },
  }[locale];

  // Fallback demo stores when database is not available - localized
  const demoStores: StoreWithDistance[] = locale === 'tr' ? [
    {
      id: '1',
      name: 'Donut Shop Kadıköy',
      slug: 'donut-shop-kadikoy',
      address: 'Caferağa Mah. Moda Cad. No:45',
      city: 'İstanbul',
      district: 'Kadıköy',
      phone: '+90 216 345 67 89',
      email: 'kadikoy@donutshop.com',
      latitude: 40.9876,
      longitude: 29.0256,
      opening_hours: { monday: { open: '08:00', close: '22:00' }, tuesday: { open: '08:00', close: '22:00' }, wednesday: { open: '08:00', close: '22:00' }, thursday: { open: '08:00', close: '22:00' }, friday: { open: '08:00', close: '23:00' }, saturday: { open: '09:00', close: '23:00' }, sunday: { open: '10:00', close: '21:00' } },
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '2',
      name: 'Donut Shop Beşiktaş',
      slug: 'donut-shop-besiktas',
      address: 'Sinanpaşa Mah. Barbaros Bulvarı No:78',
      city: 'İstanbul',
      district: 'Beşiktaş',
      phone: '+90 212 234 56 78',
      email: 'besiktas@donutshop.com',
      latitude: 41.0422,
      longitude: 29.0067,
      opening_hours: { monday: { open: '07:30', close: '22:00' }, tuesday: { open: '07:30', close: '22:00' }, wednesday: { open: '07:30', close: '22:00' }, thursday: { open: '07:30', close: '22:00' }, friday: { open: '07:30', close: '23:00' }, saturday: { open: '08:00', close: '23:00' }, sunday: { open: '09:00', close: '21:00' } },
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '3',
      name: 'Donut Shop Nişantaşı',
      slug: 'donut-shop-nisantasi',
      address: 'Teşvikiye Mah. Abdi İpekçi Cad. No:32',
      city: 'İstanbul',
      district: 'Şişli',
      phone: '+90 212 345 67 89',
      email: 'nisantasi@donutshop.com',
      latitude: 41.0512,
      longitude: 28.9956,
      opening_hours: { monday: { open: '08:00', close: '21:00' }, tuesday: { open: '08:00', close: '21:00' }, wednesday: { open: '08:00', close: '21:00' }, thursday: { open: '08:00', close: '21:00' }, friday: { open: '08:00', close: '22:00' }, saturday: { open: '09:00', close: '22:00' }, sunday: { open: '10:00', close: '20:00' } },
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '4',
      name: 'Donut Shop Bağdat Caddesi',
      slug: 'donut-shop-bagdat-caddesi',
      address: 'Caddebostan Mah. Bağdat Cad. No:256',
      city: 'İstanbul',
      district: 'Kadıköy',
      phone: '+90 216 456 78 90',
      email: 'bagdat@donutshop.com',
      latitude: 40.9634,
      longitude: 29.0612,
      opening_hours: { monday: { open: '08:00', close: '22:00' }, tuesday: { open: '08:00', close: '22:00' }, wednesday: { open: '08:00', close: '22:00' }, thursday: { open: '08:00', close: '22:00' }, friday: { open: '08:00', close: '23:00' }, saturday: { open: '08:00', close: '23:00' }, sunday: { open: '09:00', close: '22:00' } },
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '5',
      name: 'Donut Shop Taksim',
      slug: 'donut-shop-taksim',
      address: 'Gümüşsuyu Mah. İstiklal Cad. No:112',
      city: 'İstanbul',
      district: 'Beyoğlu',
      phone: '+90 212 567 89 01',
      email: 'taksim@donutshop.com',
      latitude: 41.0352,
      longitude: 28.9850,
      opening_hours: { monday: { open: '07:00', close: '00:00' }, tuesday: { open: '07:00', close: '00:00' }, wednesday: { open: '07:00', close: '00:00' }, thursday: { open: '07:00', close: '00:00' }, friday: { open: '07:00', close: '02:00' }, saturday: { open: '08:00', close: '02:00' }, sunday: { open: '08:00', close: '00:00' } },
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '6',
      name: 'Donut Shop Ankara Kızılay',
      slug: 'donut-shop-ankara-kizilay',
      address: 'Kızılay Mah. Atatürk Bulvarı No:89',
      city: 'Ankara',
      district: 'Çankaya',
      phone: '+90 312 234 56 78',
      email: 'kizilay@donutshop.com',
      latitude: 39.9208,
      longitude: 32.8541,
      opening_hours: { monday: { open: '08:00', close: '21:00' }, tuesday: { open: '08:00', close: '21:00' }, wednesday: { open: '08:00', close: '21:00' }, thursday: { open: '08:00', close: '21:00' }, friday: { open: '08:00', close: '22:00' }, saturday: { open: '09:00', close: '22:00' }, sunday: { open: '10:00', close: '20:00' } },
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ] : [
    // International stores for English locale
    {
      id: '1',
      name: 'Donut Shop Manhattan',
      slug: 'donut-shop-manhattan',
      address: '350 5th Avenue, Empire State Building',
      city: 'New York',
      district: 'Manhattan',
      phone: '+1 212 736 3100',
      email: 'manhattan@donutshop.com',
      latitude: 40.7484,
      longitude: -73.9857,
      opening_hours: { monday: { open: '06:00', close: '23:00' }, tuesday: { open: '06:00', close: '23:00' }, wednesday: { open: '06:00', close: '23:00' }, thursday: { open: '06:00', close: '23:00' }, friday: { open: '06:00', close: '00:00' }, saturday: { open: '07:00', close: '00:00' }, sunday: { open: '08:00', close: '22:00' } },
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '2',
      name: 'Donut Shop Brooklyn',
      slug: 'donut-shop-brooklyn',
      address: '123 Atlantic Avenue',
      city: 'New York',
      district: 'Brooklyn',
      phone: '+1 718 555 0123',
      email: 'brooklyn@donutshop.com',
      latitude: 40.6892,
      longitude: -73.9857,
      opening_hours: { monday: { open: '07:00', close: '22:00' }, tuesday: { open: '07:00', close: '22:00' }, wednesday: { open: '07:00', close: '22:00' }, thursday: { open: '07:00', close: '22:00' }, friday: { open: '07:00', close: '23:00' }, saturday: { open: '08:00', close: '23:00' }, sunday: { open: '08:00', close: '21:00' } },
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '3',
      name: 'Donut Shop London Soho',
      slug: 'donut-shop-london-soho',
      address: '45 Oxford Street, Soho',
      city: 'London',
      district: 'Westminster',
      phone: '+44 20 7123 4567',
      email: 'soho@donutshop.com',
      latitude: 51.5152,
      longitude: -0.1314,
      opening_hours: { monday: { open: '07:00', close: '22:00' }, tuesday: { open: '07:00', close: '22:00' }, wednesday: { open: '07:00', close: '22:00' }, thursday: { open: '07:00', close: '22:00' }, friday: { open: '07:00', close: '23:00' }, saturday: { open: '08:00', close: '23:00' }, sunday: { open: '09:00', close: '20:00' } },
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '4',
      name: 'Donut Shop Paris',
      slug: 'donut-shop-paris',
      address: '25 Avenue des Champs-Élysées',
      city: 'Paris',
      district: '8th Arrondissement',
      phone: '+33 1 42 89 00 00',
      email: 'paris@donutshop.com',
      latitude: 48.8698,
      longitude: 2.3078,
      opening_hours: { monday: { open: '08:00', close: '21:00' }, tuesday: { open: '08:00', close: '21:00' }, wednesday: { open: '08:00', close: '21:00' }, thursday: { open: '08:00', close: '21:00' }, friday: { open: '08:00', close: '22:00' }, saturday: { open: '09:00', close: '22:00' }, sunday: { open: '10:00', close: '20:00' } },
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '5',
      name: 'Donut Shop Tokyo Shibuya',
      slug: 'donut-shop-tokyo-shibuya',
      address: '1-2-3 Shibuya, Shibuya-ku',
      city: 'Tokyo',
      district: 'Shibuya',
      phone: '+81 3 1234 5678',
      email: 'shibuya@donutshop.com',
      latitude: 35.6595,
      longitude: 139.7004,
      opening_hours: { monday: { open: '07:00', close: '23:00' }, tuesday: { open: '07:00', close: '23:00' }, wednesday: { open: '07:00', close: '23:00' }, thursday: { open: '07:00', close: '23:00' }, friday: { open: '07:00', close: '00:00' }, saturday: { open: '08:00', close: '00:00' }, sunday: { open: '08:00', close: '22:00' } },
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '6',
      name: 'Donut Shop Dubai Mall',
      slug: 'donut-shop-dubai-mall',
      address: 'The Dubai Mall, Financial Center Road',
      city: 'Dubai',
      district: 'Downtown',
      phone: '+971 4 123 4567',
      email: 'dubai@donutshop.com',
      latitude: 25.1972,
      longitude: 55.2744,
      opening_hours: { monday: { open: '10:00', close: '00:00' }, tuesday: { open: '10:00', close: '00:00' }, wednesday: { open: '10:00', close: '00:00' }, thursday: { open: '10:00', close: '01:00' }, friday: { open: '10:00', close: '01:00' }, saturday: { open: '10:00', close: '01:00' }, sunday: { open: '10:00', close: '00:00' } },
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const fetchStores = useCallback(async () => {
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .eq('is_active', true)
      .order('city');

    if (!error && data && data.length > 0) {
      startTransition(() => {
        setStores(data);
        setFilteredStores(data);
      });
    } else {
      // Use demo stores as fallback
      startTransition(() => {
        setStores(demoStores);
        setFilteredStores(demoStores);
      });
    }
    setLoading(false);
  }, [supabase]);

  const filterStores = useCallback(() => {
    let filtered = stores;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        s =>
          s.name.toLowerCase().includes(query) ||
          s.city.toLowerCase().includes(query) ||
          s.district.toLowerCase().includes(query) ||
          s.address.toLowerCase().includes(query)
      );
    }

    if (userLocation) {
      filtered = filtered
        .map(s => ({
          ...s,
          distance: calculateDistance(
            userLocation.lat,
            userLocation.lng,
            s.latitude,
            s.longitude
          ),
        }))
        .sort((a, b) => (a.distance || 0) - (b.distance || 0));
    }

    setFilteredStores(filtered);
  }, [stores, searchQuery, userLocation]);

  useEffect(() => {
    startTransition(() => {
      void fetchStores();
    });
  }, [fetchStores]);

  useEffect(() => {
    startTransition(() => {
      void filterStores();
    });
  }, [filterStores]);

  function getUserLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  }

  function isStoreOpen(store: Store): boolean {
    const now = new Date();
    const day = now.getDay();
    const hours = store.opening_hours as Record<string, { open: string; close: string }>;
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayHours = hours?.[days[day]];

    if (!todayHours) return false;

    const currentTime = now.getHours() * 60 + now.getMinutes();
    const [openHour, openMin] = todayHours.open.split(':').map(Number);
    const [closeHour, closeMin] = todayHours.close.split(':').map(Number);
    const openTime = openHour * 60 + openMin;
    const closeTime = closeHour * 60 + closeMin;

    return currentTime >= openTime && currentTime <= closeTime;
  }

  function openDirections(store: Store) {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${store.latitude},${store.longitude}`;
    window.open(url, '_blank');
  }

  const getDayLabel = (day: string) => {
    const labels: Record<string, string> = {
      monday: t.monday,
      tuesday: t.tuesday,
      wednesday: t.wednesday,
      thursday: t.thursday,
      friday: t.friday,
      saturday: t.saturday,
      sunday: t.sunday,
    };
    return labels[day] || day;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="h-8 w-48 mx-auto bg-linear-to-r from-amber-100 via-amber-50 to-amber-100 rounded animate-shimmer bg-size-[200%_100%]" />
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 h-12 bg-linear-to-r from-amber-100 via-amber-50 to-amber-100 rounded-xl animate-shimmer bg-size-[200%_100%]" />
          <div className="h-12 w-full sm:w-40 bg-linear-to-r from-amber-100 via-amber-50 to-amber-100 rounded-xl animate-shimmer bg-size-[200%_100%]" />
        </div>
        <StoreGridSkeleton count={4} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-800">{t.title}</h1>
      </div>

      {/* Search & Controls */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4">
        <div className="relative flex-1 min-w-0 sm:min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={getUserLocation}
          className="flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition-colors"
        >
          <Navigation className="w-5 h-5" />
          {t.useMyLocation}
        </button>
        <div className="flex rounded-xl bg-gray-100 p-1 w-full sm:w-auto">
          <button
            onClick={() => setViewMode('list')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'list' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'
            }`}
          >
            <List className="w-4 h-4" />
            {t.listView}
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'map' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'
            }`}
          >
            <Map className="w-4 h-4" />
            {t.mapView}
          </button>
        </div>
      </div>

      {/* Section Title */}
      <h2 className="font-semibold text-gray-600">
        {userLocation ? t.nearestStores : t.allStores} ({filteredStores.length})
      </h2>

      {/* Stores List/Map */}
      {viewMode === 'list' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredStores.length === 0 ? (
            <div className="col-span-2 text-center py-12 bg-gray-50 rounded-2xl">
              <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">{t.noStoresFound}</p>
            </div>
          ) : (
            filteredStores.map((store, index) => {
              const open = isStoreOpen(store);
              const distance = (store as Store & { distance?: number }).distance;

              return (
                <motion.div
                  key={store.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`bg-white rounded-2xl border-2 p-5 transition-all cursor-pointer ${
                    selectedStore?.id === store.id
                      ? 'border-amber-500 shadow-lg'
                      : 'border-gray-100 hover:border-amber-200'
                  }`}
                  onClick={() => setSelectedStore(store)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-gray-800">{store.name}</h3>
                      <p className="text-sm text-gray-500">{store.district}, {store.city}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        open ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {open ? t.open : t.closed}
                      </span>
                      {distance !== undefined && (
                        <span className="text-xs text-gray-500">{distance} {t.kmAway}</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <p className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" />
                      {store.address}
                    </p>
                    <p className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      {store.phone}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); openDirections(store); }}
                      className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                    >
                      <Navigation className="w-4 h-4" />
                      {t.getDirections}
                    </button>
                    {onSelectStore && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onSelectStore(store); }}
                        className="flex-1 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors"
                      >
                        {t.select}
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      ) : (
        /* Map View with Leaflet */
        <div className="h-125 rounded-2xl overflow-hidden">
          <StoreMap
            stores={filteredStores}
            userLocation={userLocation}
            selectedStore={selectedStore}
            onSelectStore={onSelectStore}
            locale={locale}
          />
        </div>
      )}

      {/* Store Detail Modal */}
      {selectedStore && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedStore(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">{selectedStore.name}</h2>
                  <p className="text-gray-500">{selectedStore.district}, {selectedStore.city}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  isStoreOpen(selectedStore) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {isStoreOpen(selectedStore) ? t.open : t.closed}
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {t.address}
                  </h3>
                  <p className="text-gray-600">{selectedStore.address}</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    {t.phone}
                  </h3>
                  <a href={`tel:${selectedStore.phone}`} className="text-amber-600 hover:underline">
                    {selectedStore.phone}
                  </a>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {t.openingHours}
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(selectedStore.opening_hours as Record<string, { open: string; close: string }>).map(
                      ([day, hours]) => (
                        <div key={day} className="flex justify-between bg-gray-50 rounded-lg px-3 py-2">
                          <span className="text-gray-600">{getDayLabel(day)}</span>
                          <span className="font-medium text-gray-800">
                            {hours.open} - {hours.close}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => openDirections(selectedStore)}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                >
                  <Navigation className="w-5 h-5" />
                  {t.getDirections}
                </button>
                {onSelectStore && (
                  <button
                    onClick={() => {
                      onSelectStore(selectedStore);
                      setSelectedStore(null);
                    }}
                    className="flex-1 py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition-colors"
                  >
                    {t.select}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
