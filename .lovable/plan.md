
1) Corriger immédiatement la cause du blocage cross-origin des assets  
- Modifier `vite.config.ts` pour supprimer la base absolue (`https://ventou.shop/`) et revenir à une base relative (`/`) en production.  
- Vérifier qu’aucune autre config Vite n’impose un host absolu pour les chunks/assets.

2) Rendre la génération d’URLs 100% agnostique au domaine  
- Ajouter un helper central (ex: `src/lib/domain.ts`) pour construire les URLs storefront depuis `window.location` + slug, sans hardcode `ventou.shop`.  
- Remplacer les hardcodes dans:  
  - `src/pages/ShopCreatedSuccess.tsx`  
  - `src/pages/Dashboard.tsx`  
  - `src/pages/CreateShop.tsx` (affichage preview domaine)  
  - `src/pages/EditProduct.tsx` (liens produit)  
  - textes/UI dépendants si nécessaire (`SettingsSeo`, i18n labels dynamiques).

3) Uniformiser la stratégie CORS côté Edge Functions (durcie mais compatible multi-tenant)  
- Créer une util CORS partagée pour fonctions Supabase avec:  
  - `Access-Control-Allow-Origin` dynamique (origin exact si `https://ventou.shop` ou pattern `https://*.ventou.shop`)  
  - `Vary: Origin`  
  - `Access-Control-Allow-Headers` complet (incluant headers Supabase client)  
  - gestion `OPTIONS` systématique + headers sur toutes les réponses d’erreur/succès.  
- Appliquer à:  
  - `supabase/functions/check-slug/index.ts`  
  - `supabase/functions/send-email/index.ts`  
  - `supabase/functions/smtp-relay/index.ts`  
  - `supabase/functions/encrypt-config/index.ts`.

4) Ajuster l’architecture de routage multi-tenant  
- Conserver `getStoreSlugFromHostname()` (déjà compatible wildcard) et vérifier qu’aucune redirection/URL interne ne force `ventou.shop`.  
- Vérifier que les providers/contextes storefront restent isolés par hostname et ne dépendent pas d’un domaine fixe.

5) Validation de compatibilité production (obligatoire avant go-live)  
- Publier frontend après correction Vite.  
- Tests E2E à exécuter:  
  - `https://ventou.shop`  
  - `https://www.ventou.shop`  
  - `https://test.ventou.shop`  
  - `https://slug.ventou.shop` réel en DB.  
- Vérifications réseau:  
  - assets JS/CSS chargés depuis le même origin de la page (pas `ventou.shop` forcé depuis un sous-domaine)  
  - absence d’erreurs MIME/CORS sur assets  
  - requête `~api/analytics` envoyée vers l’origin courant, sans preflight bloqué  
  - appels Supabase Edge Functions OK depuis sous-domaines.

6) Détails techniques (implémentation ciblée)  
- Fichiers principaux à modifier:  
  - `vite.config.ts`  
  - `src/lib/domain.ts` (nouveau)  
  - `src/pages/ShopCreatedSuccess.tsx`  
  - `src/pages/Dashboard.tsx`  
  - `src/pages/CreateShop.tsx`  
  - `src/pages/EditProduct.tsx`  
  - `supabase/functions/check-slug/index.ts`  
  - `supabase/functions/send-email/index.ts`  
  - `supabase/functions/smtp-relay/index.ts`  
  - `supabase/functions/encrypt-config/index.ts`  
- Déploiements:  
  - frontend: bouton Publish/Update  
  - edge functions: déploiement immédiat après modifications.
