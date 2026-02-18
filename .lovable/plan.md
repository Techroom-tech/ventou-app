
# Correction du schéma : `stock` → `stock_quantity` + `updated_at`

## Diagnostic précis

Le schéma retourné par Supabase révèle :

| Colonne en base | Ce que le frontend envoie | Statut |
|---|---|---|
| `stock` | `stock_quantity` | MISMATCH - cause de l'echec |
| `stock_quantity` | `stock_quantity` | Colonne vide ajoutee par migration (doublon) |
| *(absente)* | `updated_at` | Manquante - cause d'erreur sur UPDATE |

Le frontend (`AddProduct.tsx` ligne 205) envoie toujours `stock_quantity: Number(stockQuantity)`, mais la vraie colonne qui stocke la quantite s'appelle `stock` en base.

La migration precedente a ajoute une *nouvelle* colonne `stock_quantity` (toujours a 0) au lieu de renommer la colonne `stock` existante.

## SQL a executer dans Supabase (1 minute)

```sql
-- 1. Supprimer la colonne vide ajoutee par erreur
ALTER TABLE public.products DROP COLUMN IF EXISTS stock_quantity;

-- 2. Renommer stock → stock_quantity pour correspondre au frontend
ALTER TABLE public.products RENAME COLUMN stock TO stock_quantity;

-- 3. Ajouter updated_at manquant
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS updated_at 
  timestamp without time zone DEFAULT now();

-- 4. Verification finale
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'products' 
ORDER BY ordinal_position;
```

## Corrections code (3 fichiers)

### 1. `src/pages/AddProduct.tsx`

La ligne 202 envoie `description` comme string JSON alors que la DB attend `jsonb`. Il faut envoyer l'objet directement (pas de `JSON.stringify`) :

```ts
// Avant (ligne 202)
description: descriptionJsonRef.current ? JSON.stringify(descriptionJsonRef.current) : null,

// Apres
description: descriptionJsonRef.current || null,
description_json: descriptionJsonRef.current || null,
```

### 2. `src/contexts/ProductContext.tsx`

La fonction `updateProduct` envoie `updated_at: new Date().toISOString()` — une fois la colonne `updated_at` ajoutee en base, cela fonctionnera. Aucun changement necessaire si le SQL est execute.

### 3. `src/types/shop.ts`

Le type `Product` est deja correct avec `stock_quantity: number`. Aucun changement necessaire.

## Resume

| Action | Qui | Duree |
|---|---|---|
| Executer le SQL ci-dessus | Vous dans Supabase | 1 minute |
| Corriger `description` (string → jsonb) dans AddProduct | Moi | Automatique |

Une fois le SQL execute et la correction `description` appliquee, la publication de produits fonctionnera completement.
