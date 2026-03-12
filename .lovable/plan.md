

## Plan : Remplacer les `window.confirm` par un AlertDialog pro

### Probleme

Les confirmations utilisent `window.confirm()` natif du navigateur — rendu basique "ventou.shop says" qui casse l'experience pro. Les icones d'action (Check/X) sont trop generiques sur desktop.

### Solution

1. **Creer un composant `ConfirmDialog.tsx`** reutilisable base sur Radix `AlertDialog` avec :
   - Icone contextuelle animee (CheckCircle2 vert pour confirmer, Truck pour livrer, XCircle rouge pour annuler, Trash2 pour supprimer)
   - Titre + description dynamiques
   - Deux boutons : "Confirmer" (primary/destructive selon action) + "Annuler" (outline)
   - Design : rounded-xl, padding confortable, animation fade+zoom

2. **Modifier `Orders.tsx`** : Remplacer tous les `window.confirm()` par un state `confirmAction` qui ouvre le `ConfirmDialog`. Couvre :
   - Changement de statut individuel
   - Suppression individuelle
   - Batch status change
   - Batch delete

3. **Modifier `OrderDetail.tsx` et `OrderDetailPanel.tsx`** : Meme remplacement du `window.confirm`.

4. **Actions desktop : texte + icone** — Les boutons d'action rapide affichent `icone + texte` sur desktop (deja le cas via tooltip, on garde les icones actuelles qui sont coherentes avec le design).

### Fichiers modifies

| Fichier | Action |
|---------|--------|
| `src/components/dashboard/ConfirmDialog.tsx` | Nouveau composant AlertDialog pro |
| `src/pages/Orders.tsx` | Remplacer 4x `window.confirm` par ConfirmDialog |
| `src/pages/OrderDetail.tsx` | Remplacer `window.confirm` |
| `src/components/dashboard/OrderDetailPanel.tsx` | Remplacer `window.confirm` |

