# MonERP — Application de gestion d'entreprise (ERP)

Application web responsive de gestion d'entreprise : clients, fournisseurs, stock, documents commerciaux (devis, bons de commande, bons de livraison, factures) avec impression personnalisable.

## Fonctionnalités

- **Tableau de bord** : indicateurs (clients, fournisseurs, CA facturé, valeur du stock), alertes de stock, factures en attente
- **Gestion clients** : CRUD complet, recherche, coordonnées, n° TVA, notes
- **Gestion fournisseurs** : CRUD complet
- **Gestion de stock** : produits (référence, catégorie, prix achat/vente, seuil d'alerte), entrées/sorties de stock, historique des mouvements, alertes de rupture
- **Documents commerciaux**, séparés en deux familles :
  - **Documents clients (ventes)** : devis, bons de livraison, factures
  - **Documents fournisseurs (achats)** : bons de commande, bons de réception, factures fournisseurs
  - Numérotation automatique (DEV-0001, BL-0001, FAC-0001, BC-0001, BR-0001, FF-0001)
  - Lignes depuis le catalogue produits, remises, TVA, totaux auto
  - Statuts (brouillon, envoyé, accepté, validé, payé, à régulariser…)
  - Validation d'un bon de livraison / d'un bon de réception / d'une facture → mise à jour automatique du stock (la facture validée sort du stock)
  - Montant total en toutes lettres sur les documents imprimés
- **Personnalisation** : logo (upload), informations de l'entreprise (nom, SIRET, TVA, adresse…), champs personnalisés ajoutables / modifiables / supprimables (ICE, RC, IF…), en-tête, pied de page, couleur d'accent, TVA par défaut
- **Conditions sur les documents** : modifiables et activables / désactivables (Paramètres → En-tête, pied de page & impression)
- **Devises** : EUR, MAD (dirham marocain), USD, CHF, FCFA — la devise par défaut s'applique à toute l'application (stock, tableau de bord, récapitulatifs) et chaque document conserve sa propre devise
- **Impression** : aperçu d'impression de chaque document utilisant la personnalisation (logo, en-tête, pied de page, couleur), avec bouton Imprimer (CSS `@media print`)

## Architecture

- `backend/` — API REST Node.js / Express, stockage JSON (dossier `backend/data`)
- `frontend/` — SPA Vue 3 + Vite, reverse proxy `/api` vers le backend (port 3001)

Le port exposé est celui du frontend (5173) ; les appels `/api/*` sont redirigés vers le backend par le proxy Vite.

## Démarrage

```bash
# Installation (déjà faite)
cd backend && npm install
cd ../frontend && npm install

# Lancer les deux services (frontend exposé)
./start.sh
```

Ou manuellement :

```bash
# Terminal 1 — backend (port 3001)
cd backend && npm run dev

# Terminal 2 — frontend (port 5173)
cd frontend && npm run dev
```

## Données de démonstration

Le script `backend/seed.js` crée un jeu de données de démo (clients, fournisseurs, produits, documents). Il s'exécute automatiquement si les données n'existent pas encore (`npm run seed`).

## Routes principales

| Route | Description |
| --- | --- |
| `/` | Tableau de bord |
| `/clients` | Gestion des clients |
| `/fournisseurs` | Gestion des fournisseurs |
| `/stock` | Produits et mouvements de stock |
| `/documents` | Documents commerciaux (onglet Clients / Fournisseurs, filtres par type) |
| `/documents/nouveau` | Créer un document |
| `/documents/:id/imprimer` | Aperçu et impression personnalisée |
| `/parametres` | Personnalisation (logo, en-tête, pied de page) |
