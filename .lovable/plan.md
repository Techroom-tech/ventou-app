

## Plan: Remove Preview Mode from Block Editor

Remove the "Aperçu" preview toggle button and all associated preview mode logic from `src/components/settings/BlockEditor.tsx`.

### Changes in `src/components/settings/BlockEditor.tsx`

1. Remove the `preview` state variable
2. Remove the preview toggle button (lines 388-397) and the spacer div before it (line 386)
3. Remove the preview mode overlay badge (lines 408-413)
4. Remove the `preview && 'bg-muted/20'` conditional class on the editor container
5. Remove `Eye`, `EyeOff` from Lucide imports

Single file change, straightforward removal.

