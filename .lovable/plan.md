

## Plan: Optimize Product Page & Clean Up Storefront Header

### Issues to Fix

1. **Product page slow loading** — Currently there's a waterfall: shop loads → then product fetched by slug. The product query depends on `shop.id` being available. We can prefetch the product by slug without waiting for the shop, or fetch both in parallel.

2. **Product cards show fake static ratings** — Lines 638-650 render hardcoded 4 filled stars + "0 avis" for every product. Replace with real review data fetched in batch for all products.

3. **Remove ThemeToggle from storefront header** — Remove from both the store homepage header (line 441) and the product page header (line 347).

4. **Remove cart icon from storefront header** — Remove the ShoppingCart button from both headers (lines 348-349, 442-444). The floating `CartButton` component at the bottom already handles cart access.

---

### Technical Changes

**`src/pages/ShopStorefront.tsx`**

- Remove `ThemeToggle` import and both usages (product page header line 347, store header line 441).
- Remove the `ShoppingCart` icon button from both headers (product page header lines 348-349, store header lines 442-444).
- Replace static star ratings in product cards (lines 638-650) with real review data. Add a query to batch-fetch review stats (count + avg rating) for all products in the shop, then display actual values per card.
- Optimize product-by-slug fetch: run it in parallel with the shop query by fetching using `slug` + `productSlug` together, querying products joined with shops on slug match, removing the dependency on `shop.id`.

**New batch reviews query** — Single query to get `product_id`, `count`, `avg(rating)` grouped by product for the shop, used to show real ratings on product cards.

| File | Change |
|------|--------|
| `src/pages/ShopStorefront.tsx` | Remove ThemeToggle, remove header cart buttons, add batch review stats query, optimize product slug fetch |

