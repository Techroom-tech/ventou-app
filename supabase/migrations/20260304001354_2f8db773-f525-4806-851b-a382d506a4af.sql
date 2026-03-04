
-- ═══════════════════════════════════════════════════════════════
-- CRITICAL INDEXES FOR GLOBAL SCALE (millions of daily visitors)
-- ═══════════════════════════════════════════════════════════════

-- ── ORDERS: most queried table, always filtered by shop_id + status ──
CREATE INDEX IF NOT EXISTS idx_orders_shop_id ON public.orders (shop_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_shop_status ON public.orders (shop_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_shop_created ON public.orders (shop_id, created_at DESC);

-- ── PRODUCTS: storefront queries filter by shop_id + is_active + status ──
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products (is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products (status) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_products_shop_active ON public.products (shop_id, is_active, status);

-- ── PRODUCT IMAGES: always joined to products ──
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON public.product_images (product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_position ON public.product_images (product_id, position);

-- ── PRODUCT VARIANTS: always joined to products ──
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON public.product_variants (product_id);

-- ── FLASH PROMOTIONS: queried by shop + active status ──
CREATE INDEX IF NOT EXISTS idx_flash_promotions_shop_id ON public.flash_promotions (shop_id);
CREATE INDEX IF NOT EXISTS idx_flash_promotions_product_id ON public.flash_promotions (product_id);
CREATE INDEX IF NOT EXISTS idx_flash_promotions_active ON public.flash_promotions (shop_id, is_active) WHERE is_active = true;

-- ── DISCOUNT CODES: lookup by shop + code ──
CREATE INDEX IF NOT EXISTS idx_discount_codes_shop_id ON public.discount_codes (shop_id);
CREATE INDEX IF NOT EXISTS idx_discount_codes_shop_code ON public.discount_codes (shop_id, code);

-- ── TRACKED LINKS: filtered by shop ──
CREATE INDEX IF NOT EXISTS idx_tracked_links_shop_id ON public.tracked_links (shop_id);

-- ── SHOPS: storefront resolution by slug (most critical path) ──
CREATE INDEX IF NOT EXISTS idx_shops_slug_active ON public.shops (slug, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_shops_owner_id ON public.shops (owner_id);

-- ── PROFILES: auth lookup ──
CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles (id);

-- ── VENDOR SUBSCRIPTIONS: user lookup ──
CREATE INDEX IF NOT EXISTS idx_vendor_subscriptions_user_id ON public.vendor_subscriptions (user_id);
