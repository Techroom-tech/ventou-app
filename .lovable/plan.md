
# Premium Appearance Settings — Full Structural Rebuild

## Audit: What Currently Exists vs. What the Spec Requires

### Current issues in `SettingsApparence.tsx` (986 lines):

**Layout issues:**
- The current layout uses `fixed inset-0` with a proper split — this part is correct
- But the **iframe is rendered twice** (lines 937–944 and 962–969) — once for desktop mode, once for mobile. Both use `ref={iframeRef}` which means only the second one actually gets the ref. The postMessage therefore never fires reliably in mobile device mode
- The `isMobile` check (line 867) shows/hides the entire preview panel but doesn't render a mobile-first layout properly for small screens — on mobile the preview is completely hidden

**Color settings issues (per the spec):**
- `header_color` and `footer_color` are shown as configurable but the storefront (`ShopStorefront.tsx`) **does not use these values** — the header uses `bg-card/95` (Tailwind), the footer uses `border-t` with no color. These settings are non-functional
- The spec says: "Remove Header color setting, Footer color setting, any setting that does not produce a real visible change"

**Logo rendering issue (per the spec):**
- The storefront renders logo **twice**: once in the header (line 158–163) as a 36×36 circle, and again in the "Shop Info" block (line 220–225) as an 80×80 square. The spec says this must stop — add a single "Identity display mode" control
- There is no `identity_display_mode` field in the DB or form currently

**Settings that ARE connected to real store rendering:**
- `primary_color` → used directly at line 148 as `primaryColor`, applied to price text (line 379), footer link (line 425), button backgrounds
- `banner_url` → used at lines 209–213 in the banner section
- `logo_url` → used at lines 158–163 and 220–225
- `button_color`, `button_text_color`, `cta_label`, `button_radius`, `button_animation` → NOT currently used in the storefront (storefront uses default `<Button>` from shadcn)
- `background_color`, `card_bg_color`, `badge_color`, `secondary_color` → NOT used in storefront currently

**What this means for the plan:** The postMessage CSS vars approach is the right strategy for live preview, but the real storefront also needs to be updated to consume CSS variables so that changes actually take effect in the public store after save. Currently, saving any color other than `primary_color` does nothing visible in the live store.

---

## Architecture Decision

### 1. Which settings to KEEP (real effect)
Based on the storefront code analysis:

| Setting | Keeps/Removes | Reason |
|---|---|---|
| `primary_color` | **KEEP** | Used directly for price text, avatar bg, links |
| `secondary_color` | **KEEP** | Will wire up for badge/accent |
| `background_color` | **KEEP** | Will apply via CSS var to `bg-background` equivalent |
| `card_bg_color` | **KEEP** | Product cards use `bg-card` |
| `button_color` (CTA bg) | **KEEP** | Will apply to storefront buy buttons |
| `button_text_color` (CTA text) | **KEEP** | Same |
| `badge_color` | **KEEP** | Promo badge color |
| `header_color` | **REMOVE** | Storefront header uses hardcoded `bg-card/95`, never reads this value |
| `footer_color` | **REMOVE** | Footer has no color property referencing this |
| `favicon_url` | **REMOVE FROM IDENTITY SECTION** | Per spec |
| Identity display mode | **ADD NEW** | Controls logo/name rendering in storefront |

### 2. New DB field needed: `identity_display_mode`
A new column on `shops` table: `identity_display_mode text DEFAULT 'logo-name'`

Values: `'logo-only'` | `'name-only'` | `'logo-name'`

This needs a migration + type update + storefront update.

### 3. The iframe duplication bug — fix
Currently the JSX renders two `<iframe ref={iframeRef}>` elements in different conditional branches. The ref only attaches to one of them. Fix: use a single `<iframe>` element and control its container's CSS, not conditionally render two iframes.

### 4. Typography fields not in DB
`title_size`, `body_size`, `letter_spacing`, `line_height` currently default to hardcoded values and are NOT saved to the DB (the `handleSave` function at lines 357–395 does NOT include these fields). This must be fixed.

### 5. Color picker refinement
The `AdvancedColorPicker` component is already well-built. The `ColorRow` wrapper is clean. No changes needed to these components.

---

## Files to Modify

| File | Change |
|---|---|
| `src/pages/settings/SettingsApparence.tsx` | **Full rewrite** — clean design system, remove header/footer color, add identity display mode, fix iframe duplication, add typography DB save, remove favicon from identity |
| `src/types/shop.ts` | Add `identity_display_mode: string \| null` field |
| `src/pages/ShopStorefront.tsx` | Add identity display mode logic (hide duplicate logo), consume `primary_color` for buttons, apply CSS vars from postMessage for real live effect |
| `supabase/migrations/` | Add `identity_display_mode` column + `title_size numeric`, `body_size numeric`, `letter_spacing numeric`, `line_height numeric` columns |

---

## Design System Implementation

### Typography tokens applied:
```css
/* Page title */ font-size: 20px, font-weight: 600
/* Section header */ font-size: 14px, font-weight: 500
/* Label */ font-size: 12px, font-weight: 500
/* Body */ font-size: 13px, font-weight: 400
/* Helper */ font-size: 12px, font-weight: 400
/* Button */ font-size: 13px, font-weight: 500
```

### Color tokens:
```css
Primary text: #1F2937 (= foreground in dark mode safe)
Secondary text: #6B7280 (= muted-foreground)
Disabled: #9CA3AF
Border: #E6E8EB (≈ border in theme)
Divider: #EEF0F2
```

### Spacing — strict 8px grid:
- Card internal padding: `p-4` (16px)
- Between cards: `space-y-3` (12px) → adjusted to `space-y-4` (16px)
- Between sections within card: `space-y-6` (24px)
- Between label and control: `space-y-2` (8px)

### Border radius:
- Inputs: `rounded-lg` (8px)
- Buttons: `rounded-lg` (8px)
- Cards: `rounded-xl` (12px)
- Preview container: `rounded-2xl` (16px)
- Pills: `rounded-full` (999px)

---

## Header Layout (64px fixed)

```
┌───────────────────────────────────────────────────────────────────────────┐
│  [←]  Appearance          ● Unsaved changes      [Reset]  [Save]          │
│  h-16 bg-white border-b                          ghost   solid green      │
└───────────────────────────────────────────────────────────────────────────┘
```

- Back arrow: `size="icon" variant="ghost"` 36px
- Title: `text-[20px] font-semibold text-[#1F2937]`
- Dirty badge: small orange dot + `text-[12px] text-[#B45309]` "Unsaved changes"
- Reset: `variant="ghost"` h-9, border, `text-[13px]`
- Save: solid, green (`bg-[#10B981]`), h-9, `rounded-lg`, `text-[13px] font-medium`

---

## Left Panel — Config (560px fixed width, not %, for precision)

Background: `bg-[#F6F8FA]` (very light neutral)
Independent vertical scroll.
Padding: `p-6` (24px)
Cards separated by `gap-4` (16px)

### Accordion Sections (6 total):

Each card:
- `bg-white rounded-xl border border-[#E6E8EB]`
- No shadow by default, `shadow-sm` on open
- Accordion trigger: `py-4 px-4`
- Chevron rotates 180° when open
- Animation: 200ms ease

**Section 1 — Brand Identity** (collapsed by default)
- Logo upload: `ShopAssetUploader asset="logo"` — square preview max 120px
- Banner upload: `ShopAssetUploader asset="banner"` — 16:9 preview
- Banner size pills: Small / Medium / Large
- Identity display mode: radio group — "Logo seul" / "Nom seul" / "Logo + Nom" (NEW)
- NO favicon (removed per spec)

**Section 2 — Design** (open by default — colors + typography merged)
- Color rows (6 only, removed header/footer):
  1. Couleur principale (`primary_color`)
  2. Couleur secondaire (`secondary_color`)
  3. Fond CTA (`button_color`)
  4. Texte CTA (`button_text_color`)
  5. Fond global (`background_color`)
  6. Fond cartes produit (`card_bg_color`)
  7. Badge promo (`badge_color`)
- Thin divider line separating colors from typography
- Typography:
  - Font dropdowns (Select UI): Heading font / Body font
  - Sliders: Heading size (14–40px) / Body size (10–20px)
  - Live text preview block (inside `bg-[#F6F8FA]` container)

**Section 3 — Layout & CTA** (collapsed by default)
- Product grid visual segmented selector (1 / 2 / 3 per row — visual mini cards)
- Display order: `<Select>` dropdown (5 options)
- Thin divider
- CTA text: preset chips + "Personnalisé" → custom input (max 25 chars)
- CTA style: segmented controls for Shape (Sharp/Medium/Pill), Animation (None/Pulse/Shine)
- Live CTA preview button in subtle bordered box

**Section 4 — Style global** (collapsed)
- Dark mode toggle
- Card style: Soft shadow / Border minimal / Flat
- Global border radius: Sharp / Medium / Rounded pills
- CTA Width: Fit content / Full width
- CTA Shadow: None / Soft / Elevated

---

## Right Panel — Preview (flex-1, sticky)

Background: `bg-[#F6F8FA]`
Never scrolls.
Contains:

### Toolbar (48px):
```
[Desktop | Mobile] (segmented)      ···  Syncing  or  ● Synced    [⟳ Refresh]
```

### Iframe Container:

Desktop mode:
```
<div className="flex-1 p-4">
  <div className="w-full h-full rounded-2xl overflow-hidden border border-[#E6E8EB]">
    <iframe ... className="w-full h-full border-0" />
  </div>
</div>
```

Mobile mode:
```
<div className="flex-1 flex items-center justify-center bg-[#F6F8FA] p-4">
  <div style={{ width:390, height:700, borderRadius:40, boxShadow:'0 8px 40px rgba(0,0,0,0.18)' }} className="overflow-hidden border-8 border-[#1F2937]/10 relative bg-white">
    <!-- Notch -->
    <div style={{ width:120, height:28, borderRadius:'0 0 18px 18px' }} className="absolute top-0 left-1/2 -translate-x-1/2 bg-[#1F2937]/10 z-10" />
    <iframe ... className="w-full h-full border-0" />
  </div>
</div>
```

**Critical fix**: Only ONE `<iframe>` element in the DOM. Use a wrapper `div` to transform between desktop/mobile layout. The `ref` attaches to the single iframe element.

```tsx
// Single iframe, controlled by deviceMode wrapper:
const iframeEl = (
  <iframe
    ref={iframeRef}
    key={iframeKey}
    src={storeFrontUrl}
    title="Aperçu boutique"
    className="w-full h-full border-0"
    sandbox="allow-scripts allow-same-origin allow-forms"
  />
);

// Desktop:
<div className="flex-1 p-4">
  <div className="w-full h-full rounded-2xl overflow-hidden border border-[#E6E8EB]">
    {iframeEl}
  </div>
</div>

// Mobile:
<div className="flex-1 flex items-center justify-center p-4">
  <div style={phoneFrameStyle} className="overflow-hidden">
    <div style={notchStyle} />
    {iframeEl}
  </div>
</div>
```

Wait — this still renders the iframe element in two different positions based on conditional logic. But since it's the same `iframeEl` variable (JSX element), React reconciles it as the same DOM node → the `ref` stays attached. This is the correct approach.

---

## Migration: New columns needed

```sql
-- identity_display_mode: controls header logo+name rendering
ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS identity_display_mode text DEFAULT 'logo-name';

-- Typography numeric settings (currently not persisted)
ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS title_size_px integer DEFAULT 22,
  ADD COLUMN IF NOT EXISTS body_size_px integer DEFAULT 14,
  ADD COLUMN IF NOT EXISTS letter_spacing_px numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS line_height_pct integer DEFAULT 160;
```

Note: `title_size` already exists as `text` in the DB (used for something else). We add `title_size_px` as integer to avoid collision.

---

## Storefront Changes (`ShopStorefront.tsx`)

### 1. Identity display mode
```tsx
const displayMode = shop.identity_display_mode ?? 'logo-name';

// In header:
<div className="flex items-center gap-3 min-w-0">
  {(displayMode === 'logo-only' || displayMode === 'logo-name') && (
    shop.logo_url ? (
      <img src={shop.logo_url} className="w-9 h-9 rounded-full object-cover" />
    ) : (
      <ShopAvatar name={shop.name} color={primaryColor} size="md" />
    )
  )}
  {(displayMode === 'name-only' || displayMode === 'logo-name') && (
    <span className="font-bold text-lg truncate">{shop.name}</span>
  )}
</div>
```

### 2. Remove the second logo render below banner
The "Shop Info" block (lines 218–254) currently shows a large 80×80 logo + shop name again. This duplicate logo area is removed. The shop name and description remain, but the large logo tile is eliminated.

### 3. CTA button color from shop settings
The storefront "Add to cart" button (line 383–394) currently uses the default shadcn `<Button>`. Change to use `shop.button_color` and `shop.button_text_color`:
```tsx
<Button
  size="sm"
  className="w-full mt-3 gap-2"
  disabled={isOutOfStock}
  style={{
    backgroundColor: shop.button_color ?? primaryColor,
    color: shop.button_text_color ?? '#FFFFFF',
    borderRadius: shop.button_radius === 'Sharp' ? '4px' : shop.button_radius === 'Pill' ? '999px' : '8px',
  }}
  onClick={...}
>
```

### 4. Background and card colors via CSS vars (postMessage)
The storefront already has a postMessage listener at lines 63–74 that applies CSS vars to `document.documentElement`. For this to actually change the rendered background, we need the storefront's root element to use a CSS variable. Currently `bg-background` is a Tailwind class that maps to the CSS var `--background` in the theme system.

The postMessage sends `--color-bg` but Tailwind's `bg-background` reads `--background`. We need to align the variable names. Options:
- In the storefront listener, also set `--background` when receiving `--color-bg`
- Change postMessage to send `--background` directly

**Decision**: Update the postMessage in `SettingsApparence.tsx` to use native Tailwind CSS var names where possible, and add matching inline styles for key elements:
```ts
// In postMessage vars:
'--background': hexToHsl(form.background_color),  // Tailwind reads --background as HSL
```

This is complex because Tailwind's CSS vars are in HSL format. 

**Simpler approach**: In the storefront's postMessage handler, apply the color directly to `document.body.style.backgroundColor` etc. alongside the CSS var. The storefront listener becomes:
```ts
const handler = (e: MessageEvent) => {
  if (e.data?.type !== 'VENTOU_THEME_UPDATE') return;
  const root = document.documentElement;
  const vars = e.data.vars as Record<string, string>;
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
  // Direct DOM application for elements not using CSS vars:
  if (vars['--color-bg']) document.body.style.backgroundColor = vars['--color-bg'];
};
```

And product cards have inline styles applied based on CSS var: `style={{ backgroundColor: 'var(--color-card-bg, #FFFFFF)' }}`.

---

## Form State: Removed vs Added fields

**Removed from `AppearanceForm`:**
- `header_color` (non-functional)
- `footer_color` (non-functional)  
- `favicon_url` (removed from identity section per spec)

**Added to `AppearanceForm`:**
- `identity_display_mode: string` (new)

**Typography fields now persisted:**
- `title_size_px: number` (replaces `title_size`)
- `body_size_px: number` (replaces `body_size`)
- `letter_spacing_px: number` (replaces `letter_spacing`)
- `line_height_pct: number` (replaces `line_height`)

---

## Save function update

The `handleSave` function must now also save:
```ts
identity_display_mode: form.identity_display_mode,
title_size_px: form.title_size_px,
body_size_px: form.body_size_px,
letter_spacing_px: form.letter_spacing_px,
line_height_pct: form.line_height_pct,
```

And must NOT save `header_color`, `footer_color`, `favicon_url` anymore.

---

## Color section redesign (per spec)

The spec says: "Each color row: Left: Label + helper text. Right: 32x32 color square + HEX value."

This is a cleaner design than current. The inline-expanded `AdvancedColorPicker` approach is kept, but the trigger row is redesigned:

```
┌─────────────────────────────────────────────────────────────────┐
│  Couleur principale          [████] #1E3A5F                ▼    │
│  Applied to prices, links                                       │
└─────────────────────────────────────────────────────────────────┘
```

When clicked → expands the `AdvancedColorPicker` inline (existing behavior, kept).

---

## Typography section redesign

Per spec: "Dropdown for Heading font / Body font" (not font cards). Replace the 3×2 font card grid with a clean `<Select>` dropdown for both heading and body fonts. Then sliders below. Then a live text preview block.

Live preview block:
```tsx
<div className="rounded-lg border border-[#E6E8EB] bg-[#F6F8FA] p-4 space-y-2">
  <p
    style={{
      fontFamily: `${form.heading_font}, sans-serif`,
      fontSize: form.title_size_px,
      fontWeight: 600,
      color: '#1F2937',
      letterSpacing: form.letter_spacing_px + 'px',
      lineHeight: form.line_height_pct / 100,
    }}
  >
    Titre de votre boutique
  </p>
  <p
    style={{
      fontFamily: `${form.body_font}, sans-serif`,
      fontSize: form.body_size_px,
      color: '#6B7280',
      letterSpacing: form.letter_spacing_px + 'px',
      lineHeight: form.line_height_pct / 100,
    }}
  >
    Texte de description de votre produit. Voici comment il apparaîtra dans votre boutique.
  </p>
</div>
```

---

## Layout & CTA section (new merged section)

Per spec: "Layout & CTA (collapsed by default)". Merge the current two CTA sections (CTA Personnalisation + CTA Styling) into one "Layout & CTA" section alongside the product grid settings.

Sub-sections within:
1. **Product grid** — visual segmented selector (1/2/3)
2. **Display order** — Select dropdown
3. `<Separator />` (thin divider)
4. **CTA text** — preset chips + custom input
5. **CTA style** — Shape (Sharp/Medium/Pill segmented), Animation (None/Pulse/Shine segmented)
6. CTA preview button

---

## Mobile admin layout

On mobile (`isMobile = true`):
- Header: back + title + save button only (no reset on mobile header)
- Body: Single column accordion below header
- NO preview panel (hidden on mobile)
- Sticky bottom bar: "Voir l'aperçu" button that opens a bottom sheet or navigates to the store

Color picker on mobile: The `AdvancedColorPicker` is already inline. On mobile, it should open as a full-screen overlay. We'll add a `isMobile` check in the `ColorRow` component: if mobile, clicking the color swatch opens a `<Dialog>` (full-screen) containing the picker. Touch targets set to minimum 44px.

---

## Implementation Order

1. **Migration file** — new columns (`identity_display_mode`, `title_size_px`, `body_size_px`, `letter_spacing_px`, `line_height_pct`)
2. **`src/types/shop.ts`** — add `identity_display_mode: string | null` and 4 typography numeric fields
3. **`src/pages/settings/SettingsApparence.tsx`** — full rewrite with:
   - Strict design system tokens (Stripe/Shopify aesthetic)
   - 6 → 4 color fields (remove header/footer)
   - No favicon in identity
   - Identity display mode radio (new)
   - Font dropdowns instead of font cards
   - Typography persistence
   - Single iframe (no duplication bug)
   - Sections: Identity / Design / Layout & CTA / Style global
   - Mobile: accordion + sticky "View Preview" bar
4. **`src/pages/ShopStorefront.tsx`** — 3 targeted edits:
   - Apply identity display mode (show/hide logo, show/hide name)
   - Remove duplicate logo below banner in Shop Info block
   - Apply `button_color` / `button_text_color` / `button_radius` to buy buttons
   - Improve postMessage handler to also apply `body.style.backgroundColor`

---

## What is NOT changed

- `src/components/settings/AdvancedColorPicker.tsx` — no changes (already correct)
- `src/components/settings/ShopAssetUploader.tsx` — no changes (correct implementation)
- All other settings pages, orders, products, auth — untouched
- The `useShop` hook — uses `select('*')`, picks up new columns automatically
- `src/App.tsx` — route already defined, no change
