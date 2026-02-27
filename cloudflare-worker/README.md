# Cloudflare Worker — Ventou Wildcard Subdomain Proxy

## Problème résolu

Lovable sert les assets statiques (JS, CSS) uniquement sur le domaine custom enregistré (`ventou.shop`).  
Les sous-domaines wildcard (`*.ventou.shop`) reçoivent le HTML mais les assets retournent 404.

Ce Worker intercepte les requêtes sur `*.ventou.shop` et proxyfie les assets depuis `ventou.shop`.

## Déploiement étape par étape

### 1. Créer le Worker

1. Va sur [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Sélectionne le compte qui gère `ventou.shop`
3. Va dans **Workers & Pages** → **Create**
4. Choisis **Create Worker**
5. Nomme-le : `ventou-wildcard-proxy`
6. Clique **Deploy** (avec le code par défaut)
7. Clique **Edit Code**
8. **Remplace tout le contenu** par le code de `ventou-wildcard-proxy.js`
9. Clique **Save and Deploy**

### 2. Ajouter la Route

1. Va dans **Workers & Pages** → `ventou-wildcard-proxy` → **Settings** → **Triggers**
2. Sous **Routes**, clique **Add Route**
3. Configure :
   - **Route** : `*.ventou.shop/*`
   - **Zone** : `ventou.shop`
4. Clique **Save**

⚠️ **NE PAS** ajouter de route pour `ventou.shop/*` — le domaine racine fonctionne déjà sans Worker.

### 3. Vérifier le DNS (déjà fait normalement)

```
*.ventou.shop   CNAME   ventouci.lovable.app   (Proxied ☁️)
```

- SSL/TLS mode : **Full** (pas Strict)
- Le proxy Cloudflare (☁️ orange) doit être activé sur l'enregistrement wildcard

### 4. Tester

```bash
# Doit retourner le JS avec Content-Type: application/javascript
curl -I https://test.ventou.shop/assets/index-gblp-g1N.js

# Doit retourner 200 avec CORS headers
curl -I -H "Origin: https://test.ventou.shop" https://test.ventou.shop/~flock.js

# Le HTML doit charger normalement
curl -s https://test.ventou.shop | head -5
```

### 5. Vérifier dans le navigateur

1. Ouvre `https://test.ventou.shop`
2. Ouvre DevTools (F12) → Network
3. Vérifie que les fichiers `/assets/*.js` et `/assets/*.css` retournent **200** avec le bon MIME type
4. Vérifie qu'il n'y a plus d'erreur CORS dans la console

## Architecture

```
Navigateur (test.ventou.shop)
    │
    ├─ /index.html ──────────► Cloudflare → Lovable origin (passthrough)
    │
    ├─ /assets/*.js ─────────► Cloudflare Worker
    │                              │
    │                              └─► Fetch ventou.shop/assets/*.js
    │                                  (Host: ventou.shop)
    │                                  ← Réponse + MIME fix + CORS + Cache
    │
    └─ /~api/analytics ──────► Cloudflare Worker
                                   │
                                   └─► Fetch ventou.shop/~api/analytics
                                       ← Réponse + CORS headers
```

## Maintenance

- **Aucune maintenance requise** : le Worker proxyfie dynamiquement toutes les requêtes.
- **Nouveau sous-domaine** : fonctionne automatiquement, rien à configurer.
- **Mise à jour Lovable** : les nouveaux hashes d'assets sont gérés automatiquement.
- **Monitoring** : visible dans Workers & Pages → Analytics.
