

## Plan : Templates Email Responsives + Envoi Automatique sur Commande

### Vue d'ensemble

Creer les 22 templates email professionnels en base, avec un HTML responsive (mobile/tablette/desktop), un emplacement pour le logo Ventou, et les tags specifiques a chaque template affiches dans l'admin. Puis automatiser l'envoi d'email au vendeur a chaque nouvelle commande via une Edge Function dediee appelee depuis le checkout.

### 1. Migration SQL : Seed des 22 templates

Inserer tous les templates avec un corps HTML responsive utilisant des tables HTML (compatibilite email), le logo Ventou en haut, et des variables `{{tag}}` specifiques par template.

Les 22 templates couvrent 5 categories :
- **Auth** (5) : email_verification, password_reset, two_factor_code, account_approved, account_suspended
- **Boutique** (6) : welcome_vendor, store_created, store_approved, store_rejected, store_suspended, store_reactivated
- **Commandes** (6) : new_order_vendor, order_confirmation_customer, order_cancelled, order_refunded, order_shipped, order_delivered
- **Abonnements** (6) : subscription_activated, subscription_expiring_7_days, subscription_expiring_1_day, subscription_expired, plan_upgraded, plan_downgraded
- **Admin** (4) : vendor_report_warning, manual_admin_action, payment_failed, payment_success

Chaque template utilise un body HTML avec structure `<table>` pour le rendu email, pas de CSS externe (inline styles uniquement). Le layout est :

```text
┌──────────────────────────┐
│   [Logo Ventou / image]  │  ← header sombre
├──────────────────────────┤
│                          │
│   Contenu du mail        │  ← padding 35px, max-width 100%
│   avec {{variables}}     │
│                          │
├──────────────────────────┤
│   © 2026 Ventou          │  ← footer gris clair
└──────────────────────────┘
```

Le body de chaque template ne contient QUE le contenu interieur (pas le wrapper) car le `wrapInLayout()` dans send-email ajoute deja le header/footer.

### 2. Edge Function `notify-order`

Nouvelle fonction sans JWT (appelee depuis le checkout par des utilisateurs anonymes) qui :
- Recoit `order_id` et `shop_id`
- Charge la commande, la boutique et l'email du proprietaire (via `shops.owner_id` → `auth.users`)
- Appelle la fonction `send-email` en interne (service_role) avec le template `new_order_vendor`
- Envoie aussi `order_confirmation_customer` si le client a un email (futur, pas bloquant)

### 3. Appel depuis CheckoutDrawer

Apres l'insertion reussie de la commande, fire-and-forget un appel a `notify-order` avec l'order_id et shop_id.

### 4. Admin UI : Tags par template

Ajouter dans `AdminEmailTemplates.tsx` un mapping `TEMPLATE_TAGS` qui affiche les variables disponibles pour chaque template quand on l'edite. Ex: pour `new_order_vendor` → `{{customer_name}}`, `{{order_id}}`, `{{total}}`, `{{items_list}}`, `{{store_name}}`, etc.

### Fichiers modifies

| Fichier | Action |
|---------|--------|
| Migration SQL | INSERT 22 templates avec HTML responsive |
| `supabase/functions/notify-order/index.ts` | Nouvelle Edge Function (fire-and-forget) |
| `supabase/config.toml` | Ajouter `[functions.notify-order] verify_jwt = false` |
| `src/components/storefront/CheckoutDrawer.tsx` | Appel notify-order apres insert commande |
| `src/pages/admin/AdminEmailTemplates.tsx` | Afficher tags disponibles par template |

### Details techniques

- Les templates utilisent `INSERT ... ON CONFLICT (slug) DO NOTHING` pour ne pas ecraser les templates existants
- Le HTML est responsive grace a `max-width:600px` + `width:100%` sur les tables, tailles de police en px, padding adaptatif
- `notify-order` utilise le service_role pour bypasser le JWT de send-email et les RLS
- L'appel depuis le checkout est non-bloquant (pas de `await`) pour ne pas ralentir l'UX

