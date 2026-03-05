

## Plan: Page-Specific Tags, Templates & Editor Improvements

### Problem
All pages share the same global list of 13 dynamic tags. The editor modal lacks a proper footer with Cancel/Publish buttons. Tags are shown inline instead of via a "Voir" modal.

### Changes

**`src/hooks/useStorePages.ts`**
- Replace the single `DYNAMIC_TAGS` array with a `TAGS_BY_PAGE_TYPE` map, where each page type has its own subset of relevant tags:
  - `about`: storeName, ownerName, storeCity, storeCountry, contactEmail, storePhone, storeDescription
  - `privacy`: storeName, contactEmail, storeUrl, storeCountry, lastUpdatedDate, currentYear
  - `legal`: storeName, ownerName, storeUrl, storeCity, storeCountry, storePhone, currentYear
  - `terms`: storeName, storeUrl, storeCity, storePhone, lastUpdatedDate, storeCurrency, currentYear
  - `faq`: storeName, storePhone, storeWhatsApp, contactEmail
  - `contact`: storeName, storePhone, storeWhatsApp, contactEmail, storeCity, storeCountry, storeUrl
- Export a helper `getTagsForPageType(pageType: string)` that returns the filtered tag list
- Keep `replaceTags` unchanged (it replaces all tags regardless)

**`src/pages/settings/SettingsPages.tsx`**
1. **Tags section**: Replace the inline full table with a compact summary + "Voir les tags" button that opens a small Dialog showing only the relevant tags for that page type in a table (Data name | Tag | Copy icon)
2. **Editor modal footer**: Add a sticky bottom bar with "Annuler" (outline, closes modal) and "Publier" (primary, saves with published status). Remove the save button from the header. Keep the status toggle in the header for draft/publish control.
3. **Modal responsive**: Add responsive classes — `max-w-4xl` on desktop, full-screen on mobile via `sm:max-w-4xl sm:max-h-[90vh] max-h-screen h-full sm:h-auto`. Sticky footer on mobile.
4. **FAQ editor**: Also show the FAQ-specific tags via the same "Voir les tags" button pattern.

| File | Change |
|------|--------|
| `src/hooks/useStorePages.ts` | Add `TAGS_BY_PAGE_TYPE` map and `getTagsForPageType()` helper |
| `src/pages/settings/SettingsPages.tsx` | Refactor editor modal: tags modal, sticky footer, responsive layout |

No database changes needed.

