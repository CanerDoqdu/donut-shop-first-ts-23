export interface Product {
  id: string;
  slug: string;
  name_tr: string;
  name_en: string;
  description_tr: string;
  description_en: string;
  price: number;
  image_url: string;
  category: 'glazed' | 'filled' | 'specialty' | 'seasonal' | 'beverage';
  stock: number;
  featured: boolean;
  created_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name_tr: string;
  name_en: string;
  size: string | null;
  flavor: string | null;
  sku: string | null;
  price_offset: number;
  stock: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PromoCode {
  id: string;
  code: string;
  discount_type: 'flat' | 'pct';
  amount: number;
  min_order: number;
  max_uses: number;
  used_count: number;
  active: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StockReservation {
  id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  session_id: string;
  order_id: string | null;
  status: 'pending' | 'confirmed' | 'released';
  expires_at: string;
  created_at: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  variantId?: string;
  variant?: ProductVariant;
}

export interface Order {
  id: string;
  user_id: string | null;
  status: 'pending' | 'paid' | 'preparing' | 'shipped' | 'delivered';
  total_amount: number;
  shipping_address: string;
  stripe_session_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
}

export type Locale = 'tr' | 'en';
