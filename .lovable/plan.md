

## Plan : Refonte design section Avis clients

### Problemes actuels (screenshot)

- Resume basique (etoiles + texte plat)
- Carte avis minimaliste sans avatar, sans mise en valeur
- Formulaire generique sans hierarchie visuelle
- Aucune barre de distribution des notes
- Pas d'etat vide engageant

### Ameliorations proposees

#### 1. Resume avec barre de distribution

Remplacer le resume simple par un bloc structuré :

```text
┌─────────────────────────────────────────────┐
│  ★★★★☆  4.0        ■■■■■■■■■ 5★  60%      │
│  sur 5 (12 avis)    ■■■■■      4★  25%      │
│                     ■■■        3★  10%      │
│                     ■          2★   3%      │
│                                1★   2%      │
└─────────────────────────────────────────────┘
```

Desktop : 2 colonnes (note globale gauche, barres droite). Mobile : empile.

#### 2. Cartes avis ameliorees

- Avatar genere (initiales + couleur) a la place du vide actuel
- Drapeau pays a cote du nom
- Etoiles sur la meme ligne que le nom
- Date en format relatif ("il y a 3 jours")
- Reponse vendeur avec badge "Vendeur" et fond subtil
- Ombre legere sur les cartes

#### 3. Formulaire repense

- Etoiles plus grandes et interactives avec hover preview (highlight toutes les etoiles jusqu'au survol)
- Labels descriptifs sous les etoiles ("Excellent", "Tres bien", etc.)
- Supprimer le champ telephone (friction inutile pour la conversion)
- Succes : animation checkmark au lieu du texte simple
- Bouton avec icone etoile

#### 4. Etat vide engageant

Si aucun avis : illustration minimaliste avec texte "Soyez le premier a donner votre avis" et etoiles cliquables directement.

#### 5. Responsivite

- Desktop : resume en 2 colonnes, liste 2 colonnes si >4 avis
- Tablet : resume empile, liste 1 colonne
- Mobile : tout empile, formulaire pleine largeur, etoiles plus grandes pour le tactile

### Fichier modifie

| Fichier | Action |
|---------|--------|
| `src/components/storefront/ProductReviews.tsx` | Refonte complete du composant |

