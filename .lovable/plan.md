

## Command Palette — Supprimer la section Pages par défaut

### Changement unique

**`src/components/dashboard/CommandPalette.tsx`** :

- Masquer le groupe "📄 Pages" par défaut quand le champ de recherche est vide
- Afficher les pages **uniquement** quand l'utilisateur tape du texte dans la recherche
- Par défaut, seules les 3 actions rapides sont visibles : Ajouter un produit, Créer une réduction, Voir les commandes
- Ajouter un état pour tracker la valeur de recherche via `onValueChange` du `CommandInput`
- Conditionner le rendu du `CommandGroup` Pages avec `{searchValue.length > 0 && (...)}`

### Résultat
- Ouverture ⌘K → seulement ⚡ Actions rapides (3 items)
- Dès qu'on tape → les pages apparaissent en résultats filtrés

