

# Plan: Server-Side Pagination for Products, Orders Counts & Customers

## Current Issues

1. **ProductContext** fetches ALL products with no limit — will silently truncate at 1000 rows for shops with many products
2. **useOrderCounts** fetches ALL orders client-side just to count by status — hits the 1000 limit, producing wrong counts
3. **useCustomers** fetches ALL orders to aggregate customers — same 1000 limit problem
4. **useRepeatCustomers** fetches ALL orders — same issue

## Changes

### 1. Add server-side pagination to ProductContext + Products page

**ProductContext** — add `page`, `search`, `statusFilter` params to the query. Use `.range()` with `count: 'exact'` like orders already do. Expose `page`, `setPage`, `totalCount`, `totalPages` in the context.

**Products.tsx** — remove client-side filtering. Pass search/status to `useProducts()`. Add pagination controls at the bottom (Previous/Next buttons).

### 2. Replace useOrderCounts with server-side counts

Instead of fetching all orders and counting client-side, run 4 parallel `head: true` count queries (one per status + one for all non-archived). This bypasses the 1000 limit entirely and is far more efficient.

### 3. Add server-side pagination to useCustomers

Create a **database function** `get_customer_stats(shop_id, search_term, page_size, page_offset)` that aggregates orders by phone server-side using `GROUP BY`, returning paginated customer stats with counts. This avoids fetching all orders to the client.

### 4. Fix useRepeatCustomers with server-side count

Replace the full-scan query with a DB function or a `GROUP BY` query via RPC that counts phones with >1 order.

## Files Modified

| File | Change |
|---|---|
| `src/contexts/ProductContext.tsx` | Add pagination params, use `.range()` + `count: 'exact'` |
| `src/pages/Products.tsx` | Remove client-side filter, use context pagination, add page controls |
| `src/hooks/useOrders.ts` | Replace `useOrderCounts` with parallel head-count queries, replace `useRepeatCustomers` with RPC |
| `src/hooks/useCustomers.ts` | Use new `get_customer_stats` DB function |
| Migration SQL | Create `get_customer_stats` and `get_repeat_customer_count` functions |

## Technical Details

### ProductContext query change

```text
.select('*', { count: 'exact' })
.eq('shop_id', shop.id)
.ilike('name', `%${search}%`)       // if search provided
.eq('is_active', statusFilter)       // if filter provided
.order('created_at', { ascending: false })
.range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)
```

### useOrderCounts — parallel counts

```text
Promise.all([
  supabase.from('orders').select('id', { count: 'exact', head: true }).eq('shop_id', id).eq('is_archived', false),
  supabase.from('orders').select('id', { count: 'exact', head: true }).eq('shop_id', id).eq('status', 'pending'),
  supabase.from('orders').select('id', { count: 'exact', head: true }).eq('shop_id', id).eq('status', 'confirmed'),
  supabase.from('orders').select('id', { count: 'exact', head: true }).eq('shop_id', id).eq('status', 'delivered'),
  supabase.from('orders').select('id', { count: 'exact', head: true }).eq('shop_id', id).eq('status', 'cancelled'),
])
```

### get_customer_stats DB function

Groups orders by phone, computes total_orders, delivered, cancelled, total_amount, returns paginated results with optional search filter on name/phone.

