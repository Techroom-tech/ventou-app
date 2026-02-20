
# Appearance Settings — Functional Cleanup & Behavior Implementation

## Complete Audit Summary

After reading all 1095 lines of `SettingsApparence.tsx` and all 569 lines of `ShopStorefront.tsx`, here is the definitive status:

### DEAD CONTROLS (remove or fix):

| Control | Status | Decision |
|---|---|---|
| `secondary_color` | postMessage sends `--color-secondary`, nothing in storefront reads it | **REMOVE** |
| `background_color` | Body bg set, but `div.min-h-screen bg-background` overrides with Tailwind class | **FIX** (apply inline style to root div) or **REMOVE** |
| Title size / Body size / Espacement / Hauteur ligne sliders | postMessage sends vars but storefront uses hardcoded Tailwind `text-sm`, `text-lg` — nothing reads the CSS vars | **REMOVE all 4 sliders** |
| `heading_font` / `body_font` | Google Font LOADS, `--heading-font` var is set on `:root`, but storefront elements use `font-sans` (Tailwind) not `var(--heading-font)` | **FIX** (apply font via inline style on storefront root elements) |

### WORKING CONTROLS (keep as-is):

| Control | Mechanism | Status |
|---|---|---|
| `primary_color` | Inline style on price text, avatar, footer link | ✅ |
| `button_color`, `button_text_color` | Inline style on `data-storefront-btn` | ✅ |
| `button_radius` | Computed `ctaRadius`, inline style | ✅ |
| `button_shadow` | Computed `ctaShadow`, inline style | ✅ |
| `button_animation` | CSS classes `btn-anim-pulse` / `btn-anim-shine` | ✅ |
| `button_width` | Inline style `width: '100%' / 'auto'` | ✅ |
| `cta_label` | `shop.cta_label` on button text | ✅ |
| `logo_url`, `banner_url` | Direct `img src` | ✅ |
| `identity_display_mode` | `showLogo` / `showName` conditionals | ✅ |
| `products_per_row` | `data-products-grid` DOM query on postMessage + initial computed `gridCols` | ✅ |
| `products_sort_order` | Dynamic Supabase `query.order()` call | ✅ |
| `dark_mode_enabled` | `documentElement.classList.toggle('dark')` | ✅ |
| `product_card_style` | `cardClass` conditional string | ✅ |
| `global_radius` | postMessage sets `--radius` on `:root` | ✅ |
| `card_bg_color` | `querySelectorAll('[data-card-bg]')` direct DOM mutation | ✅ |

---

## Changes Required

### File 1: `src/pages/settings/SettingsApparence.tsx`

**A. Remove from `AppearanceForm` type, `DEFAULT_FORM`, `COLOR_DEFAULTS`, form init, save, and JSX:**
- `secondary_color` — dead, nothing reads `--color-secondary` in storefront
- `background_color` — inconsistently applied, creates confusion
- `title_size_px` — slider has no effect on live store
- `body_size_px` — slider has no effect on live store  
- `letter_spacing_px` — slider has no effect on live store
- `line_height_pct` — slider has no effect on live store

**B. Remove from postMessage vars:**
- `--color-secondary`, `--color-bg`, `--heading-size`, `--body-size`, `--letter-spacing`, `--line-height`

**C. Simplify `COLOR_DEFAULTS` to only:**
```ts
const COLOR_DEFAULTS: Record<string, string> = {
  primary_color: '#1E3A5F',
  button_color: '#FF6B35',
  button_text_color: '#FFFFFF',
  card_bg_color: '#FFFFFF',
};
```

**D. Remove typography sliders block (lines 656–702):**
The entire `grid grid-cols-2 gap-4` div with 4 sliders and the live preview block (which referenced the removed fields) is deleted. Keep only the 2 font `Select` dropdowns.

**E. Keep font dropdowns — replace live preview content:**
The live preview block now only shows font rendering (no size/spacing), using `form.heading_font` and `form.body_font` at fixed sizes:
```tsx
<div className="rounded-lg border bg-muted/20 p-4 space-y-1.5 mt-4">
  <p style={{ fontFamily: `${form.heading_font}, sans-serif`, fontSize: 16, fontWeight: 600, margin: 0 }}>
    Titre de votre boutique
  </p>
  <p style={{ fontFamily: `${form.body_font}, sans-serif`, fontSize: 13, color: '#6B7280', margin: 0 }}>
    Texte de description du produit.
  </p>
</div>
```

**F. Update Design accordion trigger color dots:**
Remove `card_bg_color` from the 3-dot color preview in the trigger since we're removing `background_color`. Show: `primary_color`, `button_color`, `button_text_color`.

**G. Remove orange hardcoded styles:**
The header in `SettingsApparence.tsx` has no hardcoded orange. The save button uses `#10B981` (green) — keep this. No other hardcoded orange detected in this file.

**H. Update `handleSave` to not persist removed fields:**
Remove from the Supabase update call: `secondary_color`, `background_color`, `title_size_px`, `body_size_px`, `letter_spacing_px`, `line_height_pct`.

**I. Preview layout refinement:**
The current preview panel uses `p-4` padding around the iframe. Reduce to `p-3` to reclaim space. The mobile phone frame is `width:390, height:700` — this is reasonable. Keep as-is. No major layout change needed here — the structure is already a proper sticky non-scrolling 60% right panel.

---

### File 2: `src/pages/ShopStorefront.tsx`

**A. Fix font application — make fonts actually render in the storefront:**

Currently fonts LOAD via Google Fonts but are never APPLIED to DOM elements. The storefront uses Tailwind's `font-sans` implicitly. Fix by applying CSS vars via `document.documentElement.style` AND adding inline styles to the key text elements.

The cleanest approach: in the postMessage handler, when a font arrives, set a CSS var AND inject a `<style>` tag that overrides `body { font-family: ... }` and heading elements:

```ts
// In postMessage handler, after setting CSS vars:
if (vars['--heading-font'] || vars['--body-font']) {
  let style = document.getElementById('ventou-font-overrides') as HTMLStyleElement;
  if (!style) {
    style = document.createElement('style');
    style.id = 'ventou-font-overrides';
    document.head.appendChild(style);
  }
  const hFont = vars['--heading-font'] ?? document.documentElement.style.getPropertyValue('--heading-font');
  const bFont = vars['--body-font'] ?? document.documentElement.style.getPropertyValue('--body-font');
  style.textContent = `
    body { font-family: '${bFont}', sans-serif !important; }
    h1, h2, h3, h4, h5, h6 { font-family: '${hFont}', sans-serif !important; }
  `;
}
```

**B. Apply font on initial load (from `shop` data):**
Add a `useEffect` that runs when `shop` loads to set the fonts from `shop.heading_font` and `shop.body_font`:

```tsx
useEffect(() => {
  if (!shop) return;
  const hFont = shop.heading_font ?? 'Inter';
  const bFont = shop.body_font ?? 'Inter';
  // Load fonts
  [hFont, bFont].filter(f => f && f !== 'Inter').forEach(font => {
    const id = `gf-sf-${font!.replace(/\s+/g, '-')}`;
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id; link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font!)}:wght@400;500;600;700&display=swap`;
      document.head.appendChild(link);
    }
  });
  // Apply via style injection
  let style = document.getElementById('ventou-font-overrides') as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = 'ventou-font-overrides';
    document.head.appendChild(style);
  }
  style.textContent = `
    body { font-family: '${bFont}', sans-serif !important; }
    h1, h2, h3, h4, h5, h6 { font-family: '${hFont}', sans-serif !important; }
  `;
}, [shop]);
```

**C. Remove `--color-bg` / `--color-secondary` postMessage handling from the handler:**
Since we remove those settings from the sender, clean up the handler in `ShopStorefront.tsx` to remove the body background mutation (`document.body.style.backgroundColor`) to prevent leftover code that does nothing.

**D. NO changes to:**
- Product grid logic (already correct)
- Sort order logic (already correct)  
- Dark mode toggle (already correct)
- Button styles/animation (already correct)
- Card styles (already correct)

---

### File 3: `src/types/shop.ts`

Remove the `background_color` reference from consideration in the type — but `background_color`, `secondary_color`, `header_color`, `footer_color` can stay in the type since they're legacy DB columns that still exist in the DB. The type file doesn't need to change (extra DB columns in the type don't cause harm, and removing them could break other code that imports the type). No changes to `shop.ts`.

---

### File 4: `src/data/mockData.ts`

Remove `secondary_color`, `background_color`, `title_size_px`, `body_size_px`, `letter_spacing_px`, `line_height_pct` from mock data defaults. Quick cleanup.

---

## Summary of All Changes

### `SettingsApparence.tsx` — 9 targeted changes:
1. Remove `secondary_color` from `AppearanceForm`, `DEFAULT_FORM`, `COLOR_DEFAULTS`, form init (`useEffect`), `handleSave`, postMessage vars, and JSX (`ColorRow`)
2. Remove `background_color` from same 6 locations
3. Remove `title_size_px`, `body_size_px`, `letter_spacing_px`, `line_height_pct` from `AppearanceForm`, `DEFAULT_FORM`, form init, `handleSave`, postMessage vars — 4 fields × 5 locations each
4. Delete the 4-slider grid block (lines 656–672) entirely
5. Update the live typography preview to fixed-size rendering only
6. Update the Design accordion trigger to show 3 relevant color dots: `primary_color`, `button_color`, `button_text_color`
7. Remove `--color-secondary`, `--color-bg`, `--heading-size`, `--body-size`, `--letter-spacing`, `--line-height` from the postMessage vars object
8. Keep the font Select dropdowns and their Google Font loading — they're correct
9. `CtaPreview` component: remove `letterSpacing` and `fontFamily` references to the now-removed fields (keep other styles)

### `ShopStorefront.tsx` — 2 targeted changes:
1. Add `useEffect` for font application on initial shop load (inject `<style id="ventou-font-overrides">`)
2. In postMessage handler: add `<style>` injection block for font vars (alongside existing Google Font link injection). Remove `body.style.backgroundColor` mutation.

### `src/data/mockData.ts` — 1 cleanup:
Remove removed fields from mock defaults.

---

## What is NOT Changed

- UI design, layout, spacing, card styles — fully preserved
- `AdvancedColorPicker.tsx` — no changes
- `ShopAssetUploader.tsx` — no changes
- Accordion structure (4 sections remain: Identity, Design, Layout & CTA, Style global)
- All other working settings (CTA, grid, dark mode, card style, etc.)
- No DB migrations needed — removing these settings from the UI doesn't require dropping columns
- All other pages — untouched

---

## Result After Changes

Remaining controls in the form:

**Identité visuelle:** Logo, Banner, Identity display mode (3 radio options)

**Design:**
- Colors (4): Primary, CTA background, CTA text, Card background  
- Typography (2): Heading font dropdown, Body font dropdown + preview block

**Layout & CTA:**
- Product grid (1/2/3 per row visual selector)
- Display order dropdown (5 options)
- CTA text (5 presets + Personnalisé with input)
- CTA style (Shape: Sharp/Medium/Pill, Width: Fit/Full, Animation: None/Pulse/Shine)
- CTA preview

**Style global:**
- Dark mode toggle
- Card style (Soft shadow / Border / Flat)
- Global radius (Sharp/Medium/Rounded)
- Button shadow (None/Soft/Elevated)

Every remaining control either already works or will be fixed to work. Zero dead controls remaining.
