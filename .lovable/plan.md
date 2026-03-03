

# Plan: Page Clients Ventou

## Contexte

La route `/dashboard/customers` existe dans la navigation mais aucune page n'est implémentée. Les données clients seront extraites de la table `orders` (agrégation par `phone`). Pas de table `customers` dédiée — on regroupe par numéro de téléphone.

## Fichiers à créer/modifier

### 1. `src/hooks/useCustomers.ts` (nouveau)

Hook `useCustomers(shopId)` qui :
- Récupère toutes les commandes du shop (`customer_name`, `phone`, `city`, `quartier`, `status`, `total`, `created_at`, `id`)
- Agrège côté client par `phone` : nom, ville, total commandes, livrées, annulées, date première commande, montant total
- Calcule le badge automatique (fidèle ≥3 livrées, nouveau = 1 commande, à risque ≥2 annulées)
- Supporte recherche par nom/téléphone et pagination (20/page)
- Retourne aussi le count total

### 2. `src/pages/Customers.tsx` (nouveau)

Page complète avec `DashboardLayout` :

**Header** : "Clients" + "X clients enregistrés" + barre recherche

**Desktop** : Table avec colonnes Avatar (initiales), Nom, Téléphone (lien `tel:`), Ville, Total cmd, Livrées, Annulées, Badge, Voir →

**Mobile** : Cartes compactes avec nom, téléphone, ville, résumé "X commandes • Y livrées • Z annulées", badge, boutons Appeler/WhatsApp

**Drawer détail client** (Sheet droite desktop 420px, full mobile) :
- Bloc Contact : nom, téléphone, boutons Appeler/WhatsApp, ville/quartier, date 1re commande
- Bloc Résumé : 3 mini-cards (Total, Livrées, Annulées)
- Bloc Historique : liste compacte des commandes (ID, date, montant, badge statut), cliquable vers `/dashboard/commandes/:id`, pagination 20

### 3. `src/App.tsx`

Ajouter la route `/dashboard/customers` → `Customers` (lazy import)

### 4. `src/i18n/locales/fr.json` + `en.json`

Clés : `customers.title`, `customers.count`, `customers.loyal`, `customers.new`, `customers.atRisk`, `customers.totalOrders`, `customers.delivered`, `customers.cancelled`, `customers.firstOrder`, `customers.orderHistory`

## Données

Pas de nouvelle table DB. Tout est agrégé depuis `orders` existante. La clé de regroupement est le `phone` (identifiant unique du client dans un contexte COD).

## Performance

- Requête unique `orders` avec `select` limité aux colonnes nécessaires
- Agrégation côté client (acceptable pour 200 commandes/jour max)
- Pagination 20 clients/page côté affichage
- Debounce recherche 300ms

