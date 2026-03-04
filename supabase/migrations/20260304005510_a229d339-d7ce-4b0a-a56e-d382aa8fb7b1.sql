CREATE INDEX IF NOT EXISTS idx_shops_slug ON public.shops (slug);
CREATE INDEX IF NOT EXISTS idx_shops_owner_id ON public.shops (owner_id);
CREATE INDEX IF NOT EXISTS idx_products_shop_id_active ON public.products (shop_id, is_active);
CREATE INDEX IF NOT EXISTS idx_orders_shop_id ON public.orders (shop_id);
CREATE INDEX IF NOT EXISTS idx_orders_shop_id_status ON public.orders (shop_id, status);