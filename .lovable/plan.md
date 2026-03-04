

# Plan: Fix White Screen on Dashboard Refresh + Session Persistence + Auto-redirect

## Root Cause Analysis

### Why dashboard shows white screen on refresh

**Critical bug found** in `src/contexts/AuthContext.tsx` line 73:

```typescript
const storedSession = localStorage.getItem('ventou-auth-token');
```

This key **does not exist**. Supabase stores the session under `sb-chpplckgndznakuvcqbx-auth-token` (the default format: `sb-{project_ref}-auth-token`). Since `ventou-auth-token` is never found, every `SIGNED_OUT` event — including spurious ones from failed token refreshes (HTTP 429) — is treated as a genuine logout. The user state is cleared, `ProtectedRoute` sees `user === null`, and redirects to `/login`. On mobile or slow connections, this happens frequently on page refresh.

---

## Changes

### 1. Fix the localStorage key in AuthContext

Replace `'ventou-auth-token'` with the correct Supabase storage key: `sb-chpplckgndznakuvcqbx-auth-token`.

**File:** `src/contexts/AuthContext.tsx`

### 2. Implement "Rester connecté" (Remember Me)

**Behavior:**
- If "Rester connecté" is checked: session persists in `localStorage`, auto-expires after **72 hours**
- If not checked: session stored in `sessionStorage` (cleared on browser close), auto-expires after **12 hours**

**Implementation:**
- `signIn` method accepts a `rememberMe` parameter
- Stores a flag (`ventou_remember_me`) and timestamp (`ventou_session_start`) in localStorage
- On app load, AuthContext checks if the session has exceeded its TTL (72h or 12h) and signs out if expired
- Supabase client is configured with a dynamic storage adapter that checks the remember_me flag

**Files:**
- `src/contexts/AuthContext.tsx` — add `rememberMe` param to `signIn`, add TTL check on mount
- `src/integrations/supabase/client.ts` — use a custom storage wrapper that delegates to localStorage or sessionStorage based on the remember_me flag
- `src/pages/Login.tsx` — pass `rememberMe` value to `signIn`

### 3. Auto-redirect connected vendors from `/` to `/dashboard`

When a logged-in vendor visits the homepage (`/`), redirect them to `/dashboard` automatically.

**File:** `src/pages/Index.tsx` — add `Navigate` redirect when `user` is truthy

---

## Technical Details

### Custom storage adapter (client.ts)

```text
VentouStorage {
  getItem(key) → check localStorage first, then sessionStorage
  setItem(key, value) → write to localStorage if remember_me, else sessionStorage
  removeItem(key) → remove from both
}
```

### Session TTL check (AuthContext)

On `INITIAL_SESSION` or `SIGNED_IN`:
1. Read `ventou_session_start` from localStorage
2. Read `ventou_remember_me` flag
3. Calculate elapsed time
4. If exceeded (72h for remember_me, 12h otherwise) → call `signOut()`

### Files Modified

| File | Change |
|---|---|
| `src/integrations/supabase/client.ts` | Custom storage adapter for remember me |
| `src/contexts/AuthContext.tsx` | Fix storage key, add rememberMe to signIn, add TTL check |
| `src/pages/Login.tsx` | Pass rememberMe to signIn |
| `src/pages/Index.tsx` | Redirect logged-in users to /dashboard |

