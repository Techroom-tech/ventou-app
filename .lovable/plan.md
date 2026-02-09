
# Creation de la page A propos - VENTOU

## Objectif
Creer une page "A propos" fidele au mockup fourni, presentant la mission, les defis, les solutions et les valeurs de VENTOU.

---

## Structure de la page (basee sur le mockup)

### 1. Header simple
- Fleche de retour vers l'accueil
- Titre centre "A propos de Ventou"

### 2. Section Hero - Mission
- Image d'arriere-plan avec une femme africaine
- Badge orange "NOTRE MISSION"
- Titre: "Democratiser l'e-commerce en Afrique de l'Ouest"
- Sous-titre: "Connecter les vendeurs locaux au monde digital, simplement et sans barrieres."

### 3. Section - Le defi actuel
- Icone d'alerte orange
- Titre "Le defi actuel"
- Carte avec fond clair et icone decorative
- Titre: "Des obstacles a la croissance"
- Texte explicatif sur les defis des entrepreneurs locaux

### 4. Bouton CTA
- Bouton orange "Commencer maintenant" avec fleche

### 5. Section - Simple. Securise. Local.
- Image d'une main tenant un telephone
- Titre "Simple. Securise. Local."
- Texte sur l'integration Mobile Money et boutiques verifiees
- Deux points cles avec icones:
  - Paiements instantanes via Orange Money, Wave et MTN
  - Boutiques digitales pretes en 2 minutes

### 6. Section - Nos valeurs
- Titre "Nos valeurs"
- Trois cartes de valeurs:
  - **Securite**: Icone bouclier orange, transactions protegees
  - **Proximite**: Icone signal, equipe locale disponible 7j/7
  - **Innovation**: Icone ampoule, outils modernes adaptes

---

## Fichiers a creer

### 1. `src/pages/About.tsx`
Page principale avec toutes les sections du mockup

### 2. Images placeholder
Utilisation d'images Unsplash via URL pour:
- Hero: femme africaine en tenue traditionnelle
- Section solution: main tenant un smartphone

---

## Fichiers a modifier

### 1. `src/App.tsx`
Ajouter la route `/about` pour la page A propos

### 2. `src/pages/Index.tsx`
Ajouter un lien vers la page A propos dans le footer

### 3. `src/i18n/locales/fr.json`
Ajouter les traductions pour la page A propos

### 4. `src/i18n/locales/en.json`
Ajouter les traductions anglaises correspondantes

---

## Details techniques

### Composants utilises
- Lucide icons: `ArrowLeft`, `ArrowRight`, `AlertTriangle`, `Shield`, `Wifi`, `Lightbulb`, `Smartphone`, `Store`
- Button de shadcn/ui
- Link de react-router-dom

### Styles
- Design mobile-first fidele au mockup
- Coins arrondis sur les cartes (rounded-2xl, rounded-3xl)
- Couleur accent orange (#FF6B35) pour les badges et icones
- Fond gris clair (bg-secondary/30) pour les sections alternees
- Animations fade-in existantes

### Structure des traductions
```text
about:
  title: "A propos de Ventou"
  mission:
    badge: "NOTRE MISSION"
    title: "Democratiser l'e-commerce en Afrique de l'Ouest"
    subtitle: "Connecter les vendeurs locaux..."
  challenge:
    title: "Le defi actuel"
    cardTitle: "Des obstacles a la croissance"
    cardText: "Aujourd'hui, les paiements complexes..."
  cta: "Commencer maintenant"
  solution:
    title: "Simple. Securise. Local."
    description: "Nous integrons nativement le Mobile Money..."
    feature1: "Paiements instantanes via Orange Money, Wave & MTN."
    feature2: "Boutiques digitales pretes en 2 minutes."
  values:
    title: "Nos valeurs"
    security:
      title: "Securite"
      description: "Transactions protegees et donnees cryptees."
    proximity:
      title: "Proximite"
      description: "Une equipe locale disponible 7j/7 pour vous."
    innovation:
      title: "Innovation"
      description: "Des outils modernes adaptes a nos realites."
```

---

## Resume des modifications

| Fichier | Action |
|---------|--------|
| `src/pages/About.tsx` | Creer |
| `src/App.tsx` | Modifier (ajouter route) |
| `src/pages/Index.tsx` | Modifier (ajouter lien footer) |
| `src/i18n/locales/fr.json` | Modifier (ajouter traductions) |
| `src/i18n/locales/en.json` | Modifier (ajouter traductions) |
