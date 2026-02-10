'use client';

import { useState, useEffect, useCallback, startTransition } from 'react';
import { MapPin, Phone, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import type { Store } from '@/lib/supabase/database.types';

interface StoreSelectorProps {
  selectedStore: Store | null;
  onStoreSelect: (store: Store) => void;
  locale: 'tr' | 'en';
}

export default function StoreSelector({ selectedStore, onStoreSelect, locale }: StoreSelectorProps) {
  const [stores, setStores] = useState<Store[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchStores = useCallback(async () => {
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .eq('is_active', true)
      .order('city');
    
    if (!error && data) {
      setStores(data);
      // Auto-select first store if none selected
      if (!selectedStore && data.length > 0) {
        onStoreSelect(data[0]);
      }
    }
    setLoading(false);
  }, [supabase, selectedStore, onStoreSelect]);

  useEffect(() => {
    startTransition(() => {
      void fetchStores();
    });
  }, [fetchStores]);

  const t = {
    tr: {
      selectStore: 'Mağaza Seçin',
      loading: 'Yükleniyor...',
      noStores: 'Mağaza bulunamadı',
      open: 'Açık',
      closed: 'Kapalı',
    },
    en: {
      selectStore: 'Select Store',
      loading: 'Loading...',
      noStores: 'No stores found',
      open: 'Open',
      closed: 'Closed',
    },
  }[locale];

  const isStoreOpen = (store: Store) => {
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
  };

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-100 rounded-xl p-4 h-16" />
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-3 bg-white border-2 border-amber-200 rounded-xl p-4 hover:border-amber-400 transition-colors"
      >
        <div className="flex items-center gap-3">
          <MapPin className="w-5 h-5 text-amber-600" />
          <div className="text-left">
            {selectedStore ? (
              <>
                <p className="font-semibold text-gray-800">{selectedStore.name}</p>
                <p className="text-sm text-gray-500">{selectedStore.district}, {selectedStore.city}</p>
              </>
            ) : (
              <p className="text-gray-500">{t.selectStore}</p>
            )}
          </div>
        </div>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 max-h-80 overflow-y-auto"
          >
            {stores.length === 0 ? (
              <p className="p-4 text-center text-gray-500">{t.noStores}</p>
            ) : (
              stores.map((store) => {
                const open = isStoreOpen(store);
                return (
                  <button
                    key={store.id}
                    onClick={() => {
                      onStoreSelect(store);
                      setIsOpen(false);
                    }}
                    className={`w-full p-4 text-left hover:bg-amber-50 transition-colors border-b last:border-b-0 ${
                      selectedStore?.id === store.id ? 'bg-amber-50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-gray-800">{store.name}</p>
                        <p className="text-sm text-gray-500 mt-1">{store.address}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span className="flex items-center gap-1 text-gray-500">
                            <Phone className="w-3 h-3" />
                            {store.phone}
                          </span>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        open ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {open ? t.open : t.closed}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
