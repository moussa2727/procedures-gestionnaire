# Architecture Frontend

## Objectif

Ce document définit les contraintes d'architecture du frontend.

Il complète les invariants métier du backend sans jamais les remplacer ni les contourner.

Le frontend est responsable de l'expérience utilisateur.

Le backend demeure l'unique source de vérité pour :

- l'authentification ;
- les autorisations ;
- les règles métier ;
- les transactions ;
- les disponibilités ;
- les validations critiques ;
- les états métier.

Toute nouvelle fonctionnalité devra respecter l'ensemble de ces contraintes.

---

# Principes fondamentaux

- Jamais de JWT dans `localStorage`.
- Jamais de Refresh Token dans `localStorage`.
- Jamais de JWT dans `sessionStorage`.
- Jamais de Refresh Token dans `sessionStorage`.
- Les Refresh Tokens sont exclusivement stockés dans des Cookies HttpOnly.
- Les Access Tokens sont conservés uniquement en mémoire.
- Le frontend ne connaît jamais le Refresh Token.
- Le backend reste l'unique source de vérité.
- Le frontend ne reproduit jamais une règle métier.
- Toutes les validations critiques sont effectuées par le backend.
- Toutes les communications utilisent HTTPS en production.
- Les WebSockets utilisent WSS en production.
- Les données sensibles ne sont jamais journalisées.
- Les composants React ne contiennent jamais de logique métier.
- Les appels API par module sont centralisés.
- Les WebSockets sont centralisés.
- Toutes les nouvelles fonctionnalités respectent les invariants métier existants.

---

# Ordre obligatoire d'implémentation

Les modules doivent être développés dans l'ordre suivant afin de limiter les dépendances et conserver une architecture cohérente.

## 1. Configuration

- Variables d'environnement
- Configuration globale
- URLs API
- URLs WebSocket
- Configuration React Query
- Configuration des providers

---

## 2. Types

- Types globaux
- DTO
- Enums
- Interfaces
- Modèles métier

---

## 3. Bibliothèques utilitaires

- Helpers
- Formatters
- Date
- Validation
- Sanitisation
- Constantes

---

## 4. Services

- API Client
- Auth Service


Aucun composant React ne doit communiquer directement avec le backend.

---

## 5. Gestion de session

- Initialisation
- Vérification de session
- Refresh automatique
- Déconnexion
- Expiration
- Synchronisation des onglets

---

## 6. Authentification

- Login
- Register
- Forgot Password
- Reset Password
- Change Password
- Logout

---

## 7. Gestion des rôles

- ADMIN
- CONSULTANT
- ETUDIANT

Le frontend masque uniquement l'interface.

Toutes les autorisations sont systématiquement vérifiées par le backend.

---

## 8. Layouts

- RootLayout
- AuthLayout
- AdminLayout
- ConsultantLayout
- EtudiantLayout

---

## 9. UI

- Buttons
- Inputs
- Dialogs
- Tables
- Cards
- Pagination
- Forms
- Loaders

---

## 10. Gestion des erreurs

- Error Boundary
- Pages d'erreur
- Gestion HTTP
- Gestion WebSocket
- Notifications

---

## 11. WebSockets

- Connexion
- Déconnexion
- Reconnexion
- Gestion des événements
- Synchronisation

---

## 12. Notifications

- Temps réel
- Toasts
- Notifications persistantes
- Marquage comme lu

---

## 13. Dashboard

---

## 14. Utilisateurs

---

## 15. Destinations

---

## 16. Consultants

---

## 17. Rendez-vous

---

## 18. Procédures

---

## 19. FollowUpMeeting

---

## 20. Contact

---

## 21. Profil

---

## 22. Paramètres

---

## 23. Administration

---

## 24. Optimisations

---

## 25. Tests

---

# Structure du projet

```text
src
│
├── app
│
├── components
│   ├── ui
│   ├── common
│
│
│
├── services
│
├── hooks
│
├── providers
│
├── stores
│
├── lib/api-client.ts
│
├── schemas
│
├── types

```

---
# Gestion des dépendances

Les dépendances doivent respecter strictement la hiérarchie suivante :

```text
Pages
        ↓
Composants UI
        ↓
Hooks
        ↓
Services
        ↓
API
```

Les stores constituent une couche transversale de gestion d'état.

Ils peuvent être utilisés par les hooks et les composants, mais :

- ils ne communiquent jamais directement avec l'API ;
- ils n'implémentent aucune règle métier ;
- ils ne remplacent jamais le cache des données serveur.

Il est interdit :

- qu'un composant UI appelle directement une API ;
- qu'un composant UI implémente une règle métier ;
- qu'un store effectue des requêtes HTTP ou WebSocket ;
- qu'un service dépende d'un composant React ;
- qu'une fonctionnalité contourne cette hiérarchie.
---

# Authentification

Le frontend applique obligatoirement le cycle suivant :

```text
Chargement

↓

Vérification de session

↓

Refresh automatique

↓

Chargement du profil

↓

Chargement des permissions

↓

Chargement des données métier
```

Le frontend ne considère jamais un utilisateur authentifié sans validation du backend.

---

# Gestion des Tokens

Il est strictement interdit d'utiliser :

- localStorage
- sessionStorage
- IndexedDB

pour stocker :

- JWT
- Refresh Token
- Session Token

Les Access Tokens :

- restent uniquement en mémoire ;
- disparaissent lors d'un rechargement de page ;
- sont régénérés automatiquement grâce au Cookie HttpOnly.

Le Refresh Token :

- n'est jamais accessible au JavaScript ;
- est exclusivement stocké dans un Cookie HttpOnly sécurisé.

---

# Cookies

Les Cookies doivent être configurés avec :

- HttpOnly
- Secure
- SameSite adapté
- durée limitée
- rotation automatique

Le frontend ne lit jamais directement ces cookies.

---

# API

Toutes les requêtes passent obligatoirement par un client HTTP unique: depuis : api/api-client.ts.

Ce client est responsable de :

- l'ajout automatique des credentials ;
- la gestion du refresh ;
- la gestion des erreurs ;
- l'annulation des requêtes obsolètes ;
- les retries intelligents ;
- les timeouts.

Aucun `fetch()` ne doit apparaître dans un composant React.

---

# Optimisation des requêtes

Les données serveur sont gérées par une bibliothèque de cache dédiée.

Les règles suivantes sont obligatoires :

- déduplication automatique des requêtes ;
- cache intelligent ;
- invalidation automatique après mutation ;
- pagination serveur ;
- recherche serveur ;
- préchargement des données lorsque pertinent ;
- annulation des requêtes inutiles.

Les disponibilités des consultants doivent être rechargées avant toute tentative de réservation.

---

# Validation

Le frontend valide les formulaires uniquement pour améliorer l'expérience utilisateur.

Le backend valide systématiquement :

- les données ;
- les permissions ;
- les contraintes métier ;
- les disponibilités.

Le frontend ne remplace jamais ces validations mais les complètes avec ses propres validation et types conformes au backend sur chaque module dans schemas et types.

---

# Sanitisation

Toutes les entrées utilisateur sont systématiquement nettoyées avant affichage.

Il est interdit d'injecter directement une donnée provenant du backend dans le DOM.

Les contenus HTML doivent être désinfectés.

---

# Gestion des rôles

Le frontend masque certaines fonctionnalités selon le rôle.

Cependant :

- ADMIN
- CONSULTANT
- ETUDIANT

sont toujours revérifiés par le backend avant toute opération.

Le rôle n'est jamais considéré comme une garantie de sécurité.

---

# Gestion des erreurs

Toutes les erreurs doivent être :

- explicites ;
- compréhensibles ;
- cohérentes.

Il est interdit d'afficher :

- stack traces ;
- erreurs Prisma ;
- erreurs SQL ;
- erreurs Redis ;
- JWT ;
- informations serveur ;
- chemins internes ;
- variables d'environnement.

---

# Journalisation

Le frontend journalise uniquement les erreurs nécessaires au diagnostic.

Il est interdit de journaliser :

- JWT ;
- Refresh Tokens ;
- Cookies ;
- mots de passe ;
- réponses API complètes ;
- données personnelles sensibles ;
- informations d'authentification.

En production, les journaux doivent être réduits au strict minimum.

---

# WebSockets

Les WebSockets utilisent le cycle suivant :

```text
Authentification

↓

Connexion

↓

Abonnement

↓

Réception des événements

↓

Déconnexion automatique si session invalide

↓

Refresh automatique

↓

Nouvelle connexion
```

Le token utilisé lors du handshake reste exclusivement en mémoire.

Le renouvellement de session s'effectue via les Cookies HttpOnly.

---

# HTTPS

En production :

- HTTPS obligatoire ;
- WSS obligatoire ;
- Cookies Secure obligatoires ;
- aucune communication HTTP non sécurisée.

---

# Feedback utilisateur

Toute action utilisateur doit fournir un retour clair :

- chargement ;
- succès ;
- erreur ;
- confirmation ;
- progression lorsque nécessaire.

Le feedback ne doit jamais divulguer d'informations sensibles.

---

# Respect des invariants métier

Le frontend respecte systématiquement les invariants définis par le backend.

Il ne doit jamais tenter de reproduire ou contourner :

- les autorisations ;
- les transactions ;
- les disponibilités ;
- les réservations atomiques ;
- les verrous logiques ;
- les contraintes d'intégrité ;
- les états finaux ;
- les règles métier futures.

Le backend demeure en permanence l'unique source de vérité.

---

# Contraintes générales

Il est interdit :

- d'utiliser `localStorage` pour les informations sensibles ;
- d'utiliser `sessionStorage` pour les informations sensibles ;
- de dupliquer la logique métier ;
- de recalculer les disponibilités côté frontend ;
- de contourner les contrôles d'autorisation ;
- de conserver des données métier obsolètes ;
- de réaliser des appels API directement dans les composants ;
- d'exposer des informations sensibles dans les messages d'erreur et logs ;
- de journaliser des informations confidentielles ;
- d'utiliser des émojis dans les interfaces, les messages système, les notifications ou la documentation technique.

Toute évolution du frontend devra respecter l'ensemble des contraintes décrites dans ce document.