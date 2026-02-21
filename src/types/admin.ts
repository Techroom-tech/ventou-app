import { type LucideIcon } from 'lucide-react';

export type AdminRole = 'super_admin' | 'manager' | 'support';
export type AppRole = 'super_admin' | 'manager' | 'support' | 'vendor';

export interface AdminNavItem {
  key: string;
  icon: LucideIcon;
  path: string;
  roles?: AdminRole[];
}

export interface AdminVendor {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  created_at: string;
  plan_id: string;
  subscription_status: string;
  trial_ends_at: string | null;
  stores_count: number;
  products_count: number;
  orders_count: number;
  report_count_6m: number;
  risk_score: 'low' | 'medium' | 'high';
}

export interface AdminStore {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  owner_email?: string;
  is_active: boolean;
  is_suspended: boolean;
  suspended_reason: string | null;
  product_count: number;
  order_count: number;
  report_count: number;
  created_at: string;
}

export interface AdminReport {
  id: string;
  reporter_id: string | null;
  reporter_email?: string;
  target_type: 'product' | 'store';
  target_id: string;
  target_name?: string;
  shop_id: string;
  reason: string;
  details: string | null;
  status: 'pending' | 'reviewed' | 'ignored' | 'actioned';
  admin_note: string | null;
  resolved_by: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  max_stores: number;
  max_products: number;
  price_monthly: number;
  features: string[];
  requires_approval: boolean;
}

export interface VendorSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: 'trial' | 'active' | 'expired' | 'cancelled';
  trial_ends_at: string | null;
  current_period_start: string;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
  // joined
  user_email?: string;
  plan_name?: string;
}

export interface AdminAuditEntry {
  admin_id: string;
  action: string;
  target_type: string;
  target_id: string;
  details?: Record<string, unknown>;
}

export interface PlatformStats {
  totalVendors: number;
  activeSubscriptions: number;
  storesCount: number;
  productsCount: number;
  pendingReports: number;
  subscriptionRevenue: number;
  expiringSoon: number;
  vendorsOnTrial: number;
}
