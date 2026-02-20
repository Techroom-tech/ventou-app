
# Mandatory Behavioral Corrections — Appearance Settings

## Full Audit Results

After reading all 484 lines of `ShopStorefront.tsx` and all 1104 lines of `SettingsApparence.tsx`, here is the exact status of every controlled setting:

### Dead controls confirmed (not read in storefront):
| Control | Evidence | Decision |
|---|---|---|
| `banner_size` | Storefront: `h-48 md:h-64` hardcoded (line 229), `shop.banner_size` never read | **Remove entirely** |
| `badge_color` | Promo badges use `bg-destructive` hardcoded (line 366), `shop.badge_color` never read | **Remove** |
| `button_animation` | Button at lines 393–409 has no animation class logic | **Implement real CSS animation** |
| `product_card_style` | Product card uses `className="rounded-xl border bg-card overflow-hidden hover:shadow-lg"` hardcoded (line 346) | **Implement real conditional classes** |
| `global_radius` | Saved to DB, never applied in storefront | **Implement via CSS var injection** |
| `button_shadow` | Only used in local `CtaPreview` component (line 182–186), not on storefront buttons | **Implement on storefront buttons** |
| `products_per_row` | Grid is hardcoded `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` (lines 323, 334) | **Implement dynamic grid columns** |
| `products_sort_order` | Product query always orders by `created_at desc` (line 105) | **Implement dynamic query ordering** |
| `dark_mode_enabled` | Storefront root has no dark class logic, postMessage doesn't send dark mode | **Implement via postMessage + class** |
| Typography sliders | postMessage sends `--heading-font`, `--body-font` but NOT size/spacing/lineheight vars. Storefront elements use Tailwind hardcoded sizes | **Fix postMessage + storefront consumption** |

### Working controls (keep as-is):
- `primary_color` — used directly in storefront (price text, avatar bg, footer link)
- `button_color`, `button_text_color`, `button_radius` — correctly applied to buy buttons (lines 397–401)
- `cta_label` — correctly read at line 408
- `logo_url`, `banner_url`, `identity_display_mode` — correctly implemented
- `heading_font`, `body_font` — partially working (fonts load but size/spacing not propagated)
- `background_color`, `card_bg_color` — postMessage sets CSS var but storefront elements use Tailwind classes, not CSS vars

---

## Changes Required

### File 1: `src/pages/settings/SettingsApparence.tsx`

**A. Remove `banner_size` control** (lines 501–508)
Remove the "Taille d'affichage" block and its `SegmentedControl`. Remove `banner_size` from `AppearanceForm`, `DEFAULT_FORM`, and `handleSave`.

**B. Remove `badge_color` control** (lines 617–623)
Remove the `ColorRow` for "Badge promo". Remove `badge_color` from `AppearanceForm`, `DEFAULT_FORM`, `COLOR_DEFAULTS`, and `handleSave`. Also remove it from the accordion trigger color dot preview (line 561).

**C. Expand postMessage to include all typography and layout vars** (lines 288–310)
Current postMessage only sends 8 vars. Extend to send:
```ts
'--heading-font': form.heading_font,
'--body-font': form.body_font,
'--heading-size': form.title_size_px + 'px',
'--body-size': form.body_size_px + 'px',
'--letter-spacing': form.letter_spacing_px + 'px',
'--line-height': form.line_height_pct / 100 + '',
'--color-primary': form.primary_color,
'--color-secondary': form.secondary_color,
'--color-btn-bg': form.button_color,
'--color-btn-text': form.button_text_color,
'--color-bg': form.background_color,
'--color-card-bg': form.card_bg_color,
'--btn-radius': form.button_radius === 'Sharp' ? '4px' : form.button_radius === 'Pill' ? '999px' : '8px',
'--btn-shadow': form.button_shadow === 'Soft' ? '0 2px 8px rgba(0,0,0,0.15)' : form.button_shadow === 'Elevated' ? '0 4px 16px rgba(0,0,0,0.25)' : 'none',
'--global-radius': form.global_radius === 'Sharp' ? '4px' : form.global_radius === 'Rounded' ? '16px' : '8px',
'--btn-animation': form.button_animation,
'--dark-mode': form.dark_mode_enabled ? 'dark' : 'light',
'--card-style': form.product_card_style,
'--products-per-row': form.products_per_row,
'--products-sort': form.products_sort_order,
```

**D. Remove `banner_size` from `handleSave`**
Already noted above — also remove from the Supabase update call.

---

### File 2: `src/pages/ShopStorefront.tsx`

This file requires the most changes. Every dead control becomes a real one.

**A. Fix postMessage handler** (lines 63–82)
Expand the handler to apply all new CSS vars AND handle non-CSS-var changes (font, dark mode, grid, sort):

```ts
const handler = (e: MessageEvent) => {
  if (e.data?.type !== 'VENTOU_THEME_UPDATE') return;
  const root = document.documentElement;
  const vars = e.data.vars as Record<string, string>;
  
  // Apply all CSS custom properties
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
  
  // Background color directly on body
  if (vars['--color-bg']) document.body.style.backgroundColor = vars['--color-bg'];
  
  // Dark mode: toggle 'dark' class on <html>
  if (vars['--dark-mode']) {
    if (vars['--dark-mode'] === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
  }
  
  // Typography: dynamically load Google Fonts if needed
  if (vars['--heading-font'] || vars['--body-font']) {
    [vars['--heading-font'], vars['--body-font']].filter(Boolean).forEach(font => {
      if (font === 'Inter') return;
      const id = `gf-sf-${font.replace(/\s+/g, '-')}`;
      if (!document.getElementById(id)) {
        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font)}:wght@400;500;600;700&display=swap`;
        document.head.appendChild(link);
      }
    });
  }
  
  // Products per row: update CSS var used by grid
  // Products sort: trigger re-sort via state ref (cannot re-query without React state)
  // These are handled via CSS var injection approach below
};
```

**B. Fix product query to use `products_sort_order`** (lines 97–110)
Currently always orders by `created_at desc`. Change to dynamic ordering:

```ts
const { data: products } = useQuery({
  queryKey: ['storefront-products', shop?.id, shop?.products_sort_order],
  queryFn: async () => {
    let query = supabase.from('products').select('*')
      .eq('shop_id', shop!.id)
      .eq('is_active', true);
    
    const sort = (shop as any).products_sort_order ?? 'recent';
    if (sort === 'alpha') query = query.order('name', { ascending: true });
    else if (sort === 'price_asc') query = query.order('price', { ascending: true });
    else if (sort === 'price_desc') query = query.order('price', { ascending: false });
    else query = query.order('created_at', { ascending: false }); // recent + best_seller (no order_count column, fallback to recent)
    
    const { data, error } = await query;
    if (error) throw error;
    return data as Product[];
  },
  enabled: !!shop?.id,
});
```

**C. Fix product grid to use `products_per_row`** (lines 323, 334)
Replace hardcoded `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` with a dynamic grid style using inline CSS or dynamic class:

```tsx
const perRow = (shop as any).products_per_row ?? '3';
const gridStyle: React.CSSProperties = {
  display: 'grid',
  gap: '1rem',
  gridTemplateColumns: perRow === '1' ? '1fr' : perRow === '2' ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
};
// On small screens, always single column:
// Use CSS variable that the postMessage can update
```

Since we need responsive fallback AND live update via postMessage, the best approach: set `--products-per-row` CSS var via postMessage, and use it in the grid's `gridTemplateColumns` inline style with a media-query-aware pattern. The simplest working approach:

```tsx
// Compute from shop data (used on initial load and after save+reload)
const perRow = String((shop as any).products_per_row ?? '3');
const gridCols = perRow === '1' ? '1fr' : perRow === '2' ? 'repeat(2, minmax(0,1fr))' : 'repeat(3, minmax(0,1fr))';

// Use in JSX:
<div style={{ display: 'grid', gap: 16, gridTemplateColumns: `var(--products-grid-cols, ${gridCols})` }}>
```

And in postMessage handler: set `--products-grid-cols` based on `--products-per-row`.

**D. Fix button animation** (line 393–409)
Apply real CSS animation class to the buy button based on `shop.button_animation`. Add keyframe definitions to `index.css` and apply via className:

Add to `src/index.css`:
```css
@keyframes btn-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.04); opacity: 0.9; }
}
@keyframes btn-shine {
  0% { box-shadow: 0 0 0 0 rgba(255,255,255,0.4); }
  100% { box-shadow: 0 0 0 8px rgba(255,255,255,0); }
}
.btn-anim-pulse { animation: btn-pulse 1.5s ease-in-out infinite; }
.btn-anim-shine { animation: btn-shine 2s ease-in-out infinite; }
```

Apply in storefront:
```tsx
const btnAnimClass = shop.button_animation === 'Pulse' ? 'btn-anim-pulse' 
  : shop.button_animation === 'Shine' ? 'btn-anim-shine' : '';
<Button className={`w-full mt-3 gap-2 ${btnAnimClass}`} ... >
```

For live preview: postMessage sends `--btn-animation`, handler converts to class on existing buttons via DOM query. However, modifying className via JS on React-rendered elements is unreliable. Better: apply animation via CSS var: `animation: var(--btn-animation-value, none)`. Set `--btn-animation-value` via postMessage.

**E. Fix `product_card_style`** (line 346)
Replace hardcoded `hover:shadow-lg` with dynamic classes based on `shop.product_card_style`:

```tsx
const cardClass = shop.product_card_style === 'Border minimal' 
  ? 'rounded-xl border border-border/70 bg-card overflow-hidden cursor-pointer group'
  : shop.product_card_style === 'Flat'
  ? 'rounded-xl bg-muted/40 overflow-hidden cursor-pointer group'
  : 'rounded-xl border bg-card overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer group'; // Soft shadow (default)
```

For live postMessage: the handler sets `--card-style` var; use it via a CSS approach where we inject a `<style>` tag into the iframe's head based on card style value.

**F. Fix `global_radius`** (applied to cards)
Inject `--radius` override via postMessage: the handler maps `global_radius` string to px value and sets it. All Tailwind `rounded-xl`/`rounded-lg` elements use `--radius` via the theme system. Setting this CSS var on `:root` directly changes all radiuses.

```ts
// In postMessage handler:
const globalRadius = vars['--global-radius'];
if (globalRadius) root.style.setProperty('--radius', globalRadius); // overrides Tailwind theme
```

**G. Fix `button_shadow`** (line 393–409)
Apply shadow via inline style on storefront buy button, same as `button_color`:

```tsx
const ctaShadow = shop.button_shadow === 'Soft' ? '0 2px 8px rgba(0,0,0,0.15)'
  : shop.button_shadow === 'Elevated' ? '0 4px 16px rgba(0,0,0,0.25)' : 'none';

<Button style={{
  backgroundColor: ctaBg,
  color: ctaText,
  borderRadius: ctaRadius,
  boxShadow: ctaShadow,
}}>
```

For live postMessage: handler sets `--btn-shadow` and a `<style>` injection targets `[data-storefront-btn]` attribute placed on buy buttons.

**H. Fix `dark_mode_enabled`**
On initial load of the storefront, read `shop.dark_mode_enabled` and toggle the `dark` class:
```tsx
useEffect(() => {
  if ((shop as any).dark_mode_enabled) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}, [shop]);
```

For live postMessage: already handled in the expanded handler (section A above).

**I. Fix `background_color` and `card_bg_color` live update**
postMessage sends the CSS vars. Storefront consumes `--color-bg` → body background, `--color-card-bg` → product cards. Add `style={{ backgroundColor: 'var(--color-card-bg, transparent)' }}` to product card divs.

---

### File 3: `src/index.css`

Add button animation keyframes:
```css
@keyframes ventou-btn-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.04); }
}
@keyframes ventou-btn-shine {
  0% { box-shadow: inset 0 0 0 0 rgba(255,255,255,0.3); }
  60% { box-shadow: inset 100px 0 0 0 rgba(255,255,255,0); }
  100% { box-shadow: inset 0 0 0 0 rgba(255,255,255,0); }
}
.btn-anim-pulse { animation: ventou-btn-pulse 1.5s ease-in-out infinite; }
.btn-anim-shine { animation: ventou-btn-shine 2s linear infinite; }
```

---

## Summary of Changes

### `SettingsApparence.tsx` changes:
1. Remove `banner_size` from type, defaults, form init, save, and JSX (lines 501–508)
2. Remove `badge_color` from type, defaults, `COLOR_DEFAULTS`, form init, save, and JSX (lines 617–623)
3. Expand postMessage to send 19 vars including typography sizes, layout vars, dark mode signal, animation, card style, global radius

### `ShopStorefront.tsx` changes:
1. Expand postMessage listener (lines 63–82) to handle dark mode, Google Font loading, and all new CSS vars
2. Fix product query to apply `products_sort_order` to Supabase ordering (line 105)
3. Add `dark_mode_enabled` effect on mount (new `useEffect` after shop loads)
4. Replace hardcoded grid classes with dynamic `gridTemplateColumns` based on `products_per_row` (lines 323, 334)
5. Add `product_card_style` conditional classes to product card (line 346)
6. Add `button_shadow` to buy button inline styles (line 397–401)
7. Add `button_animation` class to buy button (line 393)
8. Add `data-card-bg` attribute to product cards for CSS var targeting (line 344)

### `src/index.css` changes:
1. Add `@keyframes ventou-btn-pulse` and `@keyframes ventou-btn-shine`
2. Add `.btn-anim-pulse` and `.btn-anim-shine` utility classes

---

## What is NOT changed
- The entire visual design of `SettingsApparence.tsx` (colors, spacing, typography tokens, layout — all preserved)
- `ShopAssetUploader.tsx` — no changes
- `AdvancedColorPicker.tsx` — no changes
- All other pages, hooks, auth, orders, products — untouched
- No new DB migrations needed — all columns already exist
