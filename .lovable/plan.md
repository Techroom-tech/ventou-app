

## Plan : Refonte du widget feedback

### Problemes identifies

1. **Deux boutons flottants** : `FloatingChatButton` (orange, support) et `FeedbackWidget` (bleu) se superposent. Supprimer le FloatingChatButton.
2. **Modal au lieu de widget** : Le feedback s'ouvre en Dialog/Drawer centree. Le remplacer par un **Popover ancre au bouton** qui s'ouvre comme un widget classique (panneau qui monte depuis le bouton en bas a droite).
3. **Clics multiples necessaires** : Le lazy loading + Suspense cause un delai. Precharger le composant au hover et supprimer la double couche Suspense.
4. **Pas de contenu adaptatif par type** : Les placeholders titre/message doivent changer selon le type selectionne (Bug → "Decrivez le bug...", Feature → "Decrivez la fonctionnalite...").
5. **Badges contexte inutiles** : Supprimer les badges "desktop / Edge / test" visibles par l'utilisateur (les donnees sont toujours envoyees en arriere-plan).
6. **Bouton Envoyer mal designe** : Redesigner avec un style plus propre, radius 10px, hauteur 48px conforme au standard CTA.

### Modifications

| Fichier | Action |
|---------|--------|
| `src/components/dashboard/FeedbackWidget.tsx` | Remplacer par un Popover ancre au bouton, preload au hover |
| `src/components/dashboard/FeedbackModal.tsx` | Transformer en `FeedbackPanel.tsx` — contenu popover avec placeholders dynamiques par type, supprimer badges contexte, redesigner bouton submit |
| `src/components/dashboard/DashboardLayout.tsx` | Supprimer l'import et le rendu de `FloatingChatButton` |
| `src/components/dashboard/FloatingChatButton.tsx` | Supprimer le fichier (plus utilise) |

### Details UX du widget

- Le popover s'ouvre vers le haut depuis le bouton flottant (side="top", align="end")
- Largeur : 400px desktop, plein ecran mobile (drawer conserve)
- Animation : slide-up smooth avec framer-motion ou CSS
- Placeholders dynamiques :
  - Bug : "Quel bug avez-vous rencontre ?" / "Decrivez les etapes pour reproduire le bug..."
  - Feature : "Quelle fonctionnalite souhaitez-vous ?" / "Decrivez votre idee en detail..."
  - Feedback : "Resume de votre avis" / "Partagez votre experience..."
  - Question : "Votre question" / "Posez votre question..."
- Bouton submit : h-12, rounded-[10px], sans icone Upload (juste texte "Envoyer")

