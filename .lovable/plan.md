

# Plan: Clean Up MarketingPixels UI + Fix Pixel Event Tracking

## UI Cleanup (MarketingPixels.tsx)

Remove three sections from `src/pages/marketing/MarketingPixels.tsx`:
1. **Conversion API Token field** (lines ~131-143 inside Facebook card)
2. **"Tester connexion" button** for Facebook (lines ~144-150) and TikTok (lines ~172-179)
3. **"Événements automatiques" card** (lines ~226-252, the entire auto-events section + the `autoEvents` array definition)

Also remove the `fbApiToken`/`setFbApiToken` state, `testFbPixel`/`testTtPixel` functions, `testResults` state, and the unused `Check`/`X` icon imports since they're only used by those removed sections.

Clean up `handleSave` to stop sending `facebook_capi_token`.

## Fix Pixel Tracking (only PageView fires, other events don't)

**Root cause**: The `fireFbq()` helper checks `if (!window.fbq) return;` — but `fbq` IS available (it's queued synchronously). The real issue is that `window.VentouTracker` is set inside a `useEffect` that depends on `settings` (async query). If `addToCart` or checkout happen before `settings` resolves, `window.VentouTracker` is `undefined` and the convenience functions (`trackAddToCart` etc.) silently no-op.

**Fix in `src/hooks/useStorefrontTracking.ts`**:
- Add an **event queue**: buffer events that arrive before `VentouTracker` is installed
- When `VentouTracker` mounts, flush the queue
- The convenience functions (`trackAddToCart`, `trackInitiateCheckout`, etc.) push to queue if `VentouTracker` isn't ready yet, instead of silently dropping

Additionally, call `fbq('track', ...)` directly as a fallback inside each convenience function — since `fbq` uses a queue pattern internally, it works even before the script loads, but `VentouTracker` might not be mounted yet.

## Files Modified

| File | Change |
|---|---|
| `src/pages/marketing/MarketingPixels.tsx` | Remove CAPI field, test buttons, auto-events section |
| `src/hooks/useStorefrontTracking.ts` | Add event queue + direct fbq fallback in convenience functions |

