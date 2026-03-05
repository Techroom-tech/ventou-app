

## Plan: Dynamic Store Footer (Chariow-inspired)

### Current State
The storefront has a minimal footer (lines 784-823 in `ShopStorefront.tsx`) with flat page links, a logo, copyright, and "Powered by Ventou". There's also a simpler footer for the page view (lines 385-392). No column layout, no legal/navigation separation, no disclaimer.

### Changes

#### 1. New Component: `src/components/storefront/StoreFooter.tsx`

A reusable footer component receiving `shop`, `publishedPages`, `basePath`, and `navigate` as props.

**Layout (4-column grid):**

```text
┌──────────────┬──────────────┬──────────────┬──────────────┐
│  Col 1       │  Col 2       │  Col 3       │  Col 4       │
│  Logo + Name │  Navigation  │  Legal       │  Contact     │
│  Description │  About       │  Legal Notice│  WhatsApp    │
│              │  FAQ         │  Terms       │  City/Country│
│              │  Contact     │  Privacy     │              │
└──────────────┴──────────────┴──────────────┴──────────────┘
├─────────────── Disclaimer text ───────────────────────────┤
├─── Copyright ─────────────────────── Powered by Ventou ───┤
```

**Column logic:**
- Col 1: Store logo (or initials avatar) + name + description (truncated)
- Col 2: "Navigation" -- pages with `page_type` in `['about', 'faq', 'contact']` + any custom pages
- Col 3: "Legal" -- pages with `page_type` in `['legal', 'terms', 'privacy']`
- Col 4: "Contact" -- WhatsApp number, city, country (only if fields exist on shop)

**Dynamic data:** Update the published pages query to also fetch `page_type` so we can categorize.

**Disclaimer:** Hardcoded default text: "Cette boutique est exploitée de manière indépendante et est responsable de ses propres contenus et produits." (Can be made configurable via `platform_settings` later.)

**Copyright:** `{shop.name} © {currentYear} Tous droits réservés.`

**Powered by Ventou:** Always shown (premium badge hiding can be added later with subscription check).

**Responsive:**
- Desktop: 4 columns, max-w-[1200px] centered
- Tablet (md): 2 columns grid
- Mobile: stacked single column with 16px padding

#### 2. Update `src/pages/ShopStorefront.tsx`

- Update `publishedPages` query to select `slug, title, page_type`
- Replace both footer blocks (main storefront at line 784 and page view at line 385) with `<StoreFooter />`

| File | Change |
|------|--------|
| `src/components/storefront/StoreFooter.tsx` | New component |
| `src/pages/ShopStorefront.tsx` | Update query, replace 2 footer sections |

No database changes needed.

