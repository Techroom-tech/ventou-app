

# Plan: Dynamic Subtitle + Replace "Partager" CTA with Marketing Action

## Changes

### 1. Dynamic subtitle in `src/lib/greeting.ts`
Add a `subtitle` (FR) and `subtitleEn` (EN) field to `TimeGreeting` that varies by time slot:

| Time | FR subtitle | EN subtitle |
|---|---|---|
| 5-12h | Commencez la journée en beauté — vérifiez vos commandes du matin ! | Start the day right — check your morning orders! |
| 12-14h | Profitez de la pause pour optimiser votre boutique. | Use the break to optimize your shop. |
| 14-18h | C'est l'heure de pointe — lancez cette campagne que vous planifiez ! | Peak hours — launch that campaign you've been planning! |
| 18-22h | Bilan de la journée — voyez comment vos ventes ont performé. | Day recap — see how your sales performed. |
| 22-5h | Reposez-vous, votre boutique travaille pour vous. | Rest easy, your shop is working for you. |

### 2. Use dynamic subtitle in `src/pages/Dashboard.tsx`
Replace the hardcoded `t('dashboard.hero.subtitle', "C'est l'heure de pointe...")` with `isFr ? greeting.subtitle : greeting.subtitleEn`.

### 3. Replace "Partager" button with a Marketing action
Replace the third CTA (Share2 / `handleShare`) with a link to **Analytics** (`/dashboard/marketing/analytics`) using the `BarChart2` icon already imported. Label: "Voir analytics" / "View analytics".

Remove `handleShare` function, `Share2` import, `getStorefrontUrl` import, and `toast` import (if unused elsewhere).

## Files Modified

| File | Change |
|---|---|
| `src/lib/greeting.ts` | Add `subtitle`/`subtitleEn` per time slot |
| `src/pages/Dashboard.tsx` | Use `greeting.subtitle`, replace Partager CTA with Analytics link |

