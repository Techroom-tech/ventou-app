

# Fix: Cache Invalidation + Button Submit Issue

## Two Problems Identified

### Problem 1: Dashboard doesn't update after shop creation
In `CreateShop.tsx` line 251, after creating the shop, the code navigates to `/dashboard` but never invalidates the React Query cache for `useShop`. So the dashboard still shows the old cached result (no shop).

**Fix**: Import `useQueryClient` from `@tanstack/react-query`, and call `queryClient.invalidateQueries({ queryKey: ['shop'] })` after successful creation, before navigating.

### Problem 2: "Creer Ma Boutique" button does nothing
The form uses `react-hook-form` with `zod` validation. When the user clicks submit, `form.handleSubmit(onSubmit)` runs validation first. If validation fails silently (no visible error messages scrolled into view), it looks like nothing happens.

Likely causes:
- The `slug` field validation requires the slug to be checked (`slugStatus`), but the check-slug edge function may be failing silently (returning an error or not deployed), leaving `slugStatus` at `'idle'` or `'checking'`
- Zod validation errors on fields like `category` (required but possibly empty) may not be visible if the user hasn't scrolled up

**Fix**:
- Add `console.log` of form errors in `onSubmit` rejection for debugging
- Add a toast notification when form validation fails, showing which fields need attention
- Ensure the slug check doesn't block submission when the edge function is unavailable -- treat `'idle'` and `'checking'` as acceptable states (only block on `'taken'`)

---

## Technical Changes

### File: `src/pages/CreateShop.tsx`

1. **Add `useQueryClient` import** from `@tanstack/react-query`
2. **Instantiate** `const queryClient = useQueryClient()` in the component
3. **After successful shop creation** (line ~250), add:
   ```typescript
   queryClient.invalidateQueries({ queryKey: ['shop'] });
   ```
4. **Add form error handling** to surface validation failures:
   ```typescript
   // On the form element, add onInvalid logging
   <form onSubmit={form.handleSubmit(onSubmit, (errors) => {
     console.error('Form validation errors:', errors);
     toast({
       title: t('createShop.errors.validation'),
       description: Object.keys(errors).join(', '),
       variant: 'destructive',
     });
   })} ...>
   ```
5. **Add try/catch around the entire onSubmit** to catch any uncaught async errors
6. **Add i18n key** `createShop.errors.validation` in both FR and EN locale files

