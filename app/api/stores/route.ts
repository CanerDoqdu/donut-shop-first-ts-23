import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Edge runtime for faster response
export const runtime = 'edge';

// Cache for 10 minutes
export const revalidate = 600;

// Demo stores fallback
const demoStores = {
  tr: [
    { id: '1', name: 'Donut Shop Kadıköy', slug: 'donut-shop-kadikoy', address: 'Caferağa Mah. Moda Cad. No:45', city: 'İstanbul', district: 'Kadıköy', phone: '+90 216 345 67 89', latitude: 40.9876, longitude: 29.0256, is_active: true },
    { id: '2', name: 'Donut Shop Beşiktaş', slug: 'donut-shop-besiktas', address: 'Sinanpaşa Mah. Barbaros Bulvarı No:78', city: 'İstanbul', district: 'Beşiktaş', phone: '+90 212 234 56 78', latitude: 41.0422, longitude: 29.0067, is_active: true },
    { id: '3', name: 'Donut Shop Nişantaşı', slug: 'donut-shop-nisantasi', address: 'Teşvikiye Mah. Abdi İpekçi Cad. No:32', city: 'İstanbul', district: 'Şişli', phone: '+90 212 345 67 89', latitude: 41.0512, longitude: 28.9956, is_active: true },
    { id: '4', name: 'Donut Shop Taksim', slug: 'donut-shop-taksim', address: 'Gümüşsuyu Mah. İstiklal Cad. No:112', city: 'İstanbul', district: 'Beyoğlu', phone: '+90 212 567 89 01', latitude: 41.0352, longitude: 28.9850, is_active: true },
    { id: '5', name: 'Donut Shop Ankara', slug: 'donut-shop-ankara', address: 'Kızılay Mah. Atatürk Bulvarı No:89', city: 'Ankara', district: 'Çankaya', phone: '+90 312 234 56 78', latitude: 39.9208, longitude: 32.8541, is_active: true },
  ],
  en: [
    { id: '1', name: 'Donut Shop Manhattan', slug: 'donut-shop-manhattan', address: '350 5th Avenue, Empire State Building', city: 'New York', district: 'Manhattan', phone: '+1 212 736 3100', latitude: 40.7484, longitude: -73.9857, is_active: true },
    { id: '2', name: 'Donut Shop Brooklyn', slug: 'donut-shop-brooklyn', address: '123 Atlantic Avenue', city: 'New York', district: 'Brooklyn', phone: '+1 718 555 0123', latitude: 40.6892, longitude: -73.9857, is_active: true },
    { id: '3', name: 'Donut Shop London', slug: 'donut-shop-london', address: '45 Oxford Street, Soho', city: 'London', district: 'Westminster', phone: '+44 20 7123 4567', latitude: 51.5152, longitude: -0.1314, is_active: true },
    { id: '4', name: 'Donut Shop Paris', slug: 'donut-shop-paris', address: '25 Avenue des Champs-Élysées', city: 'Paris', district: '8th Arrondissement', phone: '+33 1 42 89 00 00', latitude: 48.8698, longitude: 2.3078, is_active: true },
    { id: '5', name: 'Donut Shop Tokyo', slug: 'donut-shop-tokyo', address: '1-2-3 Shibuya, Shibuya-ku', city: 'Tokyo', district: 'Shibuya', phone: '+81 3 1234 5678', latitude: 35.6595, longitude: 139.7004, is_active: true },
  ],
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const locale = searchParams.get('locale') || 'tr';
  const city = searchParams.get('city');

  try {
    // Try to fetch from Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      let query = supabase
        .from('stores')
        .select('*')
        .eq('is_active', true)
        .order('city');

      if (city) {
        query = query.eq('city', city);
      }

      const { data, error } = await query;

      if (!error && data && data.length > 0) {
        return NextResponse.json(
          { stores: data, total: data.length },
          {
            headers: {
              'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200',
            },
          }
        );
      }
    }
  } catch {
    // Fall through to demo data
  }

  // Return demo stores
  const stores = demoStores[locale as 'tr' | 'en'] || demoStores.tr;
  const filteredStores = city ? stores.filter(s => s.city === city) : stores;

  return NextResponse.json(
    { stores: filteredStores, total: filteredStores.length },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200',
      },
    }
  );
}
