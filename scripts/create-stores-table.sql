-- Create stores table
CREATE TABLE IF NOT EXISTS public.stores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  district TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  opening_hours JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_stores_city ON public.stores(city);
CREATE INDEX IF NOT EXISTS idx_stores_is_active ON public.stores(is_active);
CREATE INDEX IF NOT EXISTS idx_stores_slug ON public.stores(slug);

-- Enable RLS
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read active stores
CREATE POLICY "Anyone can read active stores" ON public.stores
  FOR SELECT USING (is_active = true);

-- Allow authenticated users to manage stores (for admin)
CREATE POLICY "Admins can manage stores" ON public.stores
  FOR ALL USING (auth.role() = 'authenticated');

-- Insert sample stores data
INSERT INTO public.stores (name, slug, address, city, district, phone, email, latitude, longitude, opening_hours, is_active)
VALUES 
  (
    'Donut Shop Kadıköy',
    'donut-shop-kadikoy',
    'Caferağa Mah. Moda Cad. No:45',
    'İstanbul',
    'Kadıköy',
    '+90 216 345 67 89',
    'kadikoy@donutshop.com',
    40.9876,
    29.0256,
    '{"monday": {"open": "08:00", "close": "22:00"}, "tuesday": {"open": "08:00", "close": "22:00"}, "wednesday": {"open": "08:00", "close": "22:00"}, "thursday": {"open": "08:00", "close": "22:00"}, "friday": {"open": "08:00", "close": "23:00"}, "saturday": {"open": "09:00", "close": "23:00"}, "sunday": {"open": "10:00", "close": "21:00"}}',
    true
  ),
  (
    'Donut Shop Beşiktaş',
    'donut-shop-besiktas',
    'Sinanpaşa Mah. Barbaros Bulvarı No:78',
    'İstanbul',
    'Beşiktaş',
    '+90 212 234 56 78',
    'besiktas@donutshop.com',
    41.0422,
    29.0067,
    '{"monday": {"open": "07:30", "close": "22:00"}, "tuesday": {"open": "07:30", "close": "22:00"}, "wednesday": {"open": "07:30", "close": "22:00"}, "thursday": {"open": "07:30", "close": "22:00"}, "friday": {"open": "07:30", "close": "23:00"}, "saturday": {"open": "08:00", "close": "23:00"}, "sunday": {"open": "09:00", "close": "21:00"}}',
    true
  ),
  (
    'Donut Shop Nişantaşı',
    'donut-shop-nisantasi',
    'Teşvikiye Mah. Abdi İpekçi Cad. No:32',
    'İstanbul',
    'Şişli',
    '+90 212 345 67 89',
    'nisantasi@donutshop.com',
    41.0512,
    28.9956,
    '{"monday": {"open": "08:00", "close": "21:00"}, "tuesday": {"open": "08:00", "close": "21:00"}, "wednesday": {"open": "08:00", "close": "21:00"}, "thursday": {"open": "08:00", "close": "21:00"}, "friday": {"open": "08:00", "close": "22:00"}, "saturday": {"open": "09:00", "close": "22:00"}, "sunday": {"open": "10:00", "close": "20:00"}}',
    true
  ),
  (
    'Donut Shop Bağdat Caddesi',
    'donut-shop-bagdat-caddesi',
    'Caddebostan Mah. Bağdat Cad. No:256',
    'İstanbul',
    'Kadıköy',
    '+90 216 456 78 90',
    'bagdat@donutshop.com',
    40.9634,
    29.0612,
    '{"monday": {"open": "08:00", "close": "22:00"}, "tuesday": {"open": "08:00", "close": "22:00"}, "wednesday": {"open": "08:00", "close": "22:00"}, "thursday": {"open": "08:00", "close": "22:00"}, "friday": {"open": "08:00", "close": "23:00"}, "saturday": {"open": "08:00", "close": "23:00"}, "sunday": {"open": "09:00", "close": "22:00"}}',
    true
  ),
  (
    'Donut Shop Taksim',
    'donut-shop-taksim',
    'Gümüşsuyu Mah. İstiklal Cad. No:112',
    'İstanbul',
    'Beyoğlu',
    '+90 212 567 89 01',
    'taksim@donutshop.com',
    41.0352,
    28.9850,
    '{"monday": {"open": "07:00", "close": "00:00"}, "tuesday": {"open": "07:00", "close": "00:00"}, "wednesday": {"open": "07:00", "close": "00:00"}, "thursday": {"open": "07:00", "close": "00:00"}, "friday": {"open": "07:00", "close": "02:00"}, "saturday": {"open": "08:00", "close": "02:00"}, "sunday": {"open": "08:00", "close": "00:00"}}',
    true
  ),
  (
    'Donut Shop Ankara Kızılay',
    'donut-shop-ankara-kizilay',
    'Kızılay Mah. Atatürk Bulvarı No:89',
    'Ankara',
    'Çankaya',
    '+90 312 234 56 78',
    'kizilay@donutshop.com',
    39.9208,
    32.8541,
    '{"monday": {"open": "08:00", "close": "21:00"}, "tuesday": {"open": "08:00", "close": "21:00"}, "wednesday": {"open": "08:00", "close": "21:00"}, "thursday": {"open": "08:00", "close": "21:00"}, "friday": {"open": "08:00", "close": "22:00"}, "saturday": {"open": "09:00", "close": "22:00"}, "sunday": {"open": "10:00", "close": "20:00"}}',
    true
  )
ON CONFLICT (slug) DO NOTHING;
