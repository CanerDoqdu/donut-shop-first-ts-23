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

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Order {
  id: string;
  user_email: string;
  status: 'pending' | 'paid' | 'preparing' | 'shipped' | 'delivered';
  items: OrderItem[];
  total: number;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
}

export type Locale = 'tr' | 'en';
