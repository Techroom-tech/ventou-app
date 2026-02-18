import { CurrencyCode } from '@/integrations/supabase/client';

export interface Shop {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  city: string | null;
  country: string | null;
  logo_url: string | null;
  banner_url: string | null;
  primary_color: string | null;
  whatsapp: string | null;
  currency: CurrencyCode;
  is_verified: boolean;
  is_active: boolean;
  enable_whatsapp_order: boolean;
  enable_cod: boolean;
  created_at: string;
  updated_at: string;
}

export interface StorefrontOrder {
  id?: string;
  shop_id: string;
  customer_name: string;
  phone: string;
  city: string;
  quartier?: string;
  notes?: string;
  location_url?: string;
  items: Array<{
    product_id: string;
    name: string;
    quantity: number;
    unit_price: number;
  }>;
  total: number;
  status: string;
  payment_method: string;
}

export type ProductStatus = 'draft' | 'published' | 'hidden';
export type ProductType = 'physical' | 'digital';

export interface Product {
  id: string;
  shop_id: string;
  name: string;
  slug: string | null;
  description: string | null;
  description_json: Record<string, unknown> | null;
  price: number;
  stock_quantity: number;
  image_url: string | null;
  compare_at_price: number | null;
  is_active: boolean;
  status: ProductStatus;
  category: string | null;
  tags: string[];
  product_type: ProductType;
  meta_title: string | null;
  meta_description: string | null;
  track_stock: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  storage_path: string | null;
  position: number;
  is_primary: boolean;
  created_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  value: string;
  price: number | null;
  stock_quantity: number;
  created_at: string;
  updated_at: string;
}

export type OrderStatus = 'PAID' | 'PENDING' | 'CANCELLED';
export type PaymentMethod = 'MoMo' | 'Wave' | 'Orange' | 'Cash';

export interface Order {
  id: string;
  shop_id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string | null;
  total_amount: number;
  status: OrderStatus;
  payment_method: PaymentMethod | null;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  quantity: number;
  unit_price: number;
  product?: Product;
}

export interface Notification {
  id: string;
  shop_id: string;
  type: 'new_order' | 'payment_confirmed' | 'security_alert' | 'info';
  title: string;
  message: string | null;
  is_read: boolean;
  created_at: string;
}

export interface Wallet {
  id: string;
  shop_id: string;
  balance: number;
  currency: CurrencyCode;
  updated_at: string;
}

export interface DashboardStats {
  totalSales: number;
  ordersToday: number;
  salesChange: number;
  ordersChange: number;
}
