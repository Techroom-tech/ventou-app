
# Rendre la page À propos responsive (Desktop & Tablette)

## Probleme actuel
La page utilise `max-w-lg` (512px) partout, ce qui donne un affichage trop etroit sur les grands ecrans.

---

## Modifications a apporter

### 1. Header
- Elargir le conteneur: `max-w-lg` → `max-w-6xl`
- Centrer le titre correctement sur grands ecrans

### 2. Section Hero
- Elargir: `max-w-lg` → `max-w-6xl`
- Augmenter la hauteur sur desktop: `h-[400px]` → `h-[400px] md:h-[500px] lg:h-[600px]`
- Agrandir les textes: `text-2xl` → `text-2xl md:text-4xl lg:text-5xl`
- Centrer le contenu sur desktop avec une mise en page plus aeree

### 3. Section Challenge + CTA
- Creer une grille 2 colonnes sur tablette/desktop
- Challenge a gauche, CTA a droite
- Padding adaptatif: `px-6` → `px-6 md:px-12 lg:px-24`

### 4. Section Solution
- Layout en 2 colonnes sur desktop: image a gauche, texte a droite
- Grille responsive pour les features

### 5. Section Valeurs
- Grille 3 colonnes sur desktop: `space-y-4` → `grid md:grid-cols-2 lg:grid-cols-3 gap-4`
- Cartes de valeurs cote a cote

---

## Structure responsive

```text
Mobile (< 768px)          Tablette (768-1024px)       Desktop (> 1024px)
+------------------+      +------------------------+   +--------------------------------+
|     Header       |      |        Header          |   |            Header              |
+------------------+      +------------------------+   +--------------------------------+
|                  |      |                        |   |                                |
|      Hero        |      |         Hero           |   |             Hero               |
|    (400px)       |      |       (500px)          |   |           (600px)              |
+------------------+      +------------------------+   +--------------------------------+
|    Challenge     |      | Challenge  |   CTA     |   |   Challenge    |     CTA       |
+------------------+      +------------------------+   +--------------------------------+
|       CTA        |      |                        |   |                                |
+------------------+      |  Image   |   Solution  |   |    Image    |    Solution      |
|      Image       |      +------------------------+   +--------------------------------+
+------------------+      |   Val 1  |   Val 2     |   |  Val 1  |  Val 2  |  Val 3     |
|     Solution     |      +------------------------+   +--------------------------------+
+------------------+      |   Val 3  |             |
|      Val 1       |      +------------------------+
|      Val 2       |
|      Val 3       |
+------------------+
```

---

## Details techniques

### Classes Tailwind a utiliser
- Conteneurs: `max-w-6xl mx-auto`
- Padding adaptatif: `px-4 md:px-8 lg:px-16`
- Grilles: `grid md:grid-cols-2 lg:grid-cols-3 gap-6`
- Textes: `text-2xl md:text-3xl lg:text-4xl`

### Fichier a modifier
- `src/pages/About.tsx` uniquement

---

## Resume des changements

| Section | Mobile | Tablette | Desktop |
|---------|--------|----------|---------|
| Header | max-w-lg | max-w-6xl | max-w-6xl |
| Hero | h-400px, text-2xl | h-500px, text-3xl | h-600px, text-4xl |
| Challenge + CTA | Empiles | 2 colonnes | 2 colonnes |
| Solution | Empiles | 2 colonnes | 2 colonnes (image + texte) |
| Valeurs | 1 colonne | 2 colonnes | 3 colonnes |
