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
  // Appearance V2 fields
  secondary_color: string | null;
  button_color: string | null;
  button_text_color: string | null;
  badge_color: string | null;
  heading_font: string | null;
  body_font: string | null;
  title_size: string | null;
  spacing_density: string | null;
  button_animation: string | null;
  button_radius: string | null;
  button_width: string | null;
  cta_label: string | null;
  dark_mode_enabled: boolean | null;
  product_card_style: string | null;
  global_radius: string | null;
  banner_size: string | null;
  favicon_url: string | null;
  // Apparence V2 Pro — new columns
  background_color: string | null;
  card_bg_color: string | null;
  header_color: string | null;
  footer_color: string | null;
  products_per_row: string | null;
  products_sort_order: string | null;
  button_shadow: string | null;
  // Identity & Typography V3
  identity_display_mode: string | null;
  title_size_px: number | null;
  body_size_px: number | null;
  letter_spacing_px: number | null;
  line_height_pct: number | null;
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
  description: Record<string, unknown> | string | null;
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

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'shipping'
  | 'delivered'
  | 'cancelled'
  | 'archived';

// Valid forward transitions (no backward allowed)
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending:   ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['shipping'],
  shipping:  ['delivered'],
  delivered: ['archived'],
  cancelled: ['archived'],
  archived:  [],
};

export type PaymentMethod = 'MoMo' | 'Wave' | 'Orange' | 'Cash' | 'cod' | 'whatsapp';

export interface Order {
  id: string;
  shop_id: string;
  order_number?: string;
  customer_name: string;
  customer_phone?: string | null;
  phone?: string | null;
  city?: string | null;
  quartier?: string | null;
  notes?: string | null;
  location_url?: string | null;
  total_amount?: number;
  total?: number;
  status: OrderStatus;
  payment_method: string | null;
  created_at: string;
  updated_at?: string;
  items?: OrderItem[] | Record<string, unknown>[];
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
