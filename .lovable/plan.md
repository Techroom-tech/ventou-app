
# Fix Product Detail Crash + Improve Product Page

## Root Causes Identified

### 1. Description crash (primary cause of blank white page)
The `description` column in the database is `jsonb` — Supabase returns it as a JavaScript **object**, not a string. In `ProductDetailSheet`, the code renders `{product.description}` directly as a React child, which crashes React when given an object.

### 2. Wrong TypeScript type
`Product.description` is typed as `string | null` in `shop.ts`, but the real DB column is `jsonb`. This masks the runtime crash at compile time.

### 3. No error boundary
There is no `ErrorBoundary` wrapping `ProductDetailSheet`, so any render error produces a blank white page with no recovery.

### 4. `useIsMobile()` returns `undefined` on first render
During SSR hydration / first render, `isMobile` is `undefined` (treated as falsy), causing a brief flash of the wrong layout.

---

## Files to Modify

### A. `src/types/shop.ts`
Fix the `description` field type to accurately reflect its real DB type:
```ts
// Before
description: string | null;

// After  
description: Record<string, unknown> | string | null;
```
This prevents TypeScript from allowing `{product.description}` as a React child without casting.

### B. `src/components/storefront/ProductDetailSheet.tsx`
**This is the main fix.** Rewrite the description rendering logic in `ProductInfo`:

```
Priority 1: description_json exists → render as plain text extracted from TipTap nodes
Priority 2: description exists and is a string → render as plain text
Priority 3: description exists and is an object → extract text from TipTap JSON
Priority 4: Neither → show "No description" placeholder
```

TipTap JSON has the structure `{ type: "doc", content: [...nodes] }`. A simple recursive text extractor covers all cases without importing the full TipTap runtime (which would be heavy).

Additional fixes:
- Wrap the entire component in a try/catch with a graceful fallback
- Guard `if (!product) return null` is already there — keep it
- Fix `useIsMobile()` initial `undefined` state by treating `isMobile === undefined` as desktop (non-blocking)
- Add explicit null checks before all `product.xxx` accesses

### C. `src/pages/ShopStorefront.tsx`
Wrap `ProductDetailSheet` in the existing `ErrorBoundary` component to prevent blank white pages:
```tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Before
<ProductDetailSheet ... />

// After
<ErrorBoundary fallbackMessage="Impossible d'afficher ce produit">
  <ProductDetailSheet ... />
</ErrorBoundary>
```

### D. `src/i18n/locales/fr.json` + `en.json`
Add one missing key used in `ProductDetailSheet`:
```json
"storefront": {
  "noDescription": "Aucune description disponible."
}
```
(The key `storefront.noProducts` is currently used as fallback for no description, which is semantically wrong.)

---

## Description Rendering Logic (detail)

The TipTap JSON structure looks like:
```json
{
  "type": "doc",
  "content": [
    { "type": "paragraph", "content": [{ "type": "text", "text": "Hello" }] },
    { "type": "heading", "content": [{ "type": "text", "text": "Title" }] }
  ]
}
```

A lightweight recursive extractor:
```ts
function extractText(node: Record<string, unknown>): string {
  if (node.type === 'text') return (node.text as string) || '';
  if (!node.content) return '';
  return (node.content as Record<string, unknown>[])
    .map(extractText)
    .join(' ');
}
```

This avoids importing TipTap's viewer (heavy) just for a storefront read-only display. No new dependency needed.

---

## Summary

| File | Change |
|---|---|
| `src/types/shop.ts` | Fix `description` type to `Record<string, unknown> \| string \| null` |
| `src/components/storefront/ProductDetailSheet.tsx` | Fix description rendering, add null guards, fix `useIsMobile` flicker |
| `src/pages/ShopStorefront.tsx` | Wrap `ProductDetailSheet` in `ErrorBoundary` |
| `src/i18n/locales/fr.json` | Add `storefront.noDescription` key |
| `src/i18n/locales/en.json` | Add `storefront.noDescription` key |

No new dependencies. No DB changes. No breaking changes to existing routes or architecture.
