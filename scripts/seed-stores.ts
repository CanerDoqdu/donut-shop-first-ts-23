// Seed script to add sample stores to Supabase
// Run with: npx ts-node --skip-project scripts/seed-stores.ts

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const sampleStores = [
  {
    name: 'Donut Shop Kadıköy',
    slug: 'donut-shop-kadikoy',
    address: 'Caferağa Mah. Moda Cad. No:45',
    city: 'İstanbul',
    district: 'Kadıköy',
    phone: '+90 216 345 67 89',
    email: 'kadikoy@donutshop.com',
    latitude: 40.9876,
    longitude: 29.0256,
    opening_hours: {
      monday: { open: '08:00', close: '22:00' },
      tuesday: { open: '08:00', close: '22:00' },
      wednesday: { open: '08:00', close: '22:00' },
      thursday: { open: '08:00', close: '22:00' },
      friday: { open: '08:00', close: '23:00' },
      saturday: { open: '09:00', close: '23:00' },
      sunday: { open: '10:00', close: '21:00' },
    },
    is_active: true,
  },
  {
    name: 'Donut Shop Beşiktaş',
    slug: 'donut-shop-besiktas',
    address: 'Sinanpaşa Mah. Barbaros Bulvarı No:78',
    city: 'İstanbul',
    district: 'Beşiktaş',
    phone: '+90 212 234 56 78',
    email: 'besiktas@donutshop.com',
    latitude: 41.0422,
    longitude: 29.0067,
    opening_hours: {
      monday: { open: '07:30', close: '22:00' },
      tuesday: { open: '07:30', close: '22:00' },
      wednesday: { open: '07:30', close: '22:00' },
      thursday: { open: '07:30', close: '22:00' },
      friday: { open: '07:30', close: '23:00' },
      saturday: { open: '08:00', close: '23:00' },
      sunday: { open: '09:00', close: '21:00' },
    },
    is_active: true,
  },
  {
    name: 'Donut Shop Nişantaşı',
    slug: 'donut-shop-nisantasi',
    address: 'Teşvikiye Mah. Abdi İpekçi Cad. No:32',
    city: 'İstanbul',
    district: 'Şişli',
    phone: '+90 212 345 67 89',
    email: 'nisantasi@donutshop.com',
    latitude: 41.0512,
    longitude: 28.9956,
    opening_hours: {
      monday: { open: '08:00', close: '21:00' },
      tuesday: { open: '08:00', close: '21:00' },
      wednesday: { open: '08:00', close: '21:00' },
      thursday: { open: '08:00', close: '21:00' },
      friday: { open: '08:00', close: '22:00' },
      saturday: { open: '09:00', close: '22:00' },
      sunday: { open: '10:00', close: '20:00' },
    },
    is_active: true,
  },
  {
    name: 'Donut Shop Bağdat Caddesi',
    slug: 'donut-shop-bagdat-caddesi',
    address: 'Caddebostan Mah. Bağdat Cad. No:256',
    city: 'İstanbul',
    district: 'Kadıköy',
    phone: '+90 216 456 78 90',
    email: 'bagdat@donutshop.com',
    latitude: 40.9634,
    longitude: 29.0612,
    opening_hours: {
      monday: { open: '08:00', close: '22:00' },
      tuesday: { open: '08:00', close: '22:00' },
      wednesday: { open: '08:00', close: '22:00' },
      thursday: { open: '08:00', close: '22:00' },
      friday: { open: '08:00', close: '23:00' },
      saturday: { open: '08:00', close: '23:00' },
      sunday: { open: '09:00', close: '22:00' },
    },
    is_active: true,
  },
  {
    name: 'Donut Shop Taksim',
    slug: 'donut-shop-taksim',
    address: 'Gümüşsuyu Mah. İstiklal Cad. No:112',
    city: 'İstanbul',
    district: 'Beyoğlu',
    phone: '+90 212 567 89 01',
    email: 'taksim@donutshop.com',
    latitude: 41.0352,
    longitude: 28.9850,
    opening_hours: {
      monday: { open: '07:00', close: '00:00' },
      tuesday: { open: '07:00', close: '00:00' },
      wednesday: { open: '07:00', close: '00:00' },
      thursday: { open: '07:00', close: '00:00' },
      friday: { open: '07:00', close: '02:00' },
      saturday: { open: '08:00', close: '02:00' },
      sunday: { open: '08:00', close: '00:00' },
    },
    is_active: true,
  },
  {
    name: 'Donut Shop Ankara Kızılay',
    slug: 'donut-shop-ankara-kizilay',
    address: 'Kızılay Mah. Atatürk Bulvarı No:89',
    city: 'Ankara',
    district: 'Çankaya',
    phone: '+90 312 234 56 78',
    email: 'kizilay@donutshop.com',
    latitude: 39.9208,
    longitude: 32.8541,
    opening_hours: {
      monday: { open: '08:00', close: '21:00' },
      tuesday: { open: '08:00', close: '21:00' },
      wednesday: { open: '08:00', close: '21:00' },
      thursday: { open: '08:00', close: '21:00' },
      friday: { open: '08:00', close: '22:00' },
      saturday: { open: '09:00', close: '22:00' },
      sunday: { open: '10:00', close: '20:00' },
    },
    is_active: true,
  },
];

async function seedStores() {
  console.log('Seeding stores...');

  // First, delete existing stores (optional)
  // const { error: deleteError } = await supabase.from('stores').delete().neq('id', '');
  // if (deleteError) console.warn('Delete error:', deleteError);

  const { data, error } = await supabase
    .from('stores')
    .upsert(sampleStores, { onConflict: 'slug' })
    .select();

  if (error) {
    console.error('Error seeding stores:', error);
    return;
  }

  console.log(`Successfully seeded ${data.length} stores!`);
  console.log(data);
}

seedStores();
