

## Plan : Notification Commande Automatique via Database Webhook

### Diagnostic

L'email de la derniere commande (12 mars 11:56) a bien ete envoye avec succes (`status: success` dans `email_logs`). Cependant, le systeme actuel repose sur un appel **cote client** (fire-and-forget depuis le navigateur du client). Si le navigateur ferme trop vite ou la connexion coupe, l'appel ne part jamais.

### Solution : Database Webhook (temps reel garanti)

Remplacer l'appel client par un **trigger PostgreSQL + pg_net** qui appelle automatiquement `notify-order` a chaque INSERT dans la table `orders`. Ainsi, des qu'une commande est inseree en base, la notification part immediatement, sans dependre du navigateur.

### Modifications

**1. Migration SQL : Trigger sur INSERT orders**

Creer une fonction PL/pgSQL qui utilise `pg_net` (extension deja disponible sur Supabase) pour envoyer un HTTP POST a `notify-order` automatiquement apres chaque insertion de commande.

```text
INSERT orders → trigger → pg_net.http_post → notify-order → send-email → SMTP
```

**2. CheckoutDrawer : Supprimer l'appel client**

Retirer le bloc `supabase.functions.invoke('notify-order', ...)` devenu inutile puisque le trigger DB s'en charge.

**3. notify-order : Ajouter des logs de debug**

Ajouter des logs plus detailles pour tracer chaque etape et faciliter le diagnostic futur.

### Fichiers modifies

| Fichier | Action |
|---------|--------|
| Migration SQL | Trigger `after_order_insert` + appel `pg_net.http_post` |
| `src/components/storefront/CheckoutDrawer.tsx` | Supprimer l'appel fire-and-forget |
| `supabase/functions/notify-order/index.ts` | Logs ameliores |

