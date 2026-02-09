
# Creation de la page Support Client - VENTOU

## Objectif
Creer une page Support Client complete et responsive (mobile, tablette, desktop) basee sur le mockup fourni, SANS fleche de retour.

---

## Structure de la page

### 1. Header simple
- Titre centre "Support Client" uniquement (pas de fleche de retour)

### 2. Section Hero
- Titre: "Besoin d'aide ?" (noir) + "Nous sommes la." (orange)
- Sous-titre: "Notre equipe est dediee a votre reussite sur Ventou. Choisissez comment vous souhaitez nous contacter."

### 3. Options de contact (3 cartes)
- **WhatsApp Business** (carte principale, pleine largeur)
  - Icone verte MessageSquare
  - "Reponse instantanee"
  - Fleche vers la droite
- **Email** (demi-largeur)
  - Icone orange Mail
  - "Reponse sous 24h"
- **Centre d'Aide** (demi-largeur)
  - Icone orange FileText
  - "Articles & Guides"

### 4. Bandeau disponibilite
- Icone horloge orange
- "Disponibilite : Lun - Ven, 9h - 18h GMT"

### 5. Formulaire de contact
- Titre avec bordure orange a gauche: "Envoyez un message"
- Champs: Nom complet, Adresse Email, Sujet (dropdown), Message (textarea)
- Bouton orange "Envoyer le message"

### 6. Section FAQ
- Titre "Questions frequentes" + lien "Tout voir"
- 3 questions en accordeon

---

## Responsive Design

| Element | Mobile | Tablette/Desktop |
|---------|--------|------------------|
| Contact cards | Empilees | WhatsApp pleine largeur, Email + Centre cote a cote |
| Form + FAQ | Empiles | Cote a cote (2 colonnes) |
| Textes | Petits | Plus grands (md:text-xl, lg:text-2xl) |

---

## Fichiers a creer/modifier

| Fichier | Action |
|---------|--------|
| `src/pages/Support.tsx` | Creer |
| `src/App.tsx` | Ajouter route `/support` |
| `src/pages/Index.tsx` | Lien footer Contact → `/support` |
| `src/i18n/locales/fr.json` | Ajouter traductions |
| `src/i18n/locales/en.json` | Ajouter traductions |

---

## Composants utilises
- shadcn/ui: Button, Input, Textarea, Select, Accordion, Card, Label
- Lucide: MessageSquare, Mail, FileText, Clock, Send, ArrowRight, ChevronDown

---

## Fonctionnalites
1. WhatsApp: ouvre `https://wa.me/NUMERO`
2. Email: ouvre `mailto:support@ventou.shop`
3. Formulaire avec validation zod + toast de confirmation
4. FAQ en accordeon anime
