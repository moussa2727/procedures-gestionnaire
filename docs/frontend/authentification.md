# Authentification Frontend

## 1. Objectif

Ce document définit les contraintes, le cycle de vie et les
responsabilités du frontend concernant l'authentification.

Il complète les invariants métier du backend sans jamais les remplacer
ni les contourner.

Le frontend est responsable de l'expérience utilisateur et de la gestion
de l'état de session côté client.

Le backend demeure l'unique source de vérité pour :

-   l'authentification ;
-   les autorisations ;
-   les règles métier ;
-   les transactions ;
-   les disponibilités ;
-   les validations critiques ;
-   les états métier.

Toute évolution du système d'authentification doit respecter ces
contraintes.

------------------------------------------------------------------------

# 2. Principes fondamentaux

Les règles suivantes sont obligatoires :

-   Jamais de JWT dans `localStorage`.
-   Jamais de Refresh Token dans `localStorage`.
-   Jamais de JWT dans `sessionStorage`.
-   Jamais de Refresh Token dans `sessionStorage`.
-   Jamais de JWT ou de Refresh Token dans IndexedDB.
-   Les Refresh Tokens sont exclusivement stockés dans des Cookies
    HttpOnly.
-   Les Access Tokens sont conservés uniquement en mémoire.
-   Le frontend ne connaît jamais le Refresh Token.
-   Le frontend ne lit jamais directement les Cookies HttpOnly.
-   Le backend reste l'unique source de vérité.
-   Le frontend ne reproduit jamais une règle métier critique.
-   Toutes les validations critiques sont effectuées par le backend.
-   Toutes les communications utilisent HTTPS en production.
-   Les WebSockets utilisent WSS en production.
-   Les données sensibles ne sont jamais journalisées.
-   Aucun composant React ne communique directement avec le backend.
-   Les appels API sont centralisés.
-   Les WebSockets sont centralisés.

------------------------------------------------------------------------

# 3. Responsabilités frontend / backend

## 3.1 Responsabilités du frontend

Le frontend est responsable de :

-   présenter les formulaires d'authentification ;
-   effectuer les validations nécessaires à l'expérience utilisateur ;
-   transmettre les identifiants au backend via le client API ;
-   conserver l'Access Token uniquement en mémoire ;
-   maintenir l'état de session côté client ;
-   déclencher le refresh lorsque cela est nécessaire ;
-   charger le profil après validation de la session ;
-   charger les permissions nécessaires à l'interface ;
-   afficher ou masquer certaines fonctionnalités selon le rôle ;
-   gérer les états de chargement ;
-   afficher les erreurs compréhensibles ;
-   gérer la déconnexion côté interface ;
-   synchroniser l'état de session lorsque cela est nécessaire.

## 3.2 Responsabilités du backend

Le backend est responsable de :

-   vérifier les identifiants ;
-   authentifier l'utilisateur ;
-   délivrer et renouveler les tokens ;
-   gérer le Refresh Token ;
-   contrôler les permissions ;
-   appliquer les règles métier ;
-   effectuer les validations critiques ;
-   vérifier les disponibilités ;
-   contrôler les opérations sensibles ;
-   invalider la session lorsque nécessaire.

Le frontend ne doit jamais considérer une opération comme autorisée
uniquement parce qu'une interface est visible.

------------------------------------------------------------------------

# 4. Architecture générale

La hiérarchie des dépendances est la suivante :

``` text
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

-   ils ne communiquent jamais directement avec l'API ;
-   ils n'implémentent aucune règle métier ;
-   ils ne remplacent jamais le cache des données serveur.

Il est interdit :

-   qu'un composant UI appelle directement une API ;
-   qu'un composant UI implémente une règle métier ;
-   qu'un store effectue des requêtes HTTP ou WebSocket ;
-   qu'un service dépende d'un composant React ;
-   qu'une fonctionnalité contourne cette hiérarchie.

------------------------------------------------------------------------

# 5. Structure recommandée

L'authentification doit être organisée autour de services, hooks,
providers, stores, types et schémas.

Structure indicative :

``` text
src
│
├── app
│   ├── (auth)
│   │   ├── login
│   │   ├── register
│   │   ├── forgot-password
│   │   └── reset-password
│   ├── (main)
│   │...  
│   ├── (etudiant)
│   │
│   │
│   │   
│   │   
│   ├── (consultant)
|   |...
├── components
│   ├── ui
│   └── common
│
├── services
│   └── auth
│       ├── auth.service.ts
│       
│
├── hooks
│   ├── use-auth.ts
│  
│
├── providers
│   └── auth-provider.tsx
│
├── stores
│   └── auth.store.ts
│
├── schemas
│   └── auth
│       ├── login.schema.ts
│       ├── register.schema.ts
│       ├── forgot-password.schema.ts
│       ├── reset-password.schema.ts
│       └── change-password.schema.ts
│
├── types
│   └── auth
│       ├── auth.types.ts
│       
│
└── lib
    └── api-client.ts
```

Cette structure doit rester compatible avec l'architecture globale du
frontend.

------------------------------------------------------------------------

# 6. Gestion des tokens

## 6.1 Access Token

L'Access Token :

-   est conservé uniquement en mémoire ;
-   n'est jamais écrit dans `localStorage` ;
-   n'est jamais écrit dans `sessionStorage` ;
-   n'est jamais écrit dans IndexedDB ;
-   disparaît lors d'un rechargement de page ;
-   est régénéré automatiquement grâce au mécanisme de session et au
    Refresh Token stocké dans le Cookie HttpOnly.

Le frontend peut utiliser l'Access Token en mémoire pour les
communications nécessitant une authentification.

Le token ne doit jamais être persisté volontairement côté navigateur.

## 6.2 Refresh Token

Le Refresh Token :

-   n'est jamais accessible au JavaScript ;
-   n'est jamais stocké dans un store frontend ;
-   n'est jamais stocké dans `localStorage` ;
-   n'est jamais stocké dans `sessionStorage` ;
-   n'est jamais stocké dans IndexedDB ;
-   est exclusivement stocké dans un Cookie HttpOnly sécurisé.

Le frontend ne doit jamais essayer de lire, extraire ou manipuler
directement sa valeur.

------------------------------------------------------------------------

# 7. Cookies d'authentification

Les Cookies utilisés pour l'authentification doivent être configurés
avec :

-   `HttpOnly` ;
-   `Secure` ;
-   un `SameSite` adapté à l'architecture ;
-   une durée limitée ;
-   une rotation automatique lorsque le backend l'impose.

Le frontend ne lit jamais directement ces cookies.

Le navigateur les transmet automatiquement lorsque la configuration des
requêtes et des domaines l'autorise.

En production, les Cookies d'authentification doivent être utilisés
exclusivement dans un environnement HTTPS.

------------------------------------------------------------------------

# 8. Cycle de vie d'une session

Le frontend applique obligatoirement le cycle suivant :

``` text
Chargement de l'application
        ↓
Vérification de session
        ↓
Refresh automatique si nécessaire
        ↓
Chargement du profil
        ↓
Chargement des permissions
        ↓
Chargement des données métier
```

Le frontend ne considère jamais un utilisateur authentifié sans
validation du backend.

------------------------------------------------------------------------

# 9. Initialisation de l'authentification

Au chargement de l'application :

1.  l'application initialise les providers nécessaires ;
2.  le système d'authentification vérifie l'état de la session ;
3.  si nécessaire, le backend renouvelle la session via le mécanisme de
    Refresh Token ;
4.  l'Access Token obtenu est conservé uniquement en mémoire ;
5.  le profil utilisateur est chargé ;
6.  les permissions nécessaires à l'interface sont chargées ;
7.  l'application peut ensuite charger les données métier.

Pendant cette phase, l'application doit distinguer au minimum :

``` text
loading
authenticated
unauthenticated
```

L'interface ne doit pas afficher prématurément un espace protégé avant
que l'état de session soit connu.

------------------------------------------------------------------------

# 10. Login

Le flux de connexion est le suivant :

``` text
Utilisateur
    ↓
Formulaire Login
    ↓
Validation frontend
    ↓
Auth Service
    ↓
API Client
    ↓
Backend
    ↓
Validation des identifiants
    ↓
Session / Tokens
    ↓
Access Token en mémoire
    ↓
Chargement du profil
    ↓
Chargement des permissions
    ↓
Accès à l'application
```

Le frontend effectue uniquement les validations nécessaires à
l'expérience utilisateur.

Le backend doit systématiquement vérifier les identifiants et l'état
réel du compte.

Le frontend ne doit jamais déterminer lui-même si les identifiants sont
valides.

------------------------------------------------------------------------

# 11. Register

Le flux d'inscription suit la même séparation des responsabilités :

``` text
Formulaire Register
        ↓
Validation frontend
        ↓
Auth Service
        ↓
API Client
        ↓
Backend
        ↓
Validation serveur
        ↓
Création du compte
        ↓
Réponse d'authentification/session
        ↓
Initialisation de la session
```

Les validations frontend améliorent l'expérience utilisateur mais ne
remplacent jamais les validations backend.

Le backend reste responsable de toutes les contraintes critiques liées à
la création du compte.

------------------------------------------------------------------------

# 12. Forgot Password

Le flux de récupération de mot de passe est :

``` text
Utilisateur
    ↓
Forgot Password
    ↓
Validation frontend
    ↓
Auth Service
    ↓
API Client
    ↓
Backend
    ↓
Traitement de la demande
```

Le frontend ne génère pas lui-même les mécanismes de récupération.

Il ne stocke aucun secret de récupération.

Il ne doit pas exposer d'information sensible dans les messages
d'erreur.

------------------------------------------------------------------------

# 13. Reset Password

Le formulaire de réinitialisation doit :

-   valider les champs côté frontend ;
-   transmettre les données au backend via le client API ;
-   laisser le backend vérifier le mécanisme de réinitialisation ;
-   laisser le backend appliquer les contraintes de sécurité ;
-   afficher uniquement un résultat compréhensible à l'utilisateur.

Le frontend ne doit jamais décider qu'un token de récupération est
valide.

------------------------------------------------------------------------

# 14. Change Password

Le changement de mot de passe doit être traité comme une opération
sensible.

Le frontend :

-   valide le formulaire ;
-   transmet la demande au backend ;
-   affiche le résultat retourné ;
-   ne journalise jamais le mot de passe ;
-   ne stocke jamais le mot de passe.

Le backend demeure responsable de la validation et de l'application du
changement.

------------------------------------------------------------------------

# 15. Logout

Le logout doit être déclenché par une action explicite de l'utilisateur
ou par une invalidation de session.

Flux :

``` text
Utilisateur
    ↓
Logout
    ↓
Auth Service
    ↓
API Client
    ↓
Backend
    ↓
Invalidation de session
    ↓
Suppression de l'état d'authentification en mémoire
    ↓
Retour vers une zone publique
```

Après la déconnexion :

-   l'Access Token en mémoire doit être supprimé ;
-   les données d'authentification locales doivent être réinitialisées ;
-   l'interface protégée ne doit plus être considérée comme accessible ;
-   le frontend ne doit pas tenter de conserver une session invalide.

Le Refresh Token étant dans un Cookie HttpOnly, son invalidation est
gérée par le backend et le navigateur.

------------------------------------------------------------------------

# 16. Refresh automatique

Le frontend doit être capable de renouveler la session sans exposer le
Refresh Token au JavaScript.

Principe :

``` text
Requête API
    ↓
Session valide ?
    ├── Oui → poursuivre
    │
    └── Non / Access Token expiré
             ↓
        Demande de refresh
             ↓
        Cookie HttpOnly
             ↓
        Backend
             ↓
        Nouveau contexte d'authentification
             ↓
        Nouveau Access Token en mémoire
             ↓
        Reprise de la requête si approprié
```

Le mécanisme de refresh doit être centralisé dans le client API ou le
service de session.

Il ne doit pas être réimplémenté dans chaque composant.

------------------------------------------------------------------------

# 17. Gestion du `401 Unauthorized`

Une réponse `401` indique que la requête ne peut pas être considérée
comme authentifiée.

Le client API doit centraliser la gestion de ce cas.

Principe :

``` text
Requête
   ↓
401
   ↓
Tentative de refresh
   ↓
Refresh réussi ?
   ├── Oui → nouveau Access Token → reprise contrôlée
   │
   └── Non → session invalide → déconnexion
```

Le système doit éviter les boucles infinies de refresh.

Une requête déjà rejouée après refresh ne doit pas déclencher
indéfiniment de nouvelles tentatives.

------------------------------------------------------------------------

# 18. Gestion du `403 Forbidden`

Le `403` doit être distingué du `401`.

``` text
401 → session/authentification invalide
403 → authentification reconnue mais opération non autorisée
```

Le frontend peut afficher une interface adaptée à l'utilisateur.

Cependant, masquer un bouton ou une page ne constitue jamais une
protection de sécurité.

Le backend doit toujours revérifier les permissions avant l'opération.

------------------------------------------------------------------------

# 19. Gestion des rôles

Les rôles actuellement définis sont :

-   `ADMIN`
-   `CONSULTANT`
-   `ETUDIANT`

Le frontend peut utiliser le rôle pour :

-   afficher ou masquer certaines fonctionnalités ;
-   sélectionner le layout approprié ;
-   adapter la navigation ;
-   améliorer l'expérience utilisateur.

Le frontend ne doit jamais considérer le rôle comme une garantie de
sécurité.

Toutes les autorisations sont systématiquement revérifiées par le
backend.

``` text
Frontend
    ↓
Masquage / affichage UI
    ↓
Backend
    ↓
Vérification réelle de l'autorisation
    ↓
Opération autorisée ou refusée
```

------------------------------------------------------------------------

# 20. Protection des routes

Les layouts et protections frontend permettent d'améliorer l'expérience
utilisateur.

Layouts concernés :

``` text
RootLayout
AuthLayout
AdminLayout
ConsultantLayout
EtudiantLayout
```

Une route protégée ne doit pas être considérée comme sécurisée
uniquement parce qu'elle est protégée côté frontend.

La sécurité réelle est assurée par le backend.

Le frontend doit :

-   attendre la résolution de l'état de session ;
-   éviter d'afficher prématurément une page protégée ;
-   rediriger l'utilisateur lorsqu'il est manifestement non authentifié
    ;
-   afficher une interface adaptée lorsqu'une permission manque.

------------------------------------------------------------------------

# 21. Profil utilisateur

Une fois la session validée, le frontend charge le profil utilisateur.

Ordre :

``` text
Session validée
      ↓
Profil utilisateur
      ↓
Permissions
      ↓
Données métier
```

Le profil chargé depuis le backend doit être considéré comme la
référence côté interface.

Le frontend ne doit pas reconstruire ou deviner le profil à partir
d'informations locales persistées.

------------------------------------------------------------------------

# 22. Client API unique

Toutes les requêtes d'authentification passent par le client HTTP unique
:

``` text
api/api-client.ts
```

Ce client est responsable de :

-   l'ajout automatique des credentials ;
-   la gestion du refresh ;
-   la gestion des erreurs ;
-   l'annulation des requêtes obsolètes ;
-   les retries intelligents ;
-   les timeouts.

Aucun `fetch()` ne doit apparaître dans un composant React.

Un composant doit utiliser un hook ou un service.

``` text
Composant
   ↓
Hook
   ↓
Auth Service
   ↓
API Client
   ↓
Backend
```

------------------------------------------------------------------------

# 23. Gestion de l'état d'authentification

L'état d'authentification peut être représenté par un store ou un
provider.

Il doit au minimum permettre de distinguer :

``` text
INITIALIZING
AUTHENTICATED
UNAUTHENTICATED
```

L'état doit être mis à jour uniquement à partir d'événements fiables :

-   vérification de session ;
-   login réussi ;
-   refresh réussi ;
-   logout ;
-   expiration de session ;
-   réponse backend indiquant une session invalide.

Le store ne doit jamais effectuer directement de requête HTTP.

------------------------------------------------------------------------

# 24. Synchronisation entre onglets

Lorsque plusieurs onglets de l'application sont ouverts, l'état de
session doit rester cohérent.

La synchronisation peut notamment concerner :

-   la déconnexion ;
-   l'invalidation de session ;
-   l'état d'authentification.

La synchronisation ne doit jamais nécessiter de persister l'Access Token
ou le Refresh Token dans `localStorage`, `sessionStorage` ou IndexedDB.

Le mécanisme choisi doit respecter les contraintes de sécurité définies
dans ce document.

------------------------------------------------------------------------

# 25. WebSockets

Les WebSockets utilisent le cycle suivant :

``` text
Authentification
      ↓
Connexion
      ↓
Abonnement
      ↓
Réception des événements
      ↓
Session invalide ?
      ↓
Déconnexion
      ↓
Refresh automatique
      ↓
Nouvelle connexion
```

Le token utilisé lors du handshake reste exclusivement en mémoire.

Le Refresh Token n'est jamais exposé au code JavaScript.

Le renouvellement de session s'effectue via le mécanisme de Cookies
HttpOnly.

Les WebSockets utilisent `WSS` en production.

------------------------------------------------------------------------

# 26. Gestion des erreurs d'authentification

Toutes les erreurs doivent être :

-   explicites ;
-   compréhensibles ;
-   cohérentes.

Il est interdit d'afficher :

-   stack traces ;
-   erreurs Prisma ;
-   erreurs SQL ;
-   erreurs Redis ;
-   JWT ;
-   informations serveur ;
-   chemins internes ;
-   variables d'environnement ;
-   détails techniques inutiles à l'utilisateur.

Les messages affichés doivent rester suffisamment génériques pour ne pas
divulguer d'informations sensibles.

------------------------------------------------------------------------

# 27. Journalisation

Le frontend journalise uniquement les erreurs nécessaires au diagnostic.

Il est strictement interdit de journaliser :

-   JWT ;
-   Refresh Tokens ;
-   Cookies ;
-   mots de passe ;
-   réponses API complètes ;
-   données personnelles sensibles ;
-   informations d'authentification.

En production, les journaux doivent être réduits au strict minimum.

------------------------------------------------------------------------

# 28. Validation frontend

Le frontend valide les formulaires uniquement pour améliorer
l'expérience utilisateur.

Il peut vérifier notamment :

-   présence des champs ;
-   format attendu ;
-   cohérence des champs ;
-   contraintes de saisie ;
-   messages d'erreur utilisateur.

Cependant, le backend valide systématiquement :

-   les données ;
-   les permissions ;
-   les contraintes métier ;
-   les disponibilités ;
-   les opérations sensibles.

Le frontend complète les validations backend avec ses propres schemas et
types conformes au backend.

------------------------------------------------------------------------

# 29. Sanitisation

Toutes les entrées utilisateur sont systématiquement nettoyées avant
affichage.

Il est interdit d'injecter directement une donnée provenant du backend
dans le DOM.

Les contenus HTML doivent être désinfectés.

Les messages retournés par l'API ne doivent pas être interprétés comme
du HTML arbitraire sans mécanisme de sanitisation approprié.

------------------------------------------------------------------------

# 30. Sécurité du transport

En production :

-   HTTPS est obligatoire ;
-   WSS est obligatoire pour les WebSockets ;
-   les Cookies d'authentification utilisent `Secure` ;
-   aucune communication HTTP non sécurisée ne doit être utilisée pour
    l'authentification.

------------------------------------------------------------------------

# 31. Données sensibles

Les données sensibles ne doivent pas être conservées inutilement côté
frontend.

En particulier :

``` text
JWT              → mémoire uniquement
Refresh Token    → Cookie HttpOnly uniquement
Mot de passe     → jamais stocké
Cookie auth      → jamais lu par JavaScript
```

Aucune donnée sensible ne doit être ajoutée aux logs ou aux messages
d'erreur.

------------------------------------------------------------------------

# 32. Cas de rechargement de page

Lors d'un rechargement :

``` text
Page rechargée
    ↓
Access Token en mémoire perdu
    ↓
Initialisation de session
    ↓
Vérification / refresh via backend
    ↓
Nouveau Access Token en mémoire
    ↓
Chargement du profil
    ↓
Application prête
```

Le rechargement ne doit pas conduire le frontend à rechercher un JWT
dans `localStorage`, `sessionStorage` ou IndexedDB.

------------------------------------------------------------------------

# 33. Expiration de session

Lorsque la session ne peut plus être renouvelée :

``` text
Access Token invalide
       ↓
Tentative de refresh
       ↓
Refresh impossible
       ↓
Session invalide
       ↓
Suppression de l'état d'authentification en mémoire
       ↓
Utilisateur considéré comme non authentifié
       ↓
Redirection vers une zone publique
```

Le frontend ne doit pas maintenir artificiellement une session que le
backend considère comme invalide.

------------------------------------------------------------------------

# 34. Requêtes concurrentes pendant un refresh

Le refresh doit être centralisé afin d'éviter que plusieurs requêtes
simultanées déclenchent plusieurs renouvellements indépendants.

Principe attendu :

``` text
Requête A ─┐
Requête B ─┼──→ Session expirée
Requête C ─┘
              ↓
        Refresh centralisé
              ↓
        Nouveau contexte
              ↓
      Reprise contrôlée
```

Le système doit éviter les refresh concurrents inutiles et les boucles
de requêtes.

------------------------------------------------------------------------

# 35. Feedback utilisateur

Toute action d'authentification doit fournir un retour clair :

-   chargement ;
-   succès ;
-   erreur ;
-   confirmation ;
-   progression lorsque nécessaire.

Exemples d'actions concernées :

-   connexion ;
-   inscription ;
-   récupération du mot de passe ;
-   réinitialisation du mot de passe ;
-   changement du mot de passe ;
-   déconnexion ;
-   vérification de session.

Le feedback ne doit jamais divulguer d'informations sensibles.

------------------------------------------------------------------------

# 36. Interdictions

Il est interdit :

-   d'utiliser `localStorage` pour les informations d'authentification ;
-   d'utiliser `sessionStorage` pour les informations d'authentification
    ;
-   d'utiliser IndexedDB pour les tokens ;
-   d'exposer le Refresh Token au JavaScript ;
-   de lire directement les Cookies HttpOnly ;
-   de mettre un JWT dans un store persistant ;
-   de mettre un Refresh Token dans un store frontend ;
-   de faire des appels API directement depuis un composant React ;
-   de dupliquer la logique de refresh dans plusieurs modules ;
-   de considérer une protection de route frontend comme une protection
    de sécurité ;
-   de considérer un rôle frontend comme une autorisation ;
-   de reproduire les règles métier backend ;
-   de recalculer les disponibilités côté frontend ;
-   de contourner les contrôles d'autorisation ;
-   d'exposer des informations sensibles dans les erreurs ;
-   de journaliser des informations confidentielles.

------------------------------------------------------------------------

# 37. Flux global d'authentification

Le fonctionnement global attendu est :

``` text
┌───────────────────────────────┐
│       Chargement App          │
└───────────────┬───────────────┘
                ↓
┌───────────────────────────────┐
│   Vérification de session     │
└───────────────┬───────────────┘
                ↓
        Session valide ?
          /          \
        Oui           Non
         ↓             ↓
 Refresh nécessaire  Zone publique
         ↓
┌───────────────────────────────┐
│       Backend / Refresh       │
│    Cookie HttpOnly utilisé    │
└───────────────┬───────────────┘
                ↓
┌───────────────────────────────┐
│   Access Token en mémoire     │
└───────────────┬───────────────┘
                ↓
┌───────────────────────────────┐
│      Chargement du profil     │
└───────────────┬───────────────┘
                ↓
┌───────────────────────────────┐
│    Chargement permissions     │
└───────────────┬───────────────┘
                ↓
┌───────────────────────────────┐
│      Données métier           │
└───────────────────────────────┘
```

------------------------------------------------------------------------

# 38. Flux en cas d'expiration

``` text
Requête API
     ↓
Access Token invalide / expiré
     ↓
401
     ↓
Refresh centralisé
     ↓
Backend + Cookie HttpOnly
     ↓
Refresh réussi ?
   /          \
 Oui           Non
  ↓             ↓
Nouveau       Session
Access Token  invalide
  ↓             ↓
Rejouer        Logout
requête          ↓
  ↓          Zone publique
Succès
```

------------------------------------------------------------------------

# 39. Flux de déconnexion

``` text
Action Logout
      ↓
Auth Service
      ↓
API Client
      ↓
Backend
      ↓
Invalidation session
      ↓
Nettoyage état mémoire
      ↓
Utilisateur non authentifié
      ↓
Zone publique
```

------------------------------------------------------------------------

# 40. Règles de conception des composants

Les composants React ne doivent contenir aucune logique métier
d'authentification complexe.

Ils doivent consommer les abstractions prévues :

``` text
Component
    ↓
Hook
    ↓
Service
    ↓
API Client
```

Exemple conceptuel :

``` text
LoginForm
    ↓
useLogin()
    ↓
authService.login()
    ↓
apiClient.request()
    ↓
Backend
```

Le composant reste responsable de l'interface et du feedback
utilisateur.

------------------------------------------------------------------------

# 41. Règles de conception des services

Les services d'authentification sont responsables des opérations
fonctionnelles :

-   login ;
-   register ;
-   logout ;
-   récupération de mot de passe ;
-   réinitialisation ;
-   changement de mot de passe ;
-   vérification de session.

Ils ne doivent pas dépendre de composants React.

Ils utilisent le client API centralisé.

------------------------------------------------------------------------

# 42. Règles de conception des hooks

Les hooks servent d'interface entre les composants et les services.

Ils peuvent gérer :

-   l'état de chargement ;
-   l'état d'erreur ;
-   l'état de session ;
-   l'appel des services ;
-   la consommation du cache serveur lorsque nécessaire.

Ils ne doivent pas contourner les services ni appeler directement une
API.

------------------------------------------------------------------------

# 43. Compatibilité avec le cache serveur

Les données serveur doivent être gérées par une bibliothèque de cache
dédiée.

Les règles comprennent :

-   déduplication automatique des requêtes ;
-   cache intelligent ;
-   invalidation automatique après mutation ;
-   pagination serveur ;
-   recherche serveur ;
-   préchargement lorsque pertinent ;
-   annulation des requêtes inutiles.

Le store d'authentification ne doit pas remplacer le cache des données
serveur.

------------------------------------------------------------------------

# 44. Respect des invariants métier

L'authentification frontend doit respecter les invariants définis par le
backend.

Le frontend ne doit jamais tenter de reproduire ou contourner :

-   les autorisations ;
-   les transactions ;
-   les disponibilités ;
-   les réservations atomiques ;
-   les verrous logiques ;
-   les contraintes d'intégrité ;
-   les états finaux ;
-   les règles métier futures.

Le backend demeure en permanence l'unique source de vérité.

------------------------------------------------------------------------

# 45. Checklist d'implémentation

Avant de considérer l'authentification frontend comme conforme, vérifier
:

## Tokens

-   [ ] Aucun JWT dans `localStorage`.
-   [ ] Aucun JWT dans `sessionStorage`.
-   [ ] Aucun JWT dans IndexedDB.
-   [ ] Aucun Refresh Token dans `localStorage`.
-   [ ] Aucun Refresh Token dans `sessionStorage`.
-   [ ] Aucun Refresh Token dans IndexedDB.
-   [ ] Access Token uniquement en mémoire.
-   [ ] Refresh Token uniquement dans un Cookie HttpOnly.

## Session

-   [ ] Vérification de session au chargement.
-   [ ] Refresh automatique.
-   [ ] Chargement du profil après validation.
-   [ ] Chargement des permissions.
-   [ ] Gestion de l'expiration.
-   [ ] Déconnexion lorsque la session devient invalide.

## API

-   [ ] Client API unique.
-   [ ] Credentials configurés correctement.
-   [ ] Gestion centralisée du refresh.
-   [ ] Gestion centralisée des erreurs.
-   [ ] Timeouts.
-   [ ] Retries intelligents.
-   [ ] Annulation des requêtes obsolètes.
-   [ ] Aucun `fetch()` dans les composants React.

## Sécurité

-   [ ] HTTPS en production.
-   [ ] WSS en production.
-   [ ] Cookies `Secure`.
-   [ ] Cookies `HttpOnly`.
-   [ ] `SameSite` adapté.
-   [ ] Aucun secret dans les logs.
-   [ ] Aucun JWT dans les logs.
-   [ ] Aucun mot de passe dans les logs.
-   [ ] Aucune réponse API complète dans les logs.

## Autorisations

-   [ ] Les rôles sont utilisés uniquement pour l'interface.
-   [ ] Le backend revérifie toutes les autorisations.
-   [ ] Les routes frontend ne sont pas considérées comme une protection
    de sécurité.
-   [ ] Les règles métier ne sont pas dupliquées côté frontend.

------------------------------------------------------------------------

# 46. Règle finale

Toute nouvelle fonctionnalité d'authentification doit respecter
simultanément les contraintes suivantes :

``` text
Backend = source de vérité
        +
Access Token = mémoire uniquement
        +
Refresh Token = Cookie HttpOnly uniquement
        +
API = client centralisé
        +
Session = vérifiée par le backend
        +
Rôles = aide à l'interface uniquement
        +
Autorisations = backend
        +
HTTPS / WSS = production
        +
Secrets = jamais journalisés
```

Toute implémentation qui contourne l'une de ces contraintes doit être
considérée comme non conforme à l'architecture frontend.

------------------------------------------------------------------------

# 47. Principe architectural définitif

Le frontend ne doit jamais essayer de devenir l'autorité de sécurité.

Son rôle est de :

``` text
Présenter
   ↓
Demander
   ↓
Afficher l'état
   ↓
Réagir à la réponse du backend
```

Le backend reste responsable de :

``` text
Authentifier
   ↓
Autoriser
   ↓
Valider
   ↓
Appliquer les règles métier
   ↓
Déterminer l'état réel
```

Cette séparation constitue la règle fondamentale de toute l'architecture
d'authentification.
