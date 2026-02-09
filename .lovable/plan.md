

# Refonte complete de la page d'accueil + Synchronisation des headers

## Objectif
1. Recreer la page d'accueil (Index.tsx) selon le mockup
2. Creer un composant Header reutilisable pour toutes les pages
3. Synchroniser le header sur Index, About et Support

---

## Analyse du mockup

### Header unifie (pour toutes les pages)
- Logo "Ventou" a gauche (orange)
- Bouton "S'inscrire" orange a droite
- Toggle langue integre
- Pas de fleche de retour

### Sections de la page d'accueil
1. **Hero**: Badge "NOUVEAU", titre bicolore, CTA, notification de succes
2. **Fonctionnalites**: 3 cartes (Paiements, Stock, Stats)
3. **Comment ca marche**: 3 etapes numerotees
4. **Securite**: Bouclier + points de confiance
5. **Partenaires**: Logos Orange, MTN, Wave, Moov
6. **Temoignages**: Cartes avec etoiles
7. **CTA final**: Derniere invitation
8. **Footer**: Liens + bouton flottant mobile

---

## Structure responsive

```text
Mobile (< 768px)          Tablette (768-1024px)       Desktop (> 1024px)
+------------------+      +------------------------+   +--------------------------------+
| Logo  | S'inscrire|     | Logo    |    S'inscrire|   | Logo        |      S'inscrire  |
+------------------+      +------------------------+   +--------------------------------+
|      Hero        |      |         Hero           |   |   Hero (gauche) | Image droite |
+------------------+      +------------------------+   +--------------------------------+
|   Features x1    |      |   Features x2          |   |      Features x3               |
+------------------+      +------------------------+   +--------------------------------+
|   Steps x1       |      |   Steps x3             |   |      Steps x3                  |
+------------------+      +------------------------+   +--------------------------------+
|   Security       |      |   Security x2          |   |      Security x2               |
+------------------+      +------------------------+   +--------------------------------+
|   Partners       |      |   Partners             |   |      Partners                  |
+------------------+      +------------------------+   +--------------------------------+
|  Testimonials    |      |  Testimonials x2       |   |   Testimonials x2              |
+------------------+      +------------------------+   +--------------------------------+
|   CTA + Footer   |      |   CTA + Footer         |   |      CTA + Footer              |
+------------------+      +------------------------+   +--------------------------------+
```

---

## Fichiers a creer

### 1. `src/components/Header.tsx` (NOUVEAU)
Composant Header reutilisable avec:
- Logo Ventou (lien vers /)
- Toggle langue
- Bouton S'inscrire / Dashboard (selon auth)
- Props optionnelle: `pageTitle` pour afficher un titre centre (About, Support)

---

## Fichiers a modifier

### 1. `src/pages/Index.tsx`
Refonte complete avec toutes les sections du mockup

### 2. `src/pages/About.tsx`
- Remplacer le header inline par `<Header pageTitle={t('about.title')} />`
- Supprimer la fleche de retour

### 3. `src/pages/Support.tsx`
- Remplacer le header inline par `<Header pageTitle={t('support.title')} />`
- Garder la meme structure

### 4. `src/i18n/locales/fr.json`
Ajouter les traductions pour la page d'accueil

### 5. `src/i18n/locales/en.json`
Ajouter les traductions anglaises

---

## Composant Header unifie

```text
+----------------------------------------------------------+
|  [V] VENTOU           [Titre Page]        [FR] [S'inscrire]|
+----------------------------------------------------------+

- Sur mobile: titre cache si trop long
- Sur desktop: espacement equilibre
- Props: pageTitle? (optionnel, pour pages internes)
```

---

## Details techniques

### Icones Lucide utilisees
- ArrowRight, Play (Hero)
- Smartphone, Package, BarChart3 (Features)
- UserPlus, Camera, Wallet (Steps)
- Shield, ShieldCheck, Headphones, RefreshCw, Lock (Security)
- Star, MapPin (Testimonials)
- CheckCircle (Notification)

### Nouvelles traductions (home namespace)
```text
home:
  badge: "NOUVEAU: SUPPORT WAVE INTEGRE"
  hero:
    title1: "Vendez partout en"
    title2: "Afrique de l'Ouest"
    subtitle: "La plateforme tout-en-un..."
    cta: "Creer ma boutique"
    demo: "Voir demo"
  features:
    title: "Fonctionnalites Cles"
    subtitle: "Tout ce dont vous avez besoin..."
    mobile/stock/analytics: {...}
  howItWorks:
    title: "Comment ca marche ?"
    step1/step2/step3: {...}
  security:
    badge: "SECURITE GARANTIE"
    title: "Votre argent est en securite"
    support/refund/encryption: {...}
  partners:
    title: "PARTENAIRES DE CONFIANCE"
  testimonials:
    title: "Ce que disent nos vendeurs"
    testimonial1/testimonial2: {...}
  cta:
    title: "Pret a developper votre activite ?"
    button: "Commencer gratuitement"
  footer: {...}
```

---

## Resume des modifications

| Fichier | Action |
|---------|--------|
| `src/components/Header.tsx` | Creer (composant reutilisable) |
| `src/pages/Index.tsx` | Modifier (refonte complete) |
| `src/pages/About.tsx` | Modifier (utiliser Header) |
| `src/pages/Support.tsx` | Modifier (utiliser Header) |
| `src/i18n/locales/fr.json` | Modifier (ajouter home) |
| `src/i18n/locales/en.json` | Modifier (ajouter home) |

---

## Fonctionnalites speciales

1. **Notification animee** - Carte "Commande payee" avec animation
2. **Logos partenaires** - Textes styles pour Orange, MTN, Wave, Moov
3. **Temoignages** - Etoiles dorees + photos rondes
4. **Bouton flottant** - CTA fixe en bas sur mobile uniquement
5. **Toggle langue** - Integre dans le header unifie

