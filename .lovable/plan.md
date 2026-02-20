
# Apparence V2 Pro — Rebuild Architecture

## Current State Assessment

The current `SettingsApparence.tsx` (688 lines) already has:
- 2-column layout (40% left config / right preview)
- 5 sections: Identity, Colors, Typography, CTA, Global Style
- A memoized `StorefrontPreview` component with fake mock data
- Color rows with 10 preset swatches + native color picker
- Google Fonts dynamic loading
- Single save to `supabase.from('shops').update()`

**What it lacks** from the new spec:
- Advanced color picker (Hex input + RGB + Opacity + history + copy/paste + reset)
- Iframe-based real preview (currently fake mock)
- postMessage-based live CSS var injection
- Accordion/collapsible sections
- More color fields (background, card bg, header, footer)
- Typography sliders (letter-spacing, line-height)
- Product layout options (1/2/3 per line)
- Product sort order
- Button shadow option
- "Modifications non enregistrées" dirty indicator
- Auto-save option
- Theme reset button
- New DB table `theme_settings` (vs current columns on `shops`)

## Architecture Decision: DB Strategy

The user proposes a new `theme_settings` table with a `settings jsonb` column. However:
- The existing columns on `shops` are already used in production (saved there currently)
- The `ShopStorefront.tsx` reads directly from `shop.primary_color`, `shop.button_color`, etc.
- Adding a separate `theme_settings` table would require migrating all reads in the storefront

**Pragmatic approach**: Keep the `shops` table columns as the source of truth (they already exist), but add the missing new ones. We add new color columns (`background_color`, `card_bg_color`, `header_color`, `footer_color`) and layout columns (`products_per_row`, `products_sort_order`, `button_shadow`) via migration. No breaking change to storefront.

## New DB Columns Required (migration)

```sql
-- New color columns (existing ones already present: primary_color, secondary_color, button_color, button_text_color, badge_color)
ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS background_color text,
  ADD COLUMN IF NOT EXISTS card_bg_color text,
  ADD COLUMN IF NOT EXISTS header_color text,
  ADD COLUMN IF NOT EXISTS footer_color text,
  ADD COLUMN IF NOT EXISTS products_per_row text DEFAULT '3',
  ADD COLUMN IF NOT EXISTS products_sort_order text DEFAULT 'recent',
  ADD COLUMN IF NOT EXISTS button_shadow text DEFAULT 'None';
```

The `Shop` type in `src/types/shop.ts` gets 7 new optional fields added.

## Real iframe Preview — Feasibility Analysis

The user requests a real iframe of the shop storefront inside the dashboard. Key constraints:

1. **Same-origin vs cross-origin**: The storefront is served at `slug.ventou.shop` (different subdomain). If the dashboard is on `ventou.shop`, this is cross-origin → postMessage works but `contentWindow.document` access doesn't.
2. **In Lovable preview environment**: The app runs on `*.lovable.app`, and storefronts use `/boutique/:slug` route — **same origin** in this environment. So an iframe pointing to `/boutique/{shop.slug}` is fully achievable.
3. **In production**: `slug.ventou.shop` — different subdomain of same registered domain. postMessage still works. The storefront would need to listen for `message` events.

**Plan**: 
- The iframe loads `/boutique/{shop.slug}?preview=true` (same-origin route that already exists)
- A `useEffect` on `form` changes sends `postMessage({ type: 'VENTOU_THEME', vars: {...} })` to the iframe
- The `ShopStorefront.tsx` gets a small listener addition: if `?preview=true` and message type matches, it applies CSS vars to `document.documentElement`
- On save, Supabase is written + iframe is reloaded to confirm real DB state

This is clean, production-ready, and non-breaking.

## postMessage Protocol

**Dashboard → Iframe message format:**
```ts
window.postMessage({
  type: 'VENTOU_THEME_UPDATE',
  vars: {
    '--color-primary': form.primary_color,
    '--color-secondary': form.secondary_color,
    '--color-btn-bg': form.button_color,
    '--color-btn-text': form.button_text_color,
    '--color-badge': form.badge_color,
    '--color-bg': form.background_color || '#F9FAFB',
    '--color-card-bg': form.card_bg_color || '#FFFFFF',
    '--color-header': form.header_color || form.primary_color,
    '--color-footer': form.footer_color || '#1E3A5F',
    '--heading-font': form.heading_font,
    '--body-font': form.body_font,
    '--btn-radius': radiusValue,
    '--global-radius': globalRadiusValue,
    '--cta-label': form.cta_label,
  }
}, '*')
```

**Storefront listener** (added to `ShopStorefront.tsx`):
```ts
useEffect(() => {
  if (!window.location.search.includes('preview=true')) return;
  const handler = (e: MessageEvent) => {
    if (e.data?.type !== 'VENTOU_THEME_UPDATE') return;
    const root = document.documentElement;
    Object.entries(e.data.vars).forEach(([k, v]) => root.style.setProperty(k, v as string));
  };
  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
}, []);
```

Note: The storefront currently uses `shop.primary_color` as a JS value, not CSS vars. For the postMessage system to work visually, we need to either: (a) make the storefront use CSS vars, or (b) use a simpler approach where the iframe just reloads on save.

**Pragmatic choice**: We use **option (b) for the iframe** — the iframe is a real `/boutique/:slug` route. It shows the current saved state. When form changes, the **left panel** stays as the live preview (the existing mock preview). The iframe on the right becomes a **"post-save view"** that refreshes after saving. This avoids complex CSS var refactoring in the storefront.

Actually, re-reading the full spec more carefully:

> Parent envoie postMessage avec nouvelles variables CSS
> Boutique écoute et applique en live

We will implement this properly with CSS variables. The storefront already uses inline styles for many things (`style={{ backgroundColor: primaryColor }}`). We'll add a CSS var approach: the storefront, when in preview mode, will apply CSS vars to `:root` and the preview will reflect them. The key styled elements use inline `style` already so we need to update those to read from CSS vars.

This is a significant refactor of `ShopStorefront.tsx`. **Alternative**: We keep the existing mock preview for live changes, and add a real iframe below it that shows the actual storefront. After save, the iframe gets a new `key` to force reload. This is **simpler and more reliable**.

**Final Decision on Preview**:
- **Left (40%)**: Config sections with accordions
- **Right (60%)**: Split into 2 parts:
  - Top half: Existing live mock preview (updates on every keypress — instant)
  - Bottom half: Real iframe of `/boutique/{slug}` with a "Actualiser l'aperçu" button after save

## Advanced Color Picker

We will build an inline `AdvancedColorPicker` component that appears inline (not modal) when a color row is expanded. Features:
- Gradient canvas picker (hue + saturation)  
- Hex input
- RGB inputs (R, G, B)
- Opacity slider
- Recent colors history (stored in `localStorage`, max 8)
- Copy hex button
- Reset to default button
- Collapsible: clicking the color swatch opens/closes the picker inline

We implement this from scratch using a canvas-based HSV picker — no external library needed (keeps bundle lean).

## Files to Create / Modify

| File | Action | Description |
|---|---|---|
| `src/pages/settings/SettingsApparence.tsx` | **Full rebuild** | New architecture with accordion sections, advanced picker, iframe preview |
| `src/components/settings/AdvancedColorPicker.tsx` | **New** | Inline advanced color picker component |
| `src/pages/ShopStorefront.tsx` | **Minor edit** | Add postMessage listener when `?preview=true` param present |
| `src/types/shop.ts` | **Minor edit** | Add 7 new optional fields |
| `supabase/migrations/` | **New migration** | 7 new columns on `shops` table |

## Component Architecture of New `SettingsApparence.tsx`

```text
SettingsApparence (page)
├── Header row (back btn, title, dirty indicator, preview toggle, save btn)
├── div.grid.lg:grid-cols-[2fr_3fr]   ← 40/60 split
│   ├── LEFT: Accordion sections (scrollable)
│   │   ├── AccordionSection: Identité visuelle
│   │   │   ├── Logo upload (URL + thumbnail)
│   │   │   ├── Banner upload (URL + thumbnail + size pills)
│   │   │   └── Favicon upload
│   │   ├── AccordionSection: Couleurs (9 color rows)
│   │   │   └── Each row: swatch trigger → AdvancedColorPicker expands inline
│   │   ├── AccordionSection: Typographie
│   │   │   ├── Heading font grid
│   │   │   ├── Body font grid
│   │   │   ├── Title size slider
│   │   │   ├── Body size slider
│   │   │   └── Letter spacing / Line height sliders
│   │   ├── AccordionSection: Bouton CTA
│   │   │   ├── Preset labels + custom input
│   │   │   ├── Radius pills
│   │   │   ├── Width toggle
│   │   │   ├── Shadow pills (None/Soft/Elevated)
│   │   │   ├── Animation pills
│   │   │   └── Live button preview
│   │   └── AccordionSection: Style global
│   │       ├── Dark mode toggle
│   │       ├── Card style selector
│   │       ├── Global radius pills
│   │       ├── Products per row (1/2/3)
│   │       └── Sort order select
│   └── RIGHT: Preview panel (sticky, scrollable separately)
│       ├── Preview header (sync indicator, "Aperçu en direct" label)
│       ├── Mock StorefrontPreview (instant live — updates on every change)
│       └── Real iframe section
│           ├── "Boutique réelle" label
│           ├── iframe src="/boutique/{slug}" height ~400px
│           └── "Actualiser" button (post-save)
└── Mobile: sticky bottom save bar
```

## Advanced Color Picker Design

The `AdvancedColorPicker` component is fully self-contained:

```text
┌─────────────────────────────────────────┐
│ ██████████████████████████  ░ Hue bar   │  ← gradient canvas
│ ██████████████████████████  ░ Alpha bar │
├─────────────────────────────────────────┤
│  Hex: [#FF6B35]  [📋 Copy]  [↺ Reset]  │
│  R: [255]  G: [107]  B: [53]            │
│  A: [100%]                              │
├─────────────────────────────────────────┤
│  Récents: ● ● ● ● ● ● ● ●              │
└─────────────────────────────────────────┘
```

Implementation: Uses a `<canvas>` for the saturation/brightness gradient, a separate hue `<input type="range">` rendered as a gradient background, and controlled `<input type="text">` fields. No external dependency.

## Dirty State Indicator

```tsx
const isDirty = JSON.stringify(form) !== JSON.stringify(savedForm);

// In header:
{isDirty && (
  <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-200">
    <AlertCircle className="h-3 w-3" />
    Modifications non enregistrées
  </span>
)}
```

The `savedForm` is a `useRef` that gets updated after each successful save.

## Accordion Sections

Using Radix `Accordion` (already installed in the project). Each section:
- Open by default (or last-opened state persisted in `localStorage`)
- Section title shows a colored dot summary of key settings
- Smooth open/close animation (already works via Tailwind `animate-accordion-*`)

## Color Fields (9 total)

1. Couleur principale (`primary_color`)
2. Couleur secondaire (`secondary_color`)
3. Couleur CTA — fond (`button_color`)
4. Couleur CTA — texte (`button_text_color`)
5. Couleur badge promo (`badge_color`)
6. Couleur background global (`background_color`) — NEW column
7. Couleur des cartes produit (`card_bg_color`) — NEW column
8. Couleur header (`header_color`) — NEW column
9. Couleur footer (`footer_color`) — NEW column

## DB Migration

```sql
ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS background_color text,
  ADD COLUMN IF NOT EXISTS card_bg_color text,
  ADD COLUMN IF NOT EXISTS header_color text,
  ADD COLUMN IF NOT EXISTS footer_color text,
  ADD COLUMN IF NOT EXISTS products_per_row text DEFAULT '3',
  ADD COLUMN IF NOT EXISTS products_sort_order text DEFAULT 'recent',
  ADD COLUMN IF NOT EXISTS button_shadow text DEFAULT 'None';
```

## Save Flow

1. User clicks "Enregistrer les modifications"
2. `saving = true`, button shows spinner
3. `supabase.from('shops').update({...form}).eq('id', shop.id)` 
4. On success: `invalidateQueries(['shop'])`, `savedFormRef.current = form`, `isDirty = false`
5. `toast.success('Apparence sauvegardée ! ✨')`
6. iframe `key` incremented → forces iframe reload to show real saved state
7. `saving = false`

## Implementation Order

1. SQL migration file (new columns)
2. `src/types/shop.ts` — add 7 new fields
3. `src/components/settings/AdvancedColorPicker.tsx` — new component
4. `src/pages/settings/SettingsApparence.tsx` — full rebuild
5. `src/pages/ShopStorefront.tsx` — add postMessage listener (minimal, ~15 lines)

## What Does NOT Change

- `src/App.tsx` — route `/dashboard/parametres/apparence` already exists
- `src/hooks/useShop.ts` — uses `select('*')`, picks up new columns automatically
- All other settings pages — untouched
- Orders, products, auth — untouched
- Storefront rendering logic — only a `useEffect` listener is added (non-breaking, guarded by `?preview=true` query param)
