# Audit complet et refonte de l’architecture frontend Next.js — conformité stricte avec le backend

## Contexte du projet

Je développe actuellement le **frontend exclusivement avec Next.js**. Il n’existe **aucune application mobile** à prendre en compte pour cette architecture.

Le backend est déjà développé et constitue la **source de vérité absolue** concernant :

* l’authentification ;
* les rôles et permissions ;
* les utilisateurs ;
* les procédures ;
* les rendez-vous ;
* les destinations ;
* les contacts ;
* les notifications ;
* les fichiers ;
* les WebSockets / gateways ;
* les réponses API ;
* les DTO ;
* les enums ;
* les statuts ;
* les méthodes HTTP ;
* les événements WebSocket ;
* les données retournées ;
* les règles métier.

Je veux que le frontend soit construit **strictement à partir des capacités réellement offertes par le backend**.

---

# 1. Objectif principal

Effectue une **revue complète de tout ce qui a déjà été défini et développé pour le frontend** et vérifie sa conformité avec le backend.

Je veux identifier et corriger :

* les incohérences entre frontend et backend ;
* les routes frontend incorrectes ;
* les types TypeScript incorrects ;
* les schemas Zod incorrects ou trop permissifs ;
* les DTO frontend qui ne correspondent pas au backend ;
* les stores incomplets ;
* les hooks incomplets ;
* les services API incomplets ;
* les méthodes HTTP incorrectes ;
* les paramètres incorrects ;
* les structures de réponses incorrectes ;
* les enums qui ne correspondent pas au backend ;
* les statuts qui ne correspondent pas au backend ;
* les événements WebSocket incorrects ;
* les payloads WebSocket incorrects ;
* les redirections incorrectes ;
* les problèmes de protection des routes ;
* les problèmes de gestion des rôles ;
* les problèmes de layouts ;
* les problèmes de synchronisation de session ;
* les problèmes de refresh token ;
* les problèmes de déconnexion ;
* les problèmes de permissions ;
* les appels API manquants ;
* les fonctionnalités backend qui ne sont pas exploitées côté frontend.

**Ne rien inventer.**

Si une méthode, une route, un champ, un événement WebSocket, un rôle, une permission ou une réponse n’existe pas réellement dans le backend, ne pas l’ajouter au frontend comme s’il existait.

---

# 2. Règle absolue : le backend est la source de vérité

Pour chaque fonctionnalité frontend, vérifier systématiquement :

```text
Backend
   ↓
Controller
   ↓
Route HTTP
   ↓
DTO
   ↓
Service
   ↓
Response DTO
   ↓
Frontend service
   ↓
Frontend types
   ↓
Frontend schema
   ↓
Frontend hook
   ↓
Frontend store
   ↓
Page / composant
```

Les types frontend doivent refléter **exactement** les contrats backend.

Ne pas simplement créer des interfaces approximatives.

Par exemple, si le backend expose :

```ts
enum UserRole {
  ADMIN
  STUDENT
  CONSULTANT
}
```

le frontend doit utiliser exactement les mêmes valeurs et ne doit pas inventer :

```ts
MANAGER
GESTIONNAIRE
USER
SUPER_ADMIN
```

sauf si ces valeurs existent réellement dans le backend.

Même règle pour :

* enums ;
* statuts ;
* noms de propriétés ;
* propriétés obligatoires ;
* propriétés optionnelles ;
* valeurs nullables ;
* paramètres ;
* pagination ;
* filtres ;
* dates ;
* fichiers ;
* erreurs ;
* réponses ;
* événements WebSocket.

---

# 3. Authentification frontend

Vérifier intégralement l’implémentation de l’authentification.

Le système frontend doit prendre en compte :

* connexion ;
* déconnexion ;
* récupération de la session ;
* utilisateur connecté ;
* access token ;
* refresh token si le backend l'utilise ;
* expiration du token ;
* renouvellement du token ;
* révocation du token ;
* gestion des sessions ;
* gestion des erreurs 401 ;
* gestion des erreurs 403 ;
* restauration de session après rechargement ;
* protection des routes ;
* redirection après connexion ;
* redirection lorsqu'un utilisateur non authentifié tente d'accéder à une route protégée ;
* redirection lorsqu'un utilisateur authentifié tente d'accéder à une route qui ne correspond pas à son rôle.

Le frontend ne doit jamais considérer qu’un utilisateur est administrateur simplement parce qu’une route `/admin/*` est visitée.

Le rôle doit provenir de la **session / réponse backend réellement disponible**.

---

# 4. Gestion stricte des rôles

Le système doit être **Role Based Access Control (RBAC)**.

Les rôles doivent être ceux réellement définis par le backend.

Dans mon système, les trois espaces principaux sont :

```text
admin/
consultant/
etudiant/
```

avec les redirections après connexion suivantes :

```text
Étudiant
→ /etudiant/mon-profil

Consultant
→ /consultant/mon-profil

Admin
→ /admin/mon-profil
```

Ces redirections doivent être centralisées dans une logique unique de détection de rôle et de rédirection après authentification.


```

Ne pas disperser cette logique dans plusieurs composants.

---

# 5. Protection des routes

Mettre en place une stratégie claire de protection des routes.

Il doit être impossible pour :

```text
STUDENT
```

d’accéder à :

```text
/admin/*
/consultant/*
```

et impossible pour :

```text
CONSULTANT
```

d’accéder à :

```text
/admin/*
/etudiant/*
```

et impossible pour :

```text
ADMIN
```

d'accéder aux espaces nécessitant un rôle différent.

La protection frontend doit améliorer l’expérience utilisateur mais **ne doit jamais être considérée comme une sécurité suffisante**.

Le backend reste responsable de la véritable autorisation.

---

# 6. Architecture des layouts

Je veux utiliser les layouts suivants :

```text
ROOTLAYOUT comme layout de base
AUTHLAYOUT comme layout de (auth)/
MAINLAYOUT comme layout commun de (main)/
ADMINLAYOUT comme layout commun de base (gestionnaire)/admin/ pour ADMIN
STUDENTLAYOUT comme layout commun de base pour etudiant/ pour ETUDIANT
CONSULTANTLAYOUT comme layout commun de base de (gestionnaire/consultant/) CONSULTANT
```

Déterminer précisément le rôle de chacun et leur emplacement dans `app/`.

## ROOTLAYOUT

Le `RootLayout` doit être le layout global Next.js.

Il doit contenir uniquement les éléments réellement globaux :

* `<html>`;
* `<body>`;
* providers globaux ;
* éventuellement thème ;
* configuration globale ;
* systèmes globaux nécessaires à toute l'application.

Il ne doit pas imposer une authentification.

---

# 7. AUTHLAYOUT

`AUTHLAYOUT` doit être **public**.

Il ne nécessite aucune authentification.

Il doit être utilisé pour les pages telles que :

```text
/login
/register
/forgot-password
/reset-password
```

uniquement si ces fonctionnalités existent réellement dans le backend.

Le layout ne doit donc pas empêcher un utilisateur non authentifié d'accéder aux pages d’authentification.

À l’inverse, si un utilisateur est déjà authentifié et visite une page d’authentification, déterminer s’il doit être redirigé vers son espace selon son rôle.

---

# 8. MAINLAYOUT

Déterminer précisément ce qui doit être placé dans `MAINLAYOUT`.

Il doit servir uniquement aux pages qui nécessitent une structure applicative commune mais qui ne sont pas spécifiques à un rôle.

Ne pas y appliquer de vérifications forcées d'authentification aussi ne pas utiliser `MAINLAYOUT` pour remplacer abusivement les layouts:

```text
ADMINLAYOUT
STUDENTLAYOUT
CONSULTANTLAYOUT
AUTHLAYOUT
```

---

# 9. ADMINLAYOUT

L’espace administrateur est :

```text
/admin/*
```

`ADMINLAYOUT` doit être placé au niveau permettant de protéger et structurer toutes les pages :

```text
app/(gestionnaire)/admin/layout.tsx
```

Il doit :

* vérifier l’authentification ;
* vérifier le rôle ADMIN ;
* empêcher l’accès aux autres rôles ;
* fournir la navigation administrateur ;
* fournir les providers/stores strictement nécessaires à l’espace admin ;
* gérer les états de chargement correctement.

La page :

```text
/admin/mon-profil
```

doit être la destination par défaut d’un ADMIN après connexion.

---

# 10. CONSULTANTLAYOUT

L’espace consultant est :

```text
/consultant/*
```

Le layout doit donc être :

```text
app/(gestionnaire)/consultant/layout.tsx
```

Il doit :

* vérifier l’authentification ;
* vérifier le rôle consultant réellement défini dans le backend ;
* empêcher les autres rôles d’y accéder ;
* fournir la navigation consultant ;
* gérer les fonctionnalités propres aux consultants.

La destination après connexion est :

```text
/consultant/mon-profil
```

---

# 11. STUDENTLAYOUT

L’espace étudiant est :

```text
/etudiant/*
```

Le layout doit donc être :

```text
app/etudiant/layout.tsx
```

Il doit :

* vérifier l’authentification ;
* vérifier le rôle étudiant réellement défini dans le backend ;
* empêcher les autres rôles d’y accéder ;
* fournir la navigation étudiant ;
* gérer les fonctionnalités propres aux étudiants.

La destination après connexion est :

```text
/etudiant/mon-profil
```

---

# 12. Structure `app/` souhaitée

Proposer une structure Next.js App Router optimale et cohérente avec les fonctionnalités réellement disponibles dans le backend.

La structure doit respecter au minimum le principe :

```text
app/
├── layout.tsx
│
├── (auth)/
│   ├── layout.tsx
│   ├── login/
│   │   └── page.tsx
│   ├── register/
│   │   └── page.tsx
│   ├── forgot-password/
│   │   └── page.tsx
│   ├── reset-password/
│   │   └── page.tsx
│   └── verify-email/
│       └── page.tsx
│
├── (main)/
│   ├── layout.tsx
│   └── ...
│
├── admin/
│   ├── layout.tsx
│   ├── mon-profil/
│   │   └── page.tsx
│   └── ...
│
├── consultant/
│   ├── layout.tsx
│   ├── mon-profil/
│   │   └── page.tsx
│   └── ...
│
└── etudiant/
    ├── layout.tsx
    ├── mon-profil/
    │   └── page.tsx
    └── ...
```

Mais cette structure doit être **adaptée aux routes et fonctionnalités réellement exposées par le backend**.

Ne pas créer artificiellement des pages uniquement pour remplir l’arborescence.

---

# 13. Exploitation complète du backend

Faire une matrice de correspondance :

| Backend      | Frontend             |
| ------------ | -------------------- |
| Controller   | API service          |
| Endpoint     | Méthode service      |
| DTO          | Type + schema        |
| Response DTO | Response type        |
| Enum         | Frontend enum/type   |
| Guard        | Route protection     |
| Role         | RBAC                 |
| Gateway      | WebSocket service    |
| Event        | WebSocket event type |
| Pagination   | Query type + UI      |
| Filters      | Query schema         |
| File upload  | FormData service     |
| Error        | Error type + handler |

Pour **chaque controller backend**, vérifier :

1. quelles routes existent ;
2. quelles méthodes HTTP existent ;
3. quels paramètres sont nécessaires ;
4. quels DTO sont attendus ;
5. quelles réponses sont retournées ;
6. quelles erreurs peuvent être retournées ;
7. quels rôles sont autorisés ;
8. quelles routes nécessitent une authentification ;
9. quelles routes nécessitent des permissions particulières ;
10. quelle fonctionnalité frontend correspondante doit exister.

---

# 14. Services frontend

Auditer tous les services frontend.

Chaque service doit exposer uniquement les méthodes réellement disponibles dans le backend.

Exemples de domaines à vérifier selon le backend :

```text
auth.service.ts
user.service.ts
procedures.service.ts
consultant-destinations.services
rendezvous.service.ts
availability.service.ts
follou-up-meeting.service.ts
destinations.service.ts
contacts.service.ts
notifications.service.ts
```

Ne pas créer de méthode frontend si aucune route backend correspondante n'existe.

À l’inverse, identifier toutes les méthodes backend qui ne sont actuellement pas exploitées par le frontend.

---

# 15. Stores

Auditer tous les stores Zustand.

Vérifier notamment :

```text
auth.store.ts
user.store.ts
notification.store.ts
procedure.store.ts
rendezvous.store.ts
```

uniquement lorsque ces stores sont réellement nécessaires.

Chaque store doit :

* avoir des types stricts ;
* éviter de dupliquer inutilement les données serveur ;
* gérer correctement loading/error/success ;
* synchroniser l’état utilisateur avec l’authentification ;
* éviter les états contradictoires ;
* ne pas stocker inutilement les tokens si l’architecture backend utilise des cookies sécurisés ;
* exploiter les réponses réelles du backend.

Déterminer également quelles données doivent rester dans React Query / cache serveur plutôt que dans Zustand si cette architecture est utilisée.

---

# 16. Hooks

Auditer tous les hooks frontend.

Exemples :

```text
useAuth()
useCurrentUser()
useRole()
usePermissions()
useProcedures()
useProcedure()
useRendezvous()
useNotifications()
useWebSocket()
```

Chaque hook doit correspondre à une vraie fonctionnalité.

Vérifier :

* paramètres ;
* retour ;
* types ;
* gestion des erreurs ;
* loading ;
* cache ;
* invalidation ;
* synchronisation ;
* permissions ;
* rôle.

---

# 17. Schemas Zod

Les schemas frontend doivent refléter strictement les DTO backend.

Pour chaque DTO backend :

```text
Backend DTO
      ↓
Frontend TypeScript type
      ↓
Zod schema
      ↓
React Hook Form
      ↓
API request
```

Vérifier particulièrement :

* champs obligatoires ;
* champs optionnels ;
* champs nullable ;
* longueur minimale ;
* longueur maximale ;
* formats email ;
* téléphone ;
* dates ;
* enums ;
* UUID ;
* fichiers ;
* tableaux ;
* objets imbriqués.

Ne pas ajouter des contraintes que le backend n’impose pas sans raison.

Ne pas supprimer les contraintes importantes imposées par le backend.

---

# 18. Types TypeScript

Faire un audit complet des types.

Je veux éviter absolument :

```ts
any
```

lorsqu’un type précis peut être utilisé.

Créer une correspondance claire entre :

```text
Backend DTO
Backend Response DTO
Backend Enum
        ↓
Frontend type
```

Les types doivent également gérer correctement :

```ts
null
undefined
optional
```

et ne jamais transformer arbitrairement :

```ts
string | null
```

en :

```ts
string
```

ou :

```ts
string | undefined
```

sans justification.

---

# 19. WebSockets

Le système frontend doit utiliser les WebSockets **strictement conformément aux gateways NestJS existantes**.

Auditer :

* URL WebSocket ;
* namespace ;
* transport ;
* authentification ;
* handshake ;
* headers ;
* cookies ;
* token ;
* événements entrants ;
* événements sortants ;
* payloads ;
* reconnexion ;
* déconnexion ;
* erreurs ;
* nettoyage des listeners ;
* gestion des connexions multiples ;
* duplication des listeners ;
* rooms ;
* acknowledgements si utilisés.

Si le backend utilise :

```text
Socket.IO
```

le frontend doit utiliser :

```text
socket.io-client
```

et non une implémentation WebSocket native incompatible.

Pour chaque gateway backend, produire une correspondance :

```text
Gateway
   ↓
Namespace
   ↓
Event
   ↓
Payload
   ↓
Frontend listener/emitter
```

Ne jamais inventer un événement.

Exemple :

```ts
socket.on('REAL_BACKEND_EVENT', (payload) => {
  ...
});
```

et non :

```ts
socket.on('notifications:update', ...)
```

simplement parce que ce nom semble logique.

---

# 20. Gestion des WebSockets dans Next.js

Le système doit être compatible avec l’architecture Next.js utilisée.

Identifier précisément :

* quels composants doivent être Client Components ;
* où initialiser la connexion ;
* où conserver l’instance Socket ;
* comment éviter plusieurs connexions ;
* comment nettoyer les listeners ;
* comment reconnecter ;
* comment gérer la session ;
* comment mettre à jour les stores ;
* comment éviter les connexions côté serveur ;
* comment gérer le changement d’utilisateur.

Ne jamais créer une connexion Socket.IO pendant le rendu serveur.

---

# 21. Redirections

Créer une stratégie centralisée pour :

### Non authentifié

```text
/private-route
      ↓
/login
```

### Étudiant

```text
/login
  ↓
/etudiant/mon-profil
```

### Consultant

```text
/login
  ↓
/consultant/mon-profil
```

### Admin

```text
/login
  ↓
/admin/mon-profil
```

### Mauvais rôle

Exemple :

```text
STUDENT
→ /admin
```

doit entraîner une redirection contrôlée vers son espace autorisé ou une page 403 selon la stratégie retenue.

Ne pas créer de boucle de redirection.

---

# 22. proxy Next.js

Déterminer précisément ce qui doit être géré par :

```text
proxy.ts
```

et ce qui doit être géré par :

```text
layout.tsx
```

Le proxy ne doit pas contenir toute la logique métier.

Il doit uniquement effectuer les vérifications adaptées à son contexte.

Tenir compte des particularités de Next.js App Router et du mécanisme réel utilisé pour stocker la session/token.

---

# 23. Pages à identifier

À partir des controllers et fonctionnalités backend, déterminer les pages frontend nécessaires pour :

### Authentification

```text
/login
/register
/forgot-password
/reset-password
```

uniquement si elles existent côté backend.

### Utilisateur

```text
/mon-profil
```

ou les routes spécifiques :

```text
/admin/mon-profil
/consultant/mon-profil
/etudiant/mon-profil
```

### Procédures

Déterminer les pages nécessaires à partir des opérations réellement exposées par `ProceduresController`.

Exemples possibles :

```text
/procedures
/procedures/[id]
/procedures/[id]/...
```

Ne conserver que celles correspondant réellement aux opérations backend.

### Rendez-vous

Déterminer les pages nécessaires à partir de `RendezvousController`.

### Destinations

Déterminer les pages nécessaires à partir de `DestinationsController`.

### Notifications

Déterminer les pages et composants nécessaires à partir du backend.

### Contacts

Déterminer les pages nécessaires à partir de `ContactsController`.

### Fichiers

Déterminer les interfaces nécessaires selon les opérations backend réellement disponibles.

---

# 24. Cas d'utilisation

Je veux que l’audit couvre **tous les cas d’utilisation réellement présents dans le backend**.

Construire une matrice :

| Cas d'utilisation | Rôle | Backend endpoint | Frontend service | Hook | Store | Page | WebSocket |
| ----------------- | ---- | ---------------- | ---------------- | ---- | ----- | ---- | --------- |

Chaque fonctionnalité doit être traçable.

Si une fonctionnalité backend n’a aucun équivalent frontend, la signaler.

Si une fonctionnalité frontend n’a aucun équivalent backend, la signaler également.

---

# 25. Gestion des erreurs

Uniformiser la gestion des :

```text
400
401
403
404
409
422
429
500
```

uniquement lorsque ces codes peuvent réellement être produits par le backend.

Le frontend doit distinguer :

```text
non authentifié
non autorisé
ressource inexistante
validation
conflit
erreur serveur
```

Ne pas transformer toutes les erreurs en message générique.

---

# 26. Architecture finale attendue

Je veux obtenir une architecture proche de :

```text
src/
├── app/
│   ├── layout.tsx
│   │
│   ├── (auth)/
│   │   ├── layout.tsx
│   │   ├── login/
│   │   ├── register/
│   │   ├── forgot-password/
│   │   ├── reset-password/
│   │
│   ├── (main)/
│   │   └── layout.tsx
│   │
│   ├── (gestionnaire)/
|   |   ├── admin/
│   │   ├── layout.tsx
│   │   ├── mon-profil/
│   │   └── ...
|   |   ├── consultant/
│   │   ├── layout.tsx
│   │   ├── mon-profil/
│   │   └── ...
│   │
│   └── etudiant/
│       ├── layout.tsx
│       ├── mon-profil/
│       └── ...
│
├── components/
│
├── hooks/
│
├── stores/
│
├── services/
│
├── schemas/
│
├── types/
│
├── lib/
│
├── providers/

Savoir que (gestionnaire)/ contient et les routes admin/ et les routes consultant/
tout logout ou fin de session doit rediriger vers /

*```

Cette structure est une base.

Elle doit être modifiée si l’analyse du backend montre qu’une autre organisation est plus cohérente.

---

# 27. Ce que je veux comme résultat final

Après avoir analysé tout le backend et le frontend existant, fournir :

## A. Audit

Lister :

```text
✅ Conforme
⚠️ À corriger
❌ Incorrect
➕ Manquant
```

pour :

* authentification ;
* RBAC ;
* redirections ;
* layouts ;
* proxy ;
* services ;
* stores ;
* hooks ;
* types ;
* schemas ;
* WebSockets ;
* pages ;
* gestion des erreurs.

## B. Architecture finale

Donner l’arborescence complète recommandée de :

```text
app/
src/
```

avec l’emplacement précis de chaque layout.

## C. Matrice Backend → Frontend

Pour chaque endpoint backend :

```text
HTTP method
URL
Role
DTO
Response
Frontend service
Hook
Store
Page
```

## D. Matrice WebSocket

Pour chaque Gateway :

```text
Gateway
Namespace
Event
Direction
Payload
Frontend listener/emitter
Hook/service concerné
```

## E. Authentification

Définir précisément :

```text
login
session
refresh
logout
401
403
role
redirection
route protection
```

## F. RBAC

Définir précisément les accès :

```text
ADMIN
CONSULTANT
STUDENT
```

en utilisant **uniquement les rôles réellement présents dans le backend**.

## G. Schemas

Pour chaque DTO backend, indiquer :

```text
DTO backend
→ TypeScript frontend
→ Zod schema
→ React Hook Form
```

## H. Services

Lister toutes les méthodes frontend nécessaires et leur endpoint backend correspondant.

## I. Stores

Lister les stores nécessaires et les données qu’ils doivent réellement gérer.

## J. Hooks

Lister les hooks nécessaires et leurs responsabilités.

## K. Pages

Lister toutes les pages nécessaires sous :

```text
app/admin/
app/consultant/
app/etudiant/
```

en fonction des cas d’utilisation réellement supportés.

---

# 28. Contraintes absolues

Respecter impérativement les règles suivantes :

1. **Next.js uniquement côté frontend.**
2. Aucune architecture mobile.
3. Le backend est la source de vérité.
4. Ne rien inventer.
5. Ne pas inventer de routes API.
6. Ne pas inventer de méthodes.
7. Ne pas inventer d’événements WebSocket.
8. Ne pas inventer de rôles.
9. Ne pas inventer de permissions.
10. Ne pas inventer de champs DTO.
11. Ne pas inventer de réponses API.
12. Les types doivent être strictement compatibles avec le backend.
13. Les schemas Zod doivent refléter les DTO backend.
14. Les services doivent couvrir les méthodes réellement disponibles.
15. Les hooks doivent exploiter les services réels.
16. Les stores doivent exploiter les données réellement retournées.
17. Les WebSockets doivent respecter exactement les gateways backend.
18. Les layouts doivent respecter les rôles.
19. `AUTHLAYOUT` doit rester public.
20. `ADMINLAYOUT` protège `/admin/*`.
21. `CONSULTANTLAYOUT` protège `/consultant/*`.
22. `STUDENTLAYOUT` protège `/etudiant/*`.
23. `/admin/mon-profil` est la destination ADMIN.
24. `/consultant/mon-profil` est la destination CONSULTANT.
25. `/etudiant/mon-profil` est la destination STUDENT.
26. Le frontend ne remplace jamais les protections backend.
27. Aucun `any` inutile.
28. Éviter les duplications de logique.
29. Centraliser la logique d’authentification et de redirection.
30. L’architecture doit être adaptée à Next.js App Router.
31. Les composants Client/Server doivent être utilisés correctement.
32. Les connexions WebSocket ne doivent pas être créées côté serveur.
33. Les listeners WebSocket doivent être nettoyés correctement.
34. Éviter les connexions Socket.IO multiples.
35. Toutes les fonctionnalités backend pertinentes doivent être traçables côté frontend.
36. Toute fonctionnalité frontend sans équivalent backend doit être signalée.
37. Toute fonctionnalité backend sans équivalent frontend doit être signalée.
38. Ne jamais considérer une protection frontend comme une autorisation backend.
39. Respecter strictement les contrats TypeScript.
40. Ne proposer du code qu’après avoir vérifié le contrat backend correspondant.

---

# 29. Méthode d’analyse obligatoire

Avant de proposer une architecture finale :

### Étape 1

Analyser tous les modules backend.

### Étape 2

Analyser tous les controllers.

### Étape 3

Analyser tous les DTO.

### Étape 4

Analyser tous les Response DTO.

### Étape 5

Analyser tous les enums.

### Étape 6

Analyser tous les guards et rôles.

### Étape 7

Analyser tous les gateways WebSocket.

### Étape 8

Analyser le frontend existant.

### Étape 9

Comparer backend et frontend.

### Étape 10

Identifier les écarts.

### Étape 11

Corriger l’architecture.

### Étape 12

Proposer la structure finale.

### Étape 13

Proposer les services, stores, hooks, types et schemas manquants.

### Étape 14

Proposer les pages manquantes.

### Étape 15

Vérifier une dernière fois que **chaque élément frontend possède un contrat backend correspondant**.

---

# 30. Critère de validation final

À la fin, je veux pouvoir vérifier que :

```text
Backend
   ↓
100 % des fonctionnalités nécessaires
   ↓
Services frontend
   ↓
Hooks
   ↓
Stores / cache
   ↓
Schemas
   ↓
Types
   ↓
Pages
   ↓
Layouts
   ↓
RBAC
   ↓
WebSockets
```

sont cohérents entre eux.

L’objectif n’est pas simplement d’avoir une belle architecture Next.js.

L’objectif est d’avoir un **frontend Next.js strictement aligné sur le backend existant**, sans fonctionnalités fictives, sans contrats approximatifs et sans divergence entre les rôles, les routes, les DTO, les types, les schemas, les services, les hooks, les stores et les WebSockets.


NB:Eviter à tout prix les émoticons , les logs révélateurs sauf erreurs en dev local ajout de toasts pour succès éviter les boucles répétitifs






<!-- Frontend Design patterns -->

# Prompt maître — Design System cohérent et composants réutilisables

Conçois et implémente **[NOM DU COMPOSANT]** pour une application web professionnelle moderne.

Le composant doit être **réutilisable, responsive, accessible, maintenable et visuellement cohérent avec l'ensemble des composants déjà générés**.

---

# 1. Identité visuelle globale

L'application doit suivre une esthétique :

* moderne
* minimaliste
* épurée
* professionnelle
* raffinée
* sophistiquée
* élégante
* sobre
* premium
* fluide

L'interface doit donner une impression de **produit SaaS professionnel haut de gamme**.

La priorité est donnée à :

* la lisibilité
* l'espace
* la hiérarchie visuelle
* la cohérence
* la subtilité
* la fluidité

Évite toute surcharge visuelle.

---

# 2. INTERDICTION ABSOLUE DES DÉGRADÉS

**ZÉRO GRADIENT. JAMAIS DE DÉGRADÉ DE COULEUR.**

N'utilise sous aucune forme :

* `bg-gradient-to-*`
* `from-*`
* `via-*`
* `to-*`
* `linear-gradient()`
* `radial-gradient()`
* gradients CSS personnalisés
* gradients dans les boutons
* gradients dans les cartes
* gradients dans les arrière-plans
* gradients dans les textes
* gradients décoratifs
* effets lumineux simulant un gradient

Toutes les surfaces et couleurs doivent être **unies et uniformes**.

Si un effet visuel semble nécessiter un gradient, utilise plutôt :

* une couleur pleine
* une bordure subtile
* une ombre légère
* une variation d'opacité
* un changement de teinte très léger

**Cette règle est non négociable.**

---

# 3. Palette de couleurs

La palette principale repose sur :

### Neutres

```text
white
slate-50
slate-100
slate-200
slate-300
slate-400
slate-500
slate-600
slate-700
slate-800
slate-900
```

### Accent

Utilise principalement :

```text
sky-50
sky-100
sky-500
sky-600
```

Le bleu clair doit être utilisé comme **accent visuel**, et non remplir toute l'interface.

Les couleurs doivent rester douces et professionnelles.

Évite les contrastes agressifs entre éléments voisins.

---

# 4. Continuité avec les composants précédemment générés

## RÈGLE FONDAMENTALE

**Chaque nouveau composant doit suivre visuellement le dernier composant généré.**

Le dernier composant généré constitue la **référence visuelle immédiate**.

Avant de concevoir le nouveau composant, analyse le composant précédent et identifie notamment :

* palette réellement utilisée
* nuances de bleu utilisées
* niveaux de gris utilisés
* couleurs de fond
* couleurs de texte
* couleurs de bordure
* niveau de contraste
* rayons (`rounded-*`)
* épaisseur des bordures
* intensité des ombres
* espacements
* tailles des éléments
* typographie
* style des boutons
* style des champs
* style des icônes
* animations
* vitesse des transitions
* comportement des états `hover`
* comportement des états `focus`
* comportement des états `active`
* comportement des états `disabled`

Le nouveau composant doit **s'harmoniser naturellement avec cette référence**.

Il ne doit jamais sembler provenir d'un autre design system.

---

# 5. Adaptation intelligente du design

La cohérence ne signifie pas que tous les composants doivent être identiques.

Réutilise les principes visuels existants, mais adapte-les intelligemment au rôle du nouveau composant.

Par exemple :

* un bouton peut reprendre le même style d'accent qu'un composant précédent ;
* une modal peut reprendre les mêmes rayons et bordures ;
* une carte peut reprendre le même niveau d'ombre ;
* une navigation peut reprendre les mêmes couleurs d'état ;
* un formulaire peut reprendre le même traitement des champs.

**Réutilise les règles visuelles, pas nécessairement la structure.**

---

# 6. Cohérence des couleurs

Les changements de couleurs entre composants doivent être :

* progressifs
* subtils
* cohérents
* naturels
* non agressifs

Ne change jamais brutalement de palette simplement parce que le nouveau composant est différent.

Si le composant précédent utilise par exemple un bleu `sky-500`, le nouveau composant doit prioritairement rester dans cette famille.

Si une variation est nécessaire, utilise une nuance proche.

Le nouveau composant doit donner l'impression d'être une **évolution naturelle du précédent**.

---

# 7. Animations

Les composants doivent comporter **une légère animation lorsque cela améliore l'expérience utilisateur**.

Les animations doivent être :

* fluides
* courtes
* élégantes
* discrètes
* naturelles
* fonctionnelles

Elles ne doivent jamais être agressives ou distrayantes.

Privilégie :

```text
transition-colors
transition-opacity
transition-transform
transition-shadow
transition-all
duration-150
duration-200
duration-300
ease-out
ease-in-out
```

### Exemples d'animations acceptables

Hover d'un bouton :

```text
transition-colors duration-200
```

Déplacement très léger d'une icône :

```text
transition-transform duration-200 group-hover:-translate-x-0.5
```

Élévation subtile d'une carte :

```text
transition-shadow duration-200
hover:shadow-md
```

Apparition d'un élément :

```text
animate-in fade-in duration-200
```

Les animations doivent rester **presque imperceptibles lorsqu'elles ne sont pas nécessaires**.

---

# 8. Harmonisation des animations

Le nouveau composant doit également reprendre le **langage d'animation du dernier composant généré**.

Si le composant précédent utilise :

```text
duration-200
ease-out
```

ne passe pas arbitrairement à :

```text
duration-700
ease-in
```

sans raison.

Si le précédent utilise des mouvements très subtils, conserve cette subtilité.

Si le précédent utilise principalement des transitions de couleur, privilégie également les transitions de couleur.

### Objectif

Créer une sensation de continuité :

**Composant A → Composant B → Composant C**

et non :

**Composant A → nouveau style → nouveau style → nouveau style**

L'utilisateur doit percevoir **une seule interface cohérente**.

---

# 9. Intensité des animations

Respecte cette hiérarchie :

### Niveau 1 — par défaut

Transitions discrètes :

```text
hover
focus
active
transition-colors
transition-shadow
```

### Niveau 2 — interaction

Léger déplacement ou changement d'échelle :

```text
translate
scale
opacity
```

Utilise ces effets avec parcimonie.

### Niveau 3 — animation d'apparition

Utilise uniquement lorsqu'elle apporte une réelle amélioration UX.

Évite les animations permanentes.

**Aucune animation ne doit attirer inutilement l'attention.**

---

# 10. Responsive

Le composant doit être responsive par défaut.

Il doit fonctionner correctement sur :

* mobile
* tablette
* desktop
* grands écrans

Utilise les breakpoints Tailwind de manière cohérente :

```text
sm
md
lg
xl
```

Ne surcharge jamais la version mobile pour reproduire exactement la version desktop.

Adapte intelligemment :

* espacements
* tailles
* disposition
* alignements
* largeur
* hauteur
* visibilité des éléments

---

# 11. Accessibilité

Respecte :

* HTML sémantique
* navigation clavier
* focus visible
* contraste suffisant
* `aria-label` lorsque nécessaire
* boutons pour les actions
* liens pour la navigation
* états `disabled`
* états `loading`
* support de `prefers-reduced-motion`

Lorsque `prefers-reduced-motion` est activé, réduis ou désactive les animations non essentielles.

---

# 12. Icônes

Utilise exclusivement **Lucide React**.

Les icônes doivent être :

* fines
* cohérentes
* discrètes
* proportionnées
* fonctionnelles

Évite les icônes décoratives surdimensionnées.

---

# 13. Réutilisabilité

Le composant doit être conçu pour être utilisé dans plusieurs contextes.

Utilise :

* interfaces TypeScript
* props configurables
* variantes lorsque nécessaire
* `children` lorsque pertinent
* callbacks
* `className`
* valeurs par défaut raisonnables

Évite les valeurs métier codées en dur.

Exemple :

```tsx id="xw9h2d"
interface ComponentProps {
  title?: string;
  description?: string;
  variant?: 'default' | 'compact';
  className?: string;
  children?: React.ReactNode;
}
```

---

# 14. Abstraction

Abstrais uniquement lorsque cela apporte une réelle valeur.

Évite :

* les composants monolithiques
* les répétitions
* les conditions complexes dans le JSX
* les `any`
* les valeurs magiques
* les abstractions prématurées
* les dépendances inutiles

Le résultat doit rester simple à comprendre et à maintenir.

---

# 15. Stack

Utilise :

* Next.js
* React
* TypeScript
* Tailwind CSS
* Lucide React

N'ajoute aucune bibliothèque UI supplémentaire sans demande explicite.

---

# 16. Philosophie générale

Le design doit respecter cette règle :

> **Subtilité plutôt que spectacle.**
>
> **Cohérence plutôt que nouveauté.**
>
> **Fluidité plutôt qu'animation excessive.**
>
> **Élégance plutôt que décoration.**

Chaque choix esthétique doit sembler intentionnel.

Si deux solutions sont possibles, privilégie celle qui est :

1. plus sobre ;
2. plus cohérente avec le dernier composant ;
3. plus accessible ;
4. plus réutilisable ;
5. plus fluide ;
6. moins agressive visuellement.

---

# 17. Instruction du composant

Génère maintenant :

**[NOM DU COMPOSANT]**

Description :

**[DESCRIPTION]**

Contraintes spécifiques :

**[CONTRAINTES]**

Le composant doit être directement exploitable dans un projet Next.js + TypeScript + Tailwind CSS.

Avant de générer le code, assure-toi qu'il respecte **l'identité visuelle du dernier composant généré**, notamment ses couleurs, espacements, rayons, bordures, ombres et animations.

Le nouveau composant doit sembler avoir été conçu **par le même designer et dans la même session de design system**.
