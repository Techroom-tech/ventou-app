

## Premium Ecommerce Product Page for Ventou Stores

This is a major rebuild of the current `ProductDetailSheet` (a side sheet/drawer) into a full-page, conversion-optimized product page with gallery, variants, reviews, related products, SEO structured data, and tracking.

### Architecture Decision

Currently, clicking a product opens a Sheet (desktop) or Drawer (mobile). The new design requires a **full page** at a route like `/produit/{slug}` within the storefront context. The existing Sheet behavior can remain as a quick-view option, but the primary product experience will be a dedicated page component.

### Files to Create

**`src/components/storefront/ProductPage.tsx`** — Main product page component (~600 lines), containing:

1. **Product Gallery**
   - Fetches `product_images` table for multi-image support
   - Desktop: Large main image + vertical thumbnails, hover zoom (CSS transform-origin on mousemove)
   - Mobile: Horizontal swipe carousel using `embla-carousel-react` (already installed)
   - Lazy loading with `loading="lazy"`, preload for main image via `<link rel="preload">`

2. **Product Info Column**
   - Product title (text-3xl font-bold)
   - Star rating (average from reviews, or placeholder)
   - Price display: current price + crossed-out compare_at_price
   - **Variant selectors**: Fetch `product_variants` grouped by `name` (e.g., "Couleur", "Taille"), render as selectable button chips. Hidden if no variants exist.
   - Quantity selector: `[-] N [+]`
   - "Acheter maintenant" primary CTA using store `button_color`
   - Share icons: Facebook, WhatsApp, Twitter (X), Telegram — using Lucide `Share2`, `MessageCircle` + custom SVGs or web share API

3. **Product Tabs** (`Tabs` component)
   - "Détails produit": Renders TipTap JSON as rich HTML (supporting images, videos, text). Use a simple recursive renderer that outputs `<p>`, `<img>`, `<iframe>` for YouTube embeds.
   - "Avis clients": Reviews list + submission form

4. **Customer Reviews**
   - New DB table `product_reviews` (id, product_id, shop_id, full_name, phone, rating 1-5, review_text, country, created_at)
   - RLS: public INSERT, owner SELECT, public SELECT (approved reviews)
   - Display: name, date, star rating, review text, country flag via `https://flagcdn.com/24x18/{code}.png`
   - Form: full_name, phone, review_text, star rating (clickable stars). No email field.

5. **Related Products**
   - Query up to 4 products from same shop (same category preferred, fallback to any), excluding current product
   - Render as horizontal card row, reusing existing product card style

6. **Store Footer** — Reuse existing footer from ShopStorefront

7. **Sticky Mobile Buy Bar** — Fixed bottom bar on mobile with price + "Acheter maintenant" button

### Files to Modify

**`src/pages/ShopStorefront.tsx`**
- Add route handling: when URL matches `/produit/{slug}` pattern, render `ProductPage` instead of the grid
- Or better: add an internal state/URL param approach to show product page within the storefront

**`src/App.tsx`**
- Add storefront product route if using URL-based routing

### New Database Migration

```sql
CREATE TABLE public.product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  shop_id uuid NOT NULL,
  full_name text NOT NULL,
  phone text,
  rating smallint NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text,
  country text,
  is_approved boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a review
CREATE POLICY "public_insert_reviews" ON public.product_reviews
  FOR INSERT WITH CHECK (true);

-- Anyone can read approved reviews
CREATE POLICY "public_read_approved_reviews" ON public.product_reviews
  FOR SELECT USING (is_approved = true);

-- Shop owner can manage reviews
CREATE POLICY "owner_manage_reviews" ON public.product_reviews
  FOR ALL USING (shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid()));

CREATE INDEX idx_reviews_product ON public.product_reviews(product_id);
CREATE INDEX idx_reviews_shop ON public.product_reviews(shop_id);
```

### SEO & Meta

**`src/components/storefront/ProductSEO.tsx`** — Injects into `<head>`:
- JSON-LD `schema.org/Product` with name, description, image, brand (shop name), price, currency, availability
- OpenGraph tags: og:title, og:description, og:image, og:image:width, og:image:height, og:url
- Twitter card tags

Uses `useEffect` to dynamically create/update `<meta>` and `<script type="application/ld+json">` elements.

### Tracking Integration

- `ViewContent` fires on product page mount (already partially exists)
- `AddToCart` fires on CTA click
- `Purchase` fires in CheckoutDrawer (already exists)
- Campaign attribution from `campaignTracking.ts` continues to work

### DOM Stability

Add a small utility that patches `Node.prototype.removeChild` and `Node.prototype.insertBefore` with try/catch wrappers to prevent crashes from Google Translate / browser extensions. Inject in `main.tsx`.

### Country Flags

Use `https://flagcdn.com/24x18/{code}.png` in:
- Review display (reviewer's country)
- Already available for campaign analytics

### Performance

- Main product image: `<link rel="preload" as="image">`
- All other images: `loading="lazy"`
- Component is lazy-loaded via `React.lazy`
- Embla carousel only loaded on mobile

### Responsive Breakpoints

- **Desktop (≥1024px)**: 2-column grid (gallery left, info right)
- **Tablet (768-1023px)**: Gallery stacked on top, info below
- **Mobile (<768px)**: Full-width gallery slider, stacked content, sticky bottom buy bar

### Summary of All Files

| File | Action |
|------|--------|
| Migration SQL | Create `product_reviews` table |
| `src/components/storefront/ProductPage.tsx` | New — full product page |
| `src/components/storefront/ProductSEO.tsx` | New — SEO meta/JSON-LD |
| `src/components/storefront/ProductGallery.tsx` | New — gallery with zoom + carousel |
| `src/components/storefront/ProductReviews.tsx` | New — reviews list + form |
| `src/components/storefront/RelatedProducts.tsx` | New — related products section |
| `src/components/storefront/ShareButtons.tsx` | New — social share icons |
| `src/components/storefront/TipTapRenderer.tsx` | New — rich description renderer |
| `src/hooks/useProductReviews.ts` | New — fetch/submit reviews |
| `src/pages/ShopStorefront.tsx` | Modify — add product page routing |
| `src/App.tsx` | Possibly add route |
| `src/main.tsx` | Add DOM stability patch |

