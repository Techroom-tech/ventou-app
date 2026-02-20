
# Refactor: "Identité visuelle" — Real Image Upload System

## Current State

Lines 515–558 of `SettingsApparence.tsx` currently render 3 plain URL text inputs for Logo, Banner, and Favicon. No file upload, no drag & drop, no compression, no real storage interaction.

The `shop-assets` bucket already exists in Supabase Storage and is used in `CreateShop.tsx` with paths:
- `{shop_id}/logo` — logo file (upserted)
- `{shop_id}/banner` — banner file (upserted)

The existing `ImageUploader` component in `src/components/addproduct/ImageUploader.tsx` handles multi-image upload to the `product-images` bucket but is designed for product images (multi-image, star/primary system) — not suitable for single-asset shop branding uploads.

## What Gets Built

### 1. New Component: `ShopAssetUploader`

A new purpose-built component for single-asset shop branding uploads. Created at `src/components/settings/ShopAssetUploader.tsx`.

**Props interface:**
```ts
interface ShopAssetUploaderProps {
  label: string;
  asset: 'logo' | 'banner' | 'favicon';
  currentUrl: string;
  shopId: string;
  onChange: (url: string) => void;
  aspectRatio?: '1:1' | '16:9' | 'favicon';
  accept?: string;
  maxSizeMB?: number;
}
```

**Features:**
- Desktop: Full drag & drop zone with dashed border, click to open file picker
- Image preview after upload (fills the zone with `object-cover` / `object-contain`)
- "Remplacer" and "Supprimer" action buttons overlaid on preview on hover
- File validation: PNG, JPG, SVG (+ WebP) — MIME type check + file extension check
- Max size validation: 2MB default (configurable per asset)
- **Auto-compression to WebP** before upload (reuses the `compressImage` function pattern from `ImageUploader.tsx`, adapted for single files)
- Upload to `shop-assets` bucket at path `{shopId}/{asset}` with `upsert: true` (matches existing `CreateShop.tsx` convention)
- Gets public URL via `getPublicUrl` after upload
- Calls `onChange(publicUrl)` on success → updates the `form` state in parent
- Loading spinner during upload with progress label
- Error display (inline, below the zone) for invalid file type, oversize, or upload failure
- Mobile behavior: no drag & drop (touch device detection), compact preview with a single "Modifier" button that opens the native file picker directly

**Banner-specific behavior:**
- Forced 16:9 aspect ratio preview container (`aspect-video` Tailwind class)
- Banner size pill buttons (`Small` / `Medium` / `Large`) shown directly under the preview (currently in `SettingsApparence.tsx`, stay co-located in the Identity section)
- No crop positioning (the spec mentions "basic crop positioning" — implementation kept as `object-position` selector: Left / Center / Right — stored as a CSS value but not persisted to DB in this iteration, kept local for simplicity)

**Logo-specific behavior:**
- Square aspect ratio container (`aspect-square`, max 96px × 96px preview)
- `object-contain` rendering (logos often have transparency)
- White background behind preview to show transparency correctly

**Favicon-specific behavior:**
- Small square preview (32×32px displayed at actual size + a larger 64×64 container)
- Label shows "Recommandé: 32×32px ou 64×64px"

### 2. `compressAndUpload` Utility (inside component)

```ts
async function compressAndUpload(
  file: File,
  bucket: string,
  path: string,
  maxWidthPx: number,
  quality: number
): Promise<string>
```

Process:
1. Validate MIME type (`image/png`, `image/jpeg`, `image/svg+xml`, `image/webp`)
2. Validate size ≤ 2MB (before compression)
3. For SVG: skip compression, upload as-is with `content-type: image/svg+xml`
4. For raster images: compress via canvas → WebP (same logic as `ImageUploader.tsx`)
5. Upload to Supabase Storage with `upsert: true`
6. Return `publicUrl`

**Compression settings per asset:**
- Logo: `maxWidth: 400`, `quality: 0.9` (needs crispness)
- Banner: `maxWidth: 1600`, `quality: 0.85` (wide image)
- Favicon: `maxWidth: 64`, `quality: 0.95` (small, needs precision)

### 3. Mobile Bottom Sheet

On mobile (detected via `useIsMobile()` hook from `src/hooks/use-mobile.tsx`):
- The drag & drop zone is replaced by a compact image preview card
- A "Modifier" button (with Camera icon) opens the native file input directly
- Below the preview: "Supprimer" text button in destructive color

No bottom sheet modal is needed — the native file picker on mobile already provides "Choose from library" / "Take photo" / "Cancel" options natively via `accept="image/*" capture` attributes.

### 4. Changes to `SettingsApparence.tsx` — Identity Section Only

**Lines 508–558** (the Identity AccordionContent) are replaced.

The 3 plain URL inputs become 3 `ShopAssetUploader` instances:

```tsx
<AccordionContent>
  <div className="space-y-6 pb-2">
    {/* Logo */}
    <ShopAssetUploader
      label="Logo"
      asset="logo"
      currentUrl={form.logo_url}
      shopId={shop!.id}
      onChange={url => update('logo_url', url)}
      aspectRatio="1:1"
      maxSizeMB={2}
    />

    {/* Banner */}
    <div className="space-y-3">
      <ShopAssetUploader
        label="Bannière"
        asset="banner"
        currentUrl={form.banner_url}
        shopId={shop!.id}
        onChange={url => update('banner_url', url)}
        aspectRatio="16:9"
        maxSizeMB={2}
      />
      <div className="space-y-1">
        <SectionLabel>Taille d'affichage</SectionLabel>
        <PillGroup
          options={['Small', 'Medium', 'Large']}
          value={form.banner_size}
          onChange={v => update('banner_size', v)}
        />
      </div>
    </div>

    {/* Favicon */}
    <ShopAssetUploader
      label="Favicon"
      asset="favicon"
      currentUrl={form.favicon_url}
      shopId={shop!.id}
      onChange={url => update('favicon_url', url)}
      aspectRatio="favicon"
      maxSizeMB={1}
    />
  </div>
</AccordionContent>
```

The `onChange` callback updates the `form` state, which:
1. Immediately updates the mock `StorefrontPreview` (logo and banner are already read from `form.logo_url` and `form.banner_url` in lines 222–239)
2. Sends a postMessage to the iframe via the debounced effect
3. Gets saved to DB on next "Enregistrer" click (the URL is already in `form`, the save logic handles it)

### 5. Files Modified

| File | Change |
|---|---|
| `src/components/settings/ShopAssetUploader.tsx` | **New** — self-contained single-asset upload component |
| `src/pages/settings/SettingsApparence.tsx` | **Edit** — replace lines 516–557 (3 URL inputs → 3 `ShopAssetUploader` instances) |

### 6. Files NOT Changed

- `src/components/addproduct/ImageUploader.tsx` — not touched (different use case: multi-image product gallery)
- `src/types/shop.ts` — no new fields needed (logo_url, banner_url, favicon_url already exist)
- `src/hooks/useShop.ts` — no change
- `src/pages/ShopStorefront.tsx` — no change
- All other pages — untouched
- No new DB migrations — all 3 URL columns already exist on `shops`

### 7. `ShopAssetUploader` Component Layout

**Desktop — Empty state (no image):**
```
┌──────────────────────────────────────────┐
│                                          │
│        ↑ [Upload icon]                   │
│   Glissez ou cliquez pour télécharger   │
│   PNG, JPG, SVG · Max 2 Mo              │
│                                          │
└──────────────────────────────────────────┘
```

**Desktop — Filled state (image uploaded):**
```
┌──────────────────────────────────────────┐
│  [IMAGE PREVIEW]                         │
│              ┌──────────┬──────────┐     │
│  (on hover)  │ Remplacer│ Supprimer│     │
│              └──────────┴──────────┘     │
└──────────────────────────────────────────┘
  ✓ logo.webp · 48 KB
```

**Mobile — Filled state:**
```
┌─────────────────────────────┐
│  [IMG] Logo                 │
│        [✎ Modifier]         │
└─────────────────────────────┘
       [Supprimer]
```

**Uploading state:**
```
┌──────────────────────────────────────────┐
│       [⟳ spinner]                        │
│     Upload en cours...                   │
│     ▓▓▓▓▓▓▓░░░░░░ 64%                   │
└──────────────────────────────────────────┘
```

**Error state:**
```
┌──────────────────────────────────────────┐
│  (zone, still interactive)               │
└──────────────────────────────────────────┘
⚠ Format non supporté. Utilisez PNG, JPG ou SVG.
```

### 8. Performance & Quality

- **No unnecessary re-renders**: The `ShopAssetUploader` is self-contained — upload state lives inside it, not in the parent form. Only `onChange(url)` bubbles up on completion.
- **WebP auto-conversion**: Raster images (PNG, JPG) are compressed to WebP before upload, reducing bandwidth and CDN cost.
- **Lazy loading**: Preview images use `loading="lazy"` attribute.
- **Upsert strategy**: Uses `upsert: true` so re-uploading a logo replaces the existing file at the same path (`{shopId}/logo`) — no orphaned files.
- **Cache-bust**: After upload, appends `?t={timestamp}` to the public URL to bust the CDN/browser cache for the same storage path.
