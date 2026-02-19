
# Rebuild: Apparence Settings — Professional SaaS 2-Column Layout

## Current State Assessment

The current `src/pages/settings/SettingsApparence.tsx` is minimal: 3 fields (logo URL, banner URL, one primary color picker) with no preview, no typography, no CTA config, no card styles — all stored in only 3 columns (`logo_url`, `banner_url`, `primary_color`) on the `shops` table.

The `Shop` type in `src/types/shop.ts` only has `primary_color`, `logo_url`, `banner_url` — none of the new columns exist yet.

## What Gets Built

### 1. SQL Migration (new columns on `shops`)

17 new columns added via `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`:

```sql
ALTER TABLE shops ADD COLUMN IF NOT EXISTS secondary_color text;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS button_color text;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS button_text_color text;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS badge_color text;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS heading_font text DEFAULT 'Inter';
ALTER TABLE shops ADD COLUMN IF NOT EXISTS body_font text DEFAULT 'Inter';
ALTER TABLE shops ADD COLUMN IF NOT EXISTS title_size text DEFAULT 'Normal';
ALTER TABLE shops ADD COLUMN IF NOT EXISTS spacing_density text DEFAULT 'Comfortable';
ALTER TABLE shops ADD COLUMN IF NOT EXISTS button_animation text DEFAULT 'None';
ALTER TABLE shops ADD COLUMN IF NOT EXISTS button_radius text DEFAULT 'Medium radius';
ALTER TABLE shops ADD COLUMN IF NOT EXISTS button_width text DEFAULT 'Full width';
ALTER TABLE shops ADD COLUMN IF NOT EXISTS cta_label text DEFAULT 'Acheter maintenant';
ALTER TABLE shops ADD COLUMN IF NOT EXISTS dark_mode_enabled boolean DEFAULT false;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS product_card_style text DEFAULT 'Soft shadow';
ALTER TABLE shops ADD COLUMN IF NOT EXISTS global_radius text DEFAULT 'Medium';
ALTER TABLE shops ADD COLUMN IF NOT EXISTS banner_size text DEFAULT 'Medium';
ALTER TABLE shops ADD COLUMN IF NOT EXISTS favicon_url text;
```

All existing columns (`logo_url`, `banner_url`, `primary_color`, etc.) remain untouched.

### 2. Type System Update (`src/types/shop.ts`)

Add all 17 new optional fields to the `Shop` interface so TypeScript doesn't complain when reading or writing them.

### 3. Component Architecture

The page is rebuilt as a **single self-contained file** (`src/pages/settings/SettingsApparence.tsx`) using the existing `DashboardLayout` + a custom wide layout (bypassing `SettingsPageLayout`'s `max-w-2xl` which is too narrow for 2 columns).

```text
DashboardLayout
└── div.max-w-6xl.mx-auto (wide container)
    ├── Sticky Header Row
    │   ├── ← Back button + title/description
    │   └── "Enregistrer les modifications" button (top-right)
    └── div.grid.grid-cols-1.lg:grid-cols-[3fr_2fr].gap-6
        ├── LEFT COLUMN (settings panels)
        │   ├── Section 1: Identité Visuelle (logo, banner, favicon, banner size)
        │   ├── Section 2: Couleurs (primary, secondary, button bg, button text, badge)
        │   ├── Section 3: Typographie (heading font, body font, title size, spacing)
        │   ├── Section 4: Bouton CTA (label choices, custom, radius, width, animation)
        │   └── Section 5: Style Global (dark mode, product card style, global radius)
        └── RIGHT COLUMN (live preview, sticky on desktop)
            └── div.sticky.top-20
                └── StorefrontPreview (lightweight mock component)
```

On **mobile**: the grid collapses to 1 column. The right-column preview is hidden by default with a "Voir aperçu" button that reveals it using a local toggle state (no accordion needed — simple `useState`).

### 4. State Management

Single `form` state object initialized from `shop` data. All 20 fields in one object. `useCallback`-memoized setters for color pickers to prevent re-renders on fast input changes.

```ts
const [form, setForm] = useState<AppearanceForm>({ ... });
const update = useCallback((key: keyof AppearanceForm, value: any) => {
  setForm(prev => ({ ...prev, [key]: value }));
}, []);
```

Google Fonts are loaded dynamically with a single `useEffect` that fires only when `heading_font` or `body_font` changes — inserts one `<link>` tag into `<head>`, deduplicating by font name.

### 5. Save Logic

Single `handleSave` async function — `supabase.from('shops').update(form).eq('id', shop.id)` — then `queryClient.invalidateQueries({ queryKey: ['shop'] })` and `toast.success`. A `saving` boolean guards double-submission.

### 6. Live Preview Component (`StorefrontPreview`)

A **pure presentational component** defined in the same file (or extracted to `src/components/settings/StorefrontPreview.tsx`). It receives the entire `form` object as props and renders a simplified storefront mockup:

```text
┌──────────────────────────────┐
│ [Logo] Shop Name             │  ← Uses form.logo_url or initials avatar
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │  ← Banner with form.banner_size height
│                              │
│  ┌────────────────────────┐  │
│  │ [Product Image]        │  │  ← product_card_style applied
│  │ Nom du produit         │  │
│  │ 5 000 FCFA   [CTA BTN] │  │  ← button_color, button_radius, cta_label
│  └────────────────────────┘  │
│                              │
│  ┌──────────────────────┐    │
│  │ [-10%] Badge promo   │    │  ← badge_color
│  └──────────────────────┘    │
└──────────────────────────────┘
```

All styles applied via `style` props (not CSS injection) — scoped exclusively to preview DOM nodes. No global CSS modified. Font applied to the preview container only via `style={{ fontFamily: form.body_font }}`.

### 7. Section Details

**Section 1 — Identité Visuelle**
- Logo URL input + thumbnail preview (12x12, `object-contain`, `onError` hide)
- Banner URL input + thumbnail (full width, height varies by `banner_size`)
- Favicon URL input + 16x16 preview
- Banner size: 3 radio-style pill buttons (`Small` / `Medium` / `Large`)

**Section 2 — Couleurs**
- 5 color rows: Primary, Secondary, Button background, Button text, Badge
- Each row: label + 10 preset swatches + native `<input type="color">` picker + HEX display badge
- Preset palette: 10 harmonious colors including the existing `PRESET_COLORS`

**Section 3 — Typographie**
- Heading font: 5-option radio grid (`Inter`, `Poppins`, `Manrope`, `Montserrat`, `Open Sans`)
- Body font: same 5-option radio grid
- Title size: 3 pill buttons (`Compact` / `Normal` / `Large`)
- Spacing density: 3 pill buttons (`Compact` / `Comfortable` / `Spacious`)

**Section 4 — CTA Button**
- 5 preset CTA labels as selectable pills + custom text input (max 25 chars, shown when "Personnalisé" selected)
- Button radius: 3 pill buttons (`Sharp` / `Medium` / `Pill`)
- Button width: 2 toggle buttons (`Full width` / `Fit content`)
- Button animation: 5 options as pills (`None` / `Bounce` / `Pulse` / `Shake` / `Shine`)

**Section 5 — Style Global**
- Dark mode toggle (`Switch` component)
- Product card style: 3 cards with visual icon representation
- Global border radius: 3 options

### 8. Files Modified

| File | Change |
|---|---|
| `src/pages/settings/SettingsApparence.tsx` | Full rebuild — the core deliverable |
| `src/types/shop.ts` | Add 17 new optional fields to `Shop` interface |
| Supabase migration | New `.sql` file with 17 `ALTER TABLE` statements |

### 9. Files NOT Touched

- `src/App.tsx` — route already exists at `/dashboard/parametres/apparence`
- `src/hooks/useShop.ts` — already uses `select('*')`, will pick up new columns automatically
- `src/components/settings/SettingsPageLayout.tsx` — not used (replaced by custom wide layout in this page)
- Storefront (`ShopStorefront.tsx`) — zero changes; it already reads `primary_color`, `logo_url`, `banner_url` from the shop and will naturally pick up new fields when the storefront is enhanced later
- All other pages, hooks, auth, orders — untouched

### 10. Performance Considerations

- Color pickers use `useCallback`-wrapped `update()` — no new function reference on each render
- Google Fonts `useEffect` depends only on `[form.heading_font, form.body_font]` — fires at most twice per session
- Preview component is memoized with `React.memo` — only re-renders when `form` changes
- No CSS class injection, no global style mutations — all preview styles via inline `style` prop
- Single `useState` for the entire form (one object, not 20 separate states) — one re-render per change
