
# Ajouter "Créer une Commande" sur la page Commandes

## Contexte

La page `/dashboard/orders` permet actuellement de lister, filtrer, exporter et naviguer vers les commandes existantes. Il n'existe aucune fonctionnalité permettant au vendeur de saisir manuellement une commande (ex: commande prise par téléphone, en présentiel, via WhatsApp hors-boutique, etc.).

## Ce qui sera ajouté

Un bouton **"+ Nouvelle commande"** dans le header de la page `Orders.tsx`, ouvrant un **Dialog** (modal) avec un formulaire complet de création de commande. Pas de nouvelle page, pas de nouvelle route — tout reste dans `Orders.tsx` + un nouveau composant modal.

---

## Structure du formulaire (modal)

Le formulaire reproduit exactement les champs utilisés par le `CheckoutDrawer` (même colonnes DB) :

**Section Client**
- Nom du client (requis)
- Téléphone (requis)
- Ville (requis)
- Quartier (optionnel)
- Notes / instructions de livraison (optionnel)

**Section Articles**
- Ligne dynamique : Nom du produit (texte libre) + Quantité + Prix unitaire
- Bouton "Ajouter un article"
- Calcul automatique : Sous-total affiché en temps réel

**Section Paiement & Livraison**
- Frais de livraison (pré-rempli depuis `useDeliverySettings`)
- Mode de paiement : COD (Livraison) | WhatsApp
- Total final calculé automatiquement

**Validation** via `zod` + `react-hook-form` (cohérent avec le reste du codebase).

---

## Fichiers modifiés / créés

| Fichier | Action |
|---|---|
| `src/components/dashboard/CreateOrderModal.tsx` | **Nouveau** — formulaire complet |
| `src/pages/Orders.tsx` | Ajout du bouton + import du modal |
| `src/hooks/useOrders.ts` | Ajout `useCreateOrder` mutation |

### Aucun autre fichier touché
- Storefront inchangé
- `OrderDetail.tsx`, `App.tsx`, types — inchangés
- Aucune migration SQL requise (même colonnes existantes)

---

## Détails techniques

### `useCreateOrder` (dans `useOrders.ts`)

Nouvelle mutation qui insère une ligne dans `orders` :

```ts
supabase.from('orders').insert({
  shop_id,
  customer_name,
  customer_phone: phone,
  phone,
  city,
  quartier,
  notes,
  items: [{ name, quantity, unit_price }],  // items JSON
  subtotal,
  delivery_fee,
  total: subtotal + delivery_fee,
  status: 'pending',
  payment_method,
})
```

Après succès :
- `invalidateQueries` sur `['orders', shopId]` et `['order-counts', shopId]`
- Toast succès
- Modal fermé automatiquement
- La nouvelle commande apparaît en tête de liste (déjà trié par `created_at DESC`)

### `CreateOrderModal.tsx`

- Composant `Dialog` (déjà installé via Radix)
- Gestion articles avec `useFieldArray` de `react-hook-form`
- Calcul temps réel du sous-total et total
- Validation `zod` identique au `CheckoutDrawer`
- Mode de paiement : boutons radio COD / WhatsApp
- Design cohérent avec le dashboard existant (cards, input, label, badge)
- Responsive : modal centrée desktop, plein écran mobile

### Bouton dans `Orders.tsx`

Ajouté dans le header, à côté des boutons "Actualiser", "Export CSV", "WhatsApp" :

```tsx
<Button
  size="sm"
  className="h-8 gap-1.5 text-xs bg-primary text-white"
  onClick={() => setCreateOpen(true)}
>
  <Plus className="h-3.5 w-3.5" />
  Nouvelle commande
</Button>
```

---

## Expérience utilisateur

1. Vendeur clique **"+ Nouvelle commande"**
2. Modal s'ouvre avec formulaire vide
3. Il remplit : nom client, téléphone, ville, ajoute les articles avec prix
4. Les frais de livraison sont pré-chargés depuis les paramètres boutique
5. Il choisit COD ou WhatsApp
6. Clique **"Créer la commande"**
7. Toast de succès, modal se ferme, la commande apparaît dans la liste en statut **EN ATTENTE**
8. Il peut cliquer dessus pour ouvrir la page détail et la confirmer

---

## Ce qui n'est PAS changé

- Storefront, checkout client — inchangés
- `OrderDetail.tsx`, transitions de statut — inchangés
- Aucune migration SQL (les colonnes `items`, `subtotal`, `delivery_fee` existent déjà)
- Pagination, filtres, real-time, CSV export — inchangés
