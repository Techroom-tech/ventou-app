
# VENTOU - Plan de Développement MVP

## 🎯 Vision
Plateforme e-commerce pour vendeurs d'Afrique de l'Ouest avec authentification robuste, gestion de boutique, et intégration Mobile Money.

---

## 📦 PHASE 1 : Authentification & Sécurité (Première étape)

### 1.1 Authentification de base
- Page d'inscription avec email + mot de passe
- Page de connexion sécurisée
- Vérification email obligatoire (lien de confirmation)
- Réinitialisation de mot de passe par email
- Protection "Leaked Password" via Supabase (HaveIBeenPwned)

### 1.2 Authentification à deux facteurs (2FA)
- Configuration 2FA avec Google Authenticator (génération QR code)
- Email OTP comme méthode de secours
- 2FA obligatoire pour actions sensibles (définies dans Phase 2+)
- Interface d'activation/désactivation dans les paramètres

### 1.3 Logs de sécurité
- Historique des connexions (date, IP, appareil)
- Enregistrement des tentatives échouées
- Journal d'activation/utilisation 2FA

### 1.4 Système de rôles
- Table user_roles séparée (admin, support, vendor)
- Fonctions RLS sécurisées pour vérification des rôles

### 1.5 Internationalisation (i18n)
- Support Français + Anglais
- Toggle de langue dans le header
- Toutes les pages traduites

### 1.6 Design de base VENTOU
- Palette : Bleu profond (#1E3A5F), Orange CTA (#FF6B35), Blanc
- Layout mobile-first responsive
- Animations légères (fade, hover)

---

## 📦 PHASE 2 : Espace Vendeur - Profil & Paramètres

### 2.1 Profil vendeur
- Édition : Nom, prénom, téléphone, pays, ville
- Photo de profil (upload sécurisé)
- Langue préférée et fuseau horaire
- Email en lecture seule

### 2.2 Paramètres de sécurité (onglet séparé)
- Changement de mot de passe
- Gestion 2FA (activer/désactiver/régénérer clé)
- Indicateur de niveau de sécurité du compte

---

## 📦 PHASE 3 : Boutique & Produits

### 3.1 Création de boutique
- Nom et description de la boutique
- Upload logo (storage sécurisé par shop_id)
- URL personnalisée : nom.ventou.shop
- Statut : active / suspendue

### 3.2 Gestion des produits
- CRUD complet (créer, lire, modifier, supprimer)
- Upload d'images multiples (storage sécurisé)
- Prix et stock optionnel
- Variantes simples (taille, couleur)

### 3.3 Catégories
- Création de catégories personnalisées
- Organisation drag & drop
- Filtrage des produits par catégorie

### 3.4 SEO basique
- Slug automatique pour chaque produit
- Champs meta title et meta description

---

## 📦 PHASE 4 : Commandes & Checkout

### 4.1 Page checkout publique
- Formulaire client : nom, téléphone, adresse
- Validation côté client et serveur (Zod)
- Génération de numéro de commande sécurisé

### 4.2 Gestion des commandes (vendeur)
- Liste des commandes avec statuts
- Statuts : en attente, payée, annulée
- Détails de chaque commande
- Notification au vendeur (nouvelle commande)

---

## 📦 PHASE 5 : Paiements

### 5.1 Méthodes de paiement
- Mobile Money (architecture préparée pour Orange Money)
- Option "Paiement à la livraison"

### 5.2 Gestion des paiements
- Confirmation manuelle ou automatique
- Statut de paiement par commande
- Historique des paiements pour le vendeur
- 2FA obligatoire pour les retraits

---

## 📦 PHASE 6 : Gestion Clients

### 6.1 Base clients
- Liste des clients par boutique
- Informations : nom, téléphone, email
- Historique des commandes par client
- Accès protégé par RLS (propriétaire boutique uniquement)

---

## 📦 PHASE 7 : Notifications & Emails

### 7.1 Notifications in-app
- Nouvelle commande
- Paiement reçu
- Alertes sécurité
- Messages support

### 7.2 Emails transactionnels
- Email de bienvenue
- Vérification email
- Reset mot de passe
- Code 2FA
- Confirmation commande
- Paiement confirmé / échoué

### 7.3 Préférences notifications
- Activer/désactiver par type (commandes, paiements, infos boutique)
- Notifications sécurité non désactivables

---

## 📦 PHASE 8 : Espace Super-Admin

### 8.1 Dashboard admin
- Route protégée /admin (rôles admin/support seulement)
- Vue d'ensemble plateforme

### 8.2 Gestion utilisateurs
- Liste, recherche, filtrage
- Actions : voir, suspendre, bloquer, changer rôle

### 8.3 Gestion boutiques
- Liste de toutes les boutiques
- Modération et suspension

### 8.4 Commandes & Paiements globaux
- Vue consolidée de toutes les commandes
- Suivi des paiements plateforme

### 8.5 Support & CMS
- Système de tickets support
- Pages CMS basiques (CGU, mentions légales, etc.)

### 8.6 Réglages plateforme
- Paramètres globaux
- Logs admin (audit trail)

---

## 🛠️ Architecture Technique

- **Frontend** : React avec TypeScript, Tailwind CSS, mobile-first
- **Backend** : Votre Supabase (Auth, Database, Storage)
- **Sécurité** : RLS strictes, validation Zod, séparation des rôles
- **i18n** : Support FR/EN intégré dès Phase 1
- **Storage** : Sécurisé par owner (RLS sur buckets)

---

## 🚀 Prochaine action

Nous commencerons par **Phase 1 : Authentification complète** avec inscription, connexion, vérification email, reset mot de passe, 2FA, logs de sécurité, et le design de base VENTOU bilingue.
