
# Product Card Layout & Responsive Grid Refactor

## Current State Audit

### Critical Issues Found:

**1. Grid is not responsive (most critical bug)**
The grid at line 451 uses:
```tsx
style={{ display: 'grid', gap: 16, gridTemplateColumns: gridCols }}
```
Where `gridCols` is computed from `products_per_row` with no breakpoints. If the seller sets `products_per_row = '3'`, mobile shows 3 columns — broken layout.

**2. Product card title is visually weak**
Line 501: `className="font-medium text-sm line-clamp-2 mb-2"` — `text-sm` (14px) is too small and `font-medium` (500) is too light.

**3. No rating system**
The spec requires a star rating block. Currently absent. Since there is no `rating` or `review_count` field in the `Product` type, we render a **static visual block** (⭐⭐⭐⭐☆ — 0 avis) that looks like social proof without requiring new DB columns — consistent layout regardless.

**4. CTA button can overflow**
`size="sm"` with no `white-space: normal` or `text-align: center` — on narrow columns the text can clip or overflow on mobile.

**5. Price structure lacks hierarchy**
Old price and new price are in the same `flex` row with `gap-2` — no vertical stacking, no size differentiation.

**6. No responsive CSS for the grid**
The responsive grid spec (2 cols mobile, 3 tablet, 4 desktop) cannot be achieved with a static inline `gridTemplateColumns`. It requires either CSS classes with Tailwind breakpoints or a CSS utility class injected into `index.css`.

---

## Architecture Decision: How to Implement the Responsive Grid

The seller controls `products_per_row` (1, 2, or 3). The spec says the grid must also adapt to screen size automatically.

**The approach:** Define named CSS classes in `index.css` that combine the seller's preference with automatic responsive behavior:

```css
/* Default: 3 per row (seller default) */
.product-grid { display: grid; gap: 16px; grid-template-columns: repeat(2, 1fr); }
@media (min-width: 640px) { .product-grid { grid-template-columns: repeat(3, 1fr); } }
@media (min-width: 1024px) { .product-grid { grid-template-columns: repeat(4, 1fr); } }

/* Seller sets 2 per row */
.product-grid-2 { display: grid; gap: 16px; grid-template-columns: repeat(2, 1fr); }
@media (min-width: 1024px) { .product-grid-2 { grid-template-columns: repeat(3, 1fr); } }

/* Seller sets 1 per row (large) */
.product-grid-1 { display: grid; gap: 16px; grid-template-columns: 1fr; }
```

In the storefront: replace the static inline style with the matching class name. The postMessage handler in the `SettingsApparence.tsx` updates `--products-per-row` var but the live preview also needs to update the grid class. We handle this by keeping the `data-products-grid` attribute + updating `gridTemplateColumns` via postMessage for live preview, but the CSS classes govern the real storefront's responsive behavior.

**For live preview in the iframe**: The postMessage handler already sets `gridTemplateColumns` via DOM query on `[data-products-grid]`. We keep this for instant preview. For the real storefront (after save), the CSS class controls responsiveness.

---

## Files to Modify

### 1. `src/index.css`
Add responsive grid classes + product card CSS utilities:

```css
/* ── Responsive product grid ── */
.product-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(2, 1fr); /* mobile default: always 2 */
}
@media (min-width: 640px) {
  .product-grid { grid-template-columns: repeat(3, 1fr); }
}
@media (min-width: 1024px) {
  .product-grid { grid-template-columns: repeat(4, 1fr); }
}

/* Seller prefers 2/row → cap at 3 on desktop */
.product-grid-2 {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(2, 1fr);
}
@media (min-width: 1024px) {
  .product-grid-2 { grid-template-columns: repeat(3, 1fr); }
}

/* Seller prefers 1/row (large layout) */
.product-grid-1 {
  display: grid;
  gap: 16px;
  grid-template-columns: 1fr;
}

/* ── Product title 2-line clamp ── */
.product-title {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
  color: inherit;
}
@media (min-width: 1024px) {
  .product-title { font-size: 16px; }
}

/* ── Product CTA button ── */
.product-cta {
  font-size: 13px;
  padding: 10px 12px;
  white-space: normal;
  text-align: center;
  min-height: 44px;
  line-height: 1.3;
}
```

### 2. `src/pages/ShopStorefront.tsx`

**A. Grid className logic (replaces inline style):**
```tsx
// Replace:
const gridCols = perRow === '1' ? '1fr' : perRow === '2' ? 'repeat(2, minmax(0,1fr))' : 'repeat(3, minmax(0,1fr))';

// With:
const gridClassName = perRow === '1' ? 'product-grid-1' : perRow === '2' ? 'product-grid-2' : 'product-grid';
```

For the grid `<div>`:
```tsx
// Replace:
<div data-products-grid style={{ display: 'grid', gap: 16, gridTemplateColumns: gridCols }}>

// With:
<div data-products-grid className={gridClassName}>
```

The postMessage handler still overrides `gridTemplateColumns` inline for live preview — this works because inline style takes precedence over class. No change needed in the postMessage handler.

**B. Product card structure — full rebuild of the card body (lines 461–533):**

New card structure:
```tsx
<div key={product.id} data-card-bg className={cardClass} onClick={...}>
  {/* Image — aspect ratio 4/3 */}
  <div className="aspect-[4/3] bg-muted relative overflow-hidden">
    {/* image or placeholder */}
    {/* Promo badge — top left */}
    {hasPromo && (
      <Badge className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-xs font-semibold">
        -{discountPercent}%
      </Badge>
    )}
    {/* Low stock badge — top right */}
    {isLowStock && !isOutOfStock && (
      <Badge className="absolute top-2 right-2 bg-destructive/80 text-destructive-foreground text-xs">
        {t('storefront.stockLow', { count: product.stock_quantity })}
      </Badge>
    )}
    {/* Out of stock overlay */}
    {isOutOfStock && (
      <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
        <Badge variant="secondary">{t('storefront.outOfStock')}</Badge>
      </div>
    )}
  </div>

  {/* Card body */}
  <div className="p-4 space-y-2">
    {/* Title — 2-line clamp */}
    <h3 className="product-title">{product.name}</h3>

    {/* Rating block — static visual */}
    <div className="flex items-center gap-1.5 mt-0">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4].map(i => (
          <svg key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
        <svg className="w-3.5 h-3.5 fill-gray-200 text-gray-200 dark:fill-gray-600" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      </div>
      <span className="text-[12px] text-[#6B7280]">0 avis</span>
    </div>

    {/* Price structure — stacked */}
    <div className="space-y-0.5">
      {hasPromo && (
        <p className="text-[13px] text-[#9CA3AF] line-through leading-none">
          {formatCurrency(product.compare_at_price!, shop.currency ?? country.currency)}
        </p>
      )}
      <p className="text-[16px] font-semibold leading-none" style={{ color: primaryColor }}>
        {formatCurrency(product.price, shop.currency ?? country.currency)}
      </p>
    </div>

    {/* CTA button */}
    <Button
      data-storefront-btn
      className={`product-cta w-full gap-1.5 ${btnAnimClass}`}
      disabled={isOutOfStock}
      style={{
        backgroundColor: isOutOfStock ? undefined : ctaBg,
        color: isOutOfStock ? undefined : ctaText,
        borderRadius: ctaRadius,
        boxShadow: isOutOfStock ? undefined : ctaShadow,
        width: (shop as any).button_width === 'Fit content' ? 'auto' : '100%',
      }}
      onClick={e => {
        e.stopPropagation();
        addToCart(product);
      }}
    >
      <ShoppingCart className="h-3.5 w-3.5 shrink-0" />
      {shop.cta_label || t('storefront.addToCart')}
    </Button>
  </div>
</div>
```

**Key changes in card body:**
- Remove `size="sm"` from `<Button>` — size handled by `.product-cta` CSS class
- Remove `mt-3` from button — handled by `space-y-2` on parent div
- Remove `flex items-center gap-2` price row — replaced by vertical `space-y-0.5`
- Add rating block (4 filled stars + 1 empty, "0 avis") between title and price
- Title: `className="product-title"` (CSS class with font-weight 600, 15–16px, 2-line clamp)

**C. Also update skeleton grid:**
Line 432–442 (skeleton loading state) also uses the old inline style. Update to use same `gridClassName` class.

**D. postMessage handler update (line 133–136):**
The handler updates `gridTemplateColumns` inline on `[data-products-grid]` — this overrides the class for live preview, which is correct behavior. The mapping needs to reflect the new responsive grid intent:
```ts
if (vars['--products-grid-cols']) {
  document.querySelectorAll<HTMLElement>('[data-products-grid]').forEach(el => {
    el.style.gridTemplateColumns = vars['--products-grid-cols'];
  });
}
```
This stays unchanged — it works correctly for live preview override.

---

## What is NOT Changed

- `SettingsApparence.tsx` — no changes. The `products_per_row` selector (1/2/3) stays. The postMessage logic for grid preview stays.
- `AdvancedColorPicker.tsx` — no changes
- `ShopAssetUploader.tsx` — no changes
- All other pages, auth, orders, dashboard — untouched
- No DB migrations — no new columns needed (rating is static UI)
- The `Product` type — no changes

---

## Summary

### `src/index.css` — Add:
1. `.product-grid`, `.product-grid-2`, `.product-grid-1` with proper responsive media queries (2 cols mobile → 3 tablet → 4 desktop)
2. `.product-title` — 15/16px, font-weight 600, 2-line clamp
3. `.product-cta` — 13px, 10px/12px padding, white-space normal, min-height 44px

### `src/pages/ShopStorefront.tsx` — Targeted edits:
1. Replace `gridCols` computation with `gridClassName` CSS class name selection
2. Replace `style={{ display: 'grid', gap: 16, gridTemplateColumns: gridCols }}` with `className={gridClassName}` on both grid divs (loading skeleton + products)
3. Replace card body (lines ~500–533) with rebuilt structure:
   - `h3` with `product-title` class
   - Static rating block (4 filled + 1 empty star, "0 avis")
   - Vertical price stack (`space-y-0.5`, old price 13px gray strikethrough, new price 16px semibold)
   - Button with `product-cta` class, remove `size="sm"`, remove `mt-3`
