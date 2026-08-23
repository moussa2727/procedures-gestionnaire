# Users --- Implémentation Frontend

## 1. Objectif

Ce document définit l'architecture frontend du module `Users`.

Le module doit couvrir :

-   le profil de l'utilisateur connecté ;
-   la modification du profil ;
-   la photo de profil ;
-   la gestion administrative des utilisateurs ;
-   la recherche, le filtrage, le tri et la pagination ;
-   les statistiques utilisateurs ;
-   l'activation / désactivation ;
-   la promotion d'un étudiant en consultant ;
-   la suppression logique et la restauration ;
-   la réinitialisation administrative du mot de passe ;
-   la gestion des sessions actives ;
-   la révocation d'une session ;
-   la déconnexion globale des utilisateurs ;
-   les profils consultants ;
-   les profils consultants semi-publics et publics ;
-   les disponibilités exposées dans le profil consultant ;
-   les avis et leur modération ;
-   les mises à jour temps réel via WebSocket.

Le frontend ne doit jamais reproduire les règles métier du backend. Il
consomme les résultats du backend et adapte uniquement l'interface.

------------------------------------------------------------------------

# 2. Source de vérité

Le backend reste l'unique source de vérité.

Le frontend ne doit jamais déterminer lui-même :

-   si un utilisateur existe ;
-   si un compte est réellement actif ;
-   si un compte est supprimé ;
-   si un utilisateur possède réellement un rôle ;
-   si un utilisateur peut être promu consultant ;
-   si une session est valide ;
-   si une session peut être révoquée ;
-   si une opération administrative est autorisée ;
-   si un consultant est actif ;
-   si une destination appartient réellement à un consultant ;
-   si un avis peut être modifié ou modéré.

Le frontend peut afficher une interface différente selon les
informations reçues, mais le backend doit systématiquement revérifier
l'opération.

------------------------------------------------------------------------

# 3. Rôles

Les rôles utilisateur sont :

``` ts
enum UserRole {
  ADMIN
  CONSULTANT
  ETUDIANT
}
```

Le frontend peut utiliser ces rôles pour :

-   construire la navigation ;
-   afficher les fonctionnalités accessibles ;
-   afficher les actions administratives ;
-   choisir les layouts ;
-   adapter les tableaux et dashboards.

Mais :

``` text
Role frontend ≠ autorisation de sécurité
```

Une action masquée dans l'interface reste protégée côté backend.

------------------------------------------------------------------------

# 4. Architecture frontend

Le module Users respecte la hiérarchie :

``` text
Page
 ↓
Component
 ↓
Hook
 ↓
Service
 ↓
API Client
 ↓
Backend
```

Pour les données serveur :

``` text
Page
 ↓
Hook de données
 ↓
Query / Mutation
 ↓
Users Service
 ↓
API Client
 ↓
Backend
```

Les composants ne doivent jamais appeler directement `fetch()` ou Axios.

Les stores locaux ne doivent pas devenir un cache parallèle des données
serveur.

------------------------------------------------------------------------

# 5. Structure recommandée

``` text
src/
├── app/
│   ├── admin/
│   │   └── users/
│   │       ├── page.tsx
│   │       ├── [id]/
│   │       │   └── page.tsx
│   │       └── deleted/
│   │           └── page.tsx
│   │
│   ├── profile/
│   │   └── page.tsx
│   │
│   └── consultants/
│       ├── page.tsx
│       └── [id]/
│           └── page.tsx
│
├── components/
│   └── users/
│       ├── user-avatar.tsx
│       ├── user-status-badge.tsx
│       ├── user-role-badge.tsx
│       ├── user-table.tsx
│       ├── user-filters.tsx
│       ├── user-pagination.tsx
│       ├── user-form.tsx
│       ├── user-profile-card.tsx
│       ├── user-sessions.tsx
│       ├── consultant-card.tsx
│       ├── consultant-profile.tsx
│       ├── consultant-reviews.tsx
│       └── consultant-availability.tsx
│
├── services/
│   └── users/
│       └── users.service.ts
│
├── hooks/
│   └── users/
│       ├── use-user.ts
│       ├── use-users.ts
│       ├── use-current-user.ts
│       ├── use-update-profile.ts
│       ├── use-user-photo.ts
│       ├── use-user-sessions.ts
│       ├── use-consultants.ts
│       └── use-consultant-profile.ts
│
├── schemas/
│   └── users/
│       ├── update-profile.schema.ts
│       ├── update-user.schema.ts
│       ├── reset-user-password.schema.ts
│       └── moderate-review.schema.ts
│
├── types/
│   └── users/
│       ├── user.types.ts
│       ├── user-query.types.ts
│       ├── user-statistics.types.ts
│       ├── session.types.ts
│       └── consultant.types.ts
│
└── websocket/
    └── users/
        └── users.socket.ts
```

Les noms peuvent être adaptés au projet existant, mais la séparation des
responsabilités doit être conservée.

------------------------------------------------------------------------

# 6. Modèle frontend User

Le frontend doit définir un type correspondant au DTO retourné par le
backend.

Exemple :

``` ts
export type UserRole =
  | 'ADMIN'
  | 'CONSULTANT'
  | 'ETUDIANT';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  photo: string | null;
  role: UserRole;
  isActive: boolean;
  isDeleted: boolean;
  isOnline: boolean;
  createdAt: string;
  updatedAt: string;
}
```

Le type réel doit rester aligné sur le `UserResponseDto` du backend.

Il ne faut pas exposer dans ce type frontend des champs sensibles qui ne
sont pas retournés par le backend.

------------------------------------------------------------------------

# 7. Profil personnel

Tous les utilisateurs peuvent consulter leur propre profil.

Endpoint :

``` http
GET /users/me
```

Flux :

``` text
Profile Page
    ↓
useCurrentUser()
    ↓
Users Service
    ↓
GET /users/me
    ↓
Backend
    ↓
UserResponseDto
    ↓
Cache serveur
    ↓
UI
```

Le profil doit être chargé depuis le backend.

Le frontend ne doit pas reconstruire le profil à partir du JWT.

------------------------------------------------------------------------

# 8. Modification du profil

Endpoint :

``` http
PUT /users/me
```

Les champs modifiables du profil personnel sont notamment :

``` text
firstName
lastName
phone
```

Le backend applique ces modifications. Le service backend met également
à jour son cache et informe le système temps réel lorsqu'une
modification est effectuée.

Le frontend doit donc :

1.  afficher les valeurs actuelles ;
2.  valider le formulaire ;
3.  envoyer uniquement les champs nécessaires ;
4.  afficher un état de chargement ;
5.  mettre à jour le cache après succès ;
6.  afficher le résultat retourné par le backend.

Le formulaire ne doit pas modifier directement le cache sans attendre la
confirmation du serveur.

------------------------------------------------------------------------

# 9. Photo de profil

Endpoint :

``` http
PUT /users/me/photo
Content-Type: multipart/form-data
```

Champ :

``` text
photo
```

Flux :

``` text
Sélection image
      ↓
Validation frontend
      ↓
FormData
      ↓
Users Service
      ↓
API Client
      ↓
Backend
      ↓
Upload Cloudinary
      ↓
Mise à jour User
      ↓
Nouveau profil
      ↓
Invalidation cache
      ↓
UI
```

Le frontend peut vérifier :

-   qu'un fichier est sélectionné ;
-   que le type MIME est accepté ;
-   que la taille respecte la limite définie par le backend 5Mo;
-   que le fichier peut être prévisualisé.

La validation frontend ne remplace jamais la validation backend.

Après succès, l'URL de la nouvelle photo retournée par le backend doit
remplacer l'ancienne.

------------------------------------------------------------------------

# 10. Cache du profil

Le profil utilisateur est une donnée serveur.

Il doit donc être géré par le système de cache serveur utilisé par
l'application.

Exemple avec une bibliothèque de requêtes :

``` text
['users', 'me']
```

Après modification :

``` text
PUT /users/me
      ↓
mutation réussie
      ↓
invalidate ['users', 'me']
      ↓
refetch
```

Pour la photo :

``` text
PUT /users/me/photo
      ↓
mutation réussie
      ↓
invalidate ['users', 'me']
```

Il est préférable d'utiliser la réponse de mutation pour mettre à jour
immédiatement le cache lorsque le comportement de la bibliothèque le
permet.

------------------------------------------------------------------------

# 11. Gestion administrative des utilisateurs

La gestion complète des utilisateurs est réservée au rôle `ADMIN`.

Le frontend doit proposer une interface de type :

``` text
Admin
 └── Users
      ├── Liste
      ├── Recherche
      ├── Filtres
      ├── Tri
      ├── Pagination
      ├── Détails
      ├── Activation / désactivation
      ├── Promotion consultant
      ├── Reset password
      ├── Suppression
      ├── Restauration
      └── Sessions
```

La présence de cette interface ne remplace jamais les guards backend.

------------------------------------------------------------------------

# 12. Liste des utilisateurs

Endpoint :

``` http
GET /users
```

Le backend prend en charge :

-   pagination ;
-   recherche ;
-   rôle ;
-   statut actif ;
-   statut supprimé ;
-   tri ;
-   ordre de tri.

Le backend retourne notamment :

``` ts
interface PaginatedUsers {
  items: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

Le frontend doit transmettre les paramètres au serveur.

Il ne doit pas charger tous les utilisateurs pour filtrer localement.

------------------------------------------------------------------------

# 13. Recherche utilisateur

La recherche serveur porte notamment sur :

-   email ;
-   prénom ;
-   nom.

Exemple :

``` http
GET /users?search=nomd'utilisateur
```

Le frontend doit utiliser un debounce pour éviter une requête à chaque
frappe.

Exemple de comportement :

``` text
M
Mo
Mou
Mous
Mouss
Moussa
      ↓
debounce
      ↓
GET /users?search=Moussa
```

La durée du debounce doit rester raisonnable et standard.

------------------------------------------------------------------------

# 14. Filtres

Les filtres doivent être transmis au backend.

Filtres disponibles :

``` text
role
isActive
isDeleted
search
```

Exemple :

``` http
GET /users?role=CONSULTANT&isActive=true
```

Le frontend ne doit pas appliquer un second filtrage métier
contradictoire après réception.

------------------------------------------------------------------------

# 15. Tri

Le backend permet le tri par champ.

Le frontend doit limiter les champs proposés aux champs réellement
autorisés par l'API.

Exemple :

``` text
createdAt
firstName
lastName
email
```

Le frontend ne doit jamais envoyer arbitrairement un nom de colonne
provenant directement d'une saisie utilisateur.

------------------------------------------------------------------------

# 16. Pagination

La pagination doit être serveur.

Exemple :

``` http
GET /users?page=2&limit=20
```

Le composant de pagination consomme :

``` ts
page
limit
total
totalPages
```

Lorsqu'un filtre change, la page doit généralement revenir à `1`.

Exemple :

``` text
Page 7
   ↓
Recherche modifiée
   ↓
Page 1
```

------------------------------------------------------------------------

# 17. Détails utilisateur

Endpoint :

``` http
GET /users/:id
```

La page détail doit charger les données du serveur.

Elle peut présenter :

-   identité ;
-   email ;
-   téléphone ;
-   rôle ;
-   statut ;
-   date de création ;
-   état de connexion ;
-   sessions ;
-   actions administratives autorisées.

Les données sensibles ne doivent être affichées que si le backend les
retourne et que l'utilisateur courant possède les droits nécessaires.

------------------------------------------------------------------------

# 18. Création utilisateur

Si la création d'utilisateur est exposée dans l'interface
d'administration, elle doit suivre :

``` text
Formulaire
   ↓
Schema frontend
   ↓
Users Service
   ↓
API
   ↓
Backend
   ↓
Création
   ↓
Réponse
   ↓
Invalidation liste
```

Le backend peut déclencher des traitements secondaires tels que l'envoi
d'un email de bienvenue.

Le frontend ne doit pas essayer de reproduire ces traitements.

------------------------------------------------------------------------

# 19. Modification administrative

Endpoint :

``` http
PATCH /users/:id
```

Le frontend doit présenter uniquement les champs que le backend
autorise.

Le backend applique notamment ses propres règles concernant :

-   l'email ;
-   les conflits d'email ;
-   le compte administrateur ;
-   le statut ;
-   les données modifiables.

Le frontend ne doit pas considérer une validation locale comme
suffisante.

------------------------------------------------------------------------

# 20. Activation / désactivation

Endpoint :

``` http
PATCH /users/:id/status
```

Payload :

``` json
{
  "isActive": false
}
```

Flux :

``` text
Action Admin
     ↓
Confirmation
     ↓
PATCH status
     ↓
Backend
     ↓
Utilisateur désactivé
     ↓
Sessions invalidées côté serveur
     ↓
Réponse
     ↓
Invalidation cache
     ↓
Mise à jour UI
```

Un compte `ADMIN` ne peut pas être désactivé par cette route côté
backend.

Le frontend peut empêcher l'affichage de l'action, mais le backend reste
l'autorité.

------------------------------------------------------------------------

# 21. Promotion étudiant → consultant

Endpoint :

``` http
PATCH /users/:id/promote-consultant
```

La promotion est une opération métier.

Le frontend doit :

1.  vérifier visuellement que l'utilisateur est étudiant ;
2.  demander confirmation ;
3.  envoyer la mutation ;
4.  attendre la réponse du backend ;
5.  invalider les données utilisateur ;
6.  afficher le nouveau rôle.

Le backend vérifie que seul un compte `ETUDIANT` peut être promu.

Le frontend ne doit jamais modifier directement :

``` ts
user.role = 'CONSULTANT'
```

avant confirmation serveur.

------------------------------------------------------------------------

# 22. Suppression logique

Endpoint :

``` http
DELETE /users/:id
```

Le système utilise une suppression logique.

Le frontend doit distinguer :

``` text
Utilisateur actif
Utilisateur inactif
Utilisateur supprimé
```

Un utilisateur supprimé ne doit pas être confondu avec un utilisateur
simplement désactivé.

L'interface d'administration peut proposer une vue :

``` text
Utilisateurs actifs
Utilisateurs supprimés
```

------------------------------------------------------------------------

# 23. Restauration

Endpoint :

``` http
PATCH /users/:id/restore
```

Flux :

``` text
Utilisateur supprimé
      ↓
Action Restaurer
      ↓
Confirmation
      ↓
Backend
      ↓
isDeleted = false
      ↓
Réponse
      ↓
Invalidation cache
```

La restauration est toujours confirmée par le backend.

------------------------------------------------------------------------

# 24. Réinitialisation administrative du mot de passe

Endpoint :

``` http
POST /users/:id/reset-password
```

Payload :

``` json
{
  "newPassword": "..."
}
```

Cette opération est sensible.

Le frontend doit :

-   ne jamais afficher le mot de passe en clair après validation ;
-   ne jamais le journaliser ;
-   ne jamais le mettre dans une URL ;
-   ne jamais le conserver après soumission ;
-   vider le formulaire après succès.

Le backend invalide les sessions de l'utilisateur après une
réinitialisation administrative.

Le frontend doit donc invalider les données liées aux sessions après
succès.

Le compte administrateur ne peut pas être réinitialisé par cette route.

------------------------------------------------------------------------

# 25. Sessions actives

Le module Users permet à un utilisateur de gérer ses sessions actives.

Le backend impose une limite de sessions simultanées.

Le frontend doit afficher une liste :

``` text
Appareil
Navigateur
IP
Date de connexion
Dernière activité
Session actuelle
```

Les données affichées doivent provenir du backend.

Le frontend ne doit jamais tenter d'identifier localement une session à
partir du JWT.

------------------------------------------------------------------------

# 26. Révocation d'une session personnelle

L'utilisateur peut révoquer une session active lorsque l'API l'autorise.

Flux :

``` text
Session list
    ↓
Action Révoquer
    ↓
Confirmation
    ↓
API
    ↓
Backend
    ↓
Session révoquée
    ↓
Refetch sessions
```

Si l'utilisateur révoque sa session actuelle, le comportement doit être
traité comme une déconnexion.

------------------------------------------------------------------------

# 27. Révocation administrative

Endpoint :

``` http
DELETE /users/:id/sessions/:sessionId
```

Réservé à `ADMIN`.

Le frontend doit afficher cette action uniquement dans l'interface
administrative.

Après succès :

``` text
Mutation
   ↓
Invalidation sessions utilisateur
   ↓
Refetch
```

------------------------------------------------------------------------

# 28. Déconnexion globale

Endpoint :

``` http
POST /users/admin/logout-all-users
```

Cette opération est réservée à l'administrateur.

Elle doit être protégée par une confirmation forte dans l'interface.

Exemple :

``` text
Déconnecter tous les utilisateurs ?

Cette opération invalidera les sessions actives de tous les utilisateurs.
[Annuler] [Confirmer]
```

Après succès, le frontend doit afficher le résultat retourné par le
backend.

Cette action ne doit jamais être déclenchée accidentellement par un
simple clic.

------------------------------------------------------------------------

# 29. Statistiques utilisateurs

Le backend expose des statistiques telles que :

``` ts
interface UserStatistics {
  total: number;

  byRole: {
    ADMIN: number;
    CONSULTANT: number;
    ETUDIANT: number;
  };

  active: number;
  inactive: number;
  online: number;
  newThisMonth: number;
  newThisWeek: number;

  generatedAt: string;
}
```

Le frontend peut afficher :

``` text
Total utilisateurs
Étudiants
Consultants
Administrateurs
Actifs
Inactifs
En ligne
Nouveaux ce mois
Nouveaux cette semaine
```

`generatedAt` peut être affiché comme date de génération des
statistiques.

Le frontend ne recalcule pas ces statistiques à partir de la liste
paginée.

------------------------------------------------------------------------

# 30. Profil consultant

Un consultant dispose d'un profil spécifique.

Il existe trois niveaux de données :

``` text
Profil consultant personnel
Profil consultant semi-public
Profil consultant public
```

Ils ne doivent pas être confondus.

------------------------------------------------------------------------

# 31. Profil consultant personnel

Endpoint :

``` http
GET /users/me/consultant
```

Il est réservé au consultant connecté.

Il peut être utilisé dans :

``` text
Dashboard consultant
Profil consultant
Paramètres
```

Les données personnelles doivent rester protégées par les autorisations
backend.

------------------------------------------------------------------------

# 32. Liste semi-publique des consultants

Le backend expose une liste minimale :

``` ts
interface ConsultantSemiPublicProfile {
  id: string;
  firstName: string;
  lastName: string;
  photo: string | null;
}
```

Cette donnée est adaptée à :

-   sélection d'un consultant ;
-   listes ;
-   cartes ;
-   choix d'un consultant dans une interface.

Le frontend ne doit pas essayer de récupérer davantage de données en
modifiant arbitrairement la réponse API.

------------------------------------------------------------------------

# 33. Profil public consultant

Le profil public peut contenir :

``` text
Identité
Photo
Email
Téléphone
Destinations
Disponibilités
Statistiques
Avis
Réponses aux avis
```

Le backend construit également les disponibilités à partir des
destinations affectées et exclut les week-ends et jours fériés.

Le frontend doit afficher les disponibilités retournées.

Il ne doit pas reconstruire lui-même la disponibilité à partir des
destinations.

------------------------------------------------------------------------

# 34. Disponibilités consultant

Le profil public peut contenir :

``` ts
interface ConsultantAvailability {
  date: string;
  availableSlots: TimeSlot[];
}
```

Exemple :

``` json
{
  "date": "2026-08-10",
  "availableSlots": [
    "SLOT_0900",
    "SLOT_0930",
    "SLOT_1000"
  ]
}
```

Le frontend doit traiter cette information comme une disponibilité
fournie par le backend.

Une disponibilité affichée dans l'interface ne garantit pas qu'elle
restera disponible au moment de créer un rendez-vous.

La vérification finale appartient au backend du module concerné.

------------------------------------------------------------------------

# 35. Avis consultant

Le profil public peut afficher les derniers avis retournés par le
backend.

Chaque avis peut contenir :

``` text
id
studentName
rating
comment
createdAt
response
```

Le frontend doit respecter l'état de modération fourni par le backend.

Un commentaire modéré peut être retourné sans son contenu.

Le frontend ne doit pas essayer de contourner cette règle.

------------------------------------------------------------------------

# 36. Modération des avis

Endpoint :

``` http
PATCH /users/:id/reviews/:reviewId/moderate
```

Réservé à `ADMIN`.

Flux :

``` text
Admin
  ↓
Review moderation
  ↓
Confirmation
  ↓
API
  ↓
Backend
  ↓
Review updated
  ↓
Invalidate consultant profile
  ↓
Refresh
```

La décision de modération appartient entièrement au backend.

------------------------------------------------------------------------

# 37. Temps réel --- Users Gateway

Le backend expose un namespace WebSocket :

``` text
/users
```

Le WebSocket permet notamment de recevoir :

``` text
identified
status
userUpdated
newReview
reviewResponse
```

L'identité du client est établie côté serveur à partir du JWT vérifié.
Le client ne doit donc jamais envoyer arbitrairement un `userId` pour
s'identifier.

------------------------------------------------------------------------

# 38. Connexion WebSocket

Architecture :

``` text
Users Socket Service
       ↓
Access Token en mémoire
       ↓
WebSocket /users
       ↓
Backend
       ↓
JWT vérifié
       ↓
Connexion acceptée
```

Le Refresh Token ne doit jamais être envoyé manuellement au WebSocket.

En production :

``` text
wss://...
```

------------------------------------------------------------------------

# 39. Événement `identified`

Après connexion, le backend peut envoyer :

``` json
{
  "userId": "...",
  "socketId": "..."
}
```

Le frontend peut utiliser cet événement uniquement pour confirmer la
connexion.

Il ne doit pas utiliser le `userId` fourni par le client pour établir
l'identité.

------------------------------------------------------------------------

# 40. Événement `status`

Le backend peut envoyer :

``` json
{
  "userId": "...",
  "isOnline": true
}
```

Le frontend peut mettre à jour l'indicateur de présence.

Exemple :

``` text
● En ligne
○ Hors ligne
```

La présence doit être considérée comme une donnée temps réel et non
comme une propriété persistante locale.

------------------------------------------------------------------------

# 41. Événement `userUpdated`

Lorsqu'un utilisateur est mis à jour, le backend peut notifier
l'utilisateur concerné.

Payload :

``` json
{
  "userId": "...",
  "data": {
    "firstName": "...",
    "lastName": "..."
  }
}
```

Le frontend doit invalider ou mettre à jour le cache correspondant.

Exemple :

``` text
userUpdated
    ↓
invalidate ['users', userId]
invalidate ['users', 'me'] si concerné
```

Il est préférable d'invalider plutôt que de reconstruire arbitrairement
un objet User incomplet.

------------------------------------------------------------------------

# 42. Synchronisation après mutation

Toute mutation Users doit définir explicitement les données affectées.

Exemple :

``` text
updateProfile
    ↓
users/me
    ↓
invalidate current user
invalidate consultant public profile si consultant
```

Pour un changement de statut :

``` text
toggleStatus
    ↓
invalidate user detail
invalidate users list
invalidate statistics
```

Pour une promotion :

``` text
promoteToConsultant
    ↓
invalidate user detail
invalidate users list
invalidate statistics
invalidate consultant lists
```

------------------------------------------------------------------------

# 43. Clés de cache recommandées

Exemples :

``` ts
['users', 'me']

['users', 'detail', userId]

['users', 'list', query]

['users', 'statistics']

['users', 'sessions', userId]

['consultants', 'list']

['consultants', 'detail', consultantId]

['consultants', 'public', consultantId]
```

Les clés doivent rester centralisées afin d'éviter les incohérences.

Exemple :

``` ts
export const userQueryKeys = {
  all: ['users'] as const,

  me: () => [...userQueryKeys.all, 'me'] as const,

  lists: () => [...userQueryKeys.all, 'list'] as const,

  list: (query: UsersQuery) =>
    [...userQueryKeys.lists(), query] as const,

  detail: (id: string) =>
    [...userQueryKeys.all, 'detail', id] as const,

  sessions: (id: string) =>
    [...userQueryKeys.all, 'sessions', id] as const,

  statistics: () =>
    [...userQueryKeys.all, 'statistics'] as const,
};
```

------------------------------------------------------------------------

# 44. Gestion des erreurs

Les erreurs doivent être traitées selon leur nature.

``` text
401
→ session invalide
→ mécanisme d'authentification

403
→ permission insuffisante

404
→ utilisateur / consultant introuvable

409
→ conflit, notamment email déjà utilisé

422
→ données invalides selon l'API

500+
→ erreur serveur
```

Le composant ne doit pas interpréter arbitrairement le code HTTP.

Le service API doit normaliser les erreurs.

------------------------------------------------------------------------

# 45. États UI obligatoires

Chaque requête importante doit gérer :

``` text
loading
success
error
empty
```

Pour une liste :

``` text
Chargement
    ↓
Liste
    ↓
Liste vide
    ↓
Erreur
```

Pour une mutation :

``` text
idle
loading
success
error
```

Les boutons doivent être désactivés pendant les opérations critiques
afin d'éviter les doubles soumissions.

------------------------------------------------------------------------

# 46. Confirmations obligatoires

Une confirmation doit être utilisée avant les opérations destructives ou
fortement sensibles :

-   désactivation ;
-   suppression ;
-   restauration si nécessaire selon UX ;
-   reset password ;
-   révocation d'une session ;
-   logout global ;
-   modération d'un avis lorsque l'action est irréversible ou sensible.

Exemple :

``` text
Êtes-vous sûr de vouloir désactiver ce compte ?

Cette action invalidera ses sessions actives.

[Annuler] [Désactiver]
```

------------------------------------------------------------------------

# 47. Gestion des mutations concurrentes

Le frontend doit empêcher les doubles mutations.

Exemple :

``` text
Promouvoir consultant
      ↓
isPending = true
      ↓
Bouton désactivé
      ↓
Réponse backend
      ↓
isPending = false
```

Il ne faut jamais lancer plusieurs mutations identiques en parallèle
depuis le même contrôle UI.

------------------------------------------------------------------------

# 48. Formulaires

Les formulaires doivent utiliser des schemas dédiés.

Exemple :

``` text
UpdateProfileSchema
UpdateUserSchema
ResetUserPasswordSchema
ModerateReviewSchema
```

Les schemas frontend servent à :

-   afficher rapidement les erreurs ;
-   améliorer l'expérience utilisateur ;
-   empêcher les soumissions manifestement invalides.

Ils ne remplacent pas les DTOs et validations backend.

------------------------------------------------------------------------

# 49. Sécurité des formulaires

Les champs sensibles doivent être traités avec précaution.

Pour un mot de passe :

``` text
input type="password"
```

Après soumission :

``` text
form.reset()
```

Ne jamais :

``` ts
console.log(formData);
```

Ne jamais placer un mot de passe dans :

``` text
URL
query string
localStorage
sessionStorage
IndexedDB
logs
```

------------------------------------------------------------------------

# 50. Suppression et restauration dans l'interface

Le frontend doit séparer les vues :

``` text
/users
```

et :

``` text
/users/deleted
```

La liste principale ne doit pas mélanger automatiquement les comptes
supprimés avec les comptes actifs.

Le backend reste responsable de la sélection selon `isDeleted`.

------------------------------------------------------------------------

# 51. Online / Offline

La présence `isOnline` retournée par le backend doit être considérée
comme une information serveur.

Le frontend peut l'actualiser grâce aux événements WebSocket.

Exemple :

``` text
WebSocket status=true
       ↓
cache User
       ↓
isOnline=true
```

Lors de la perte de connexion WebSocket, le frontend ne doit pas
automatiquement conclure que l'utilisateur est hors ligne côté serveur
sans stratégie définie.

------------------------------------------------------------------------

# 52. Responsive design

La gestion Users doit fonctionner sur :

-   desktop ;
-   tablette ;
-   mobile.

Pour l'administration :

``` text
Desktop
→ tableau complet

Mobile
→ cartes / lignes condensées
→ actions dans menu
```

Les actions critiques doivent rester accessibles sans surcharger
l'interface.

------------------------------------------------------------------------

# 53. Accessibilité

Les composants Users doivent respecter :

-   labels explicites ;
-   navigation clavier ;
-   focus visible ;
-   boutons accessibles ;
-   dialogues accessibles ;
-   messages d'erreur associés aux champs ;
-   textes compréhensibles ;
-   alternatives textuelles pour les images.

Les badges de statut ne doivent pas dépendre uniquement de la couleur.

------------------------------------------------------------------------

# 54. Performance

La liste Users doit obligatoirement utiliser :

-   pagination serveur ;
-   recherche serveur ;
-   debounce de recherche ;
-   cache serveur ;
-   invalidation ciblée ;
-   chargement différé des détails lorsque pertinent.

Il ne faut pas charger :

``` text
10 000 utilisateurs
```

pour afficher :

``` text
20 utilisateurs
```

------------------------------------------------------------------------

# 55. Préchargement

Le détail d'un utilisateur peut être préchargé lorsqu'une navigation
vers ce détail est hautement probable.

Exemple :

``` text
Hover / intention de navigation
       ↓
prefetch user detail
```

Le préchargement ne doit pas provoquer des centaines de requêtes.

------------------------------------------------------------------------

# 56. Architecture du service

Le service doit encapsuler toutes les opérations Users.

Exemple conceptuel :

``` ts
export const usersService = {
  getMe,
  updateMe,
  updateMyPhoto,

  findAll,
  findOne,
  create,
  update,
  toggleStatus,
  promoteToConsultant,
  restore,
  remove,
  resetPassword,

  getSessions,
  revokeSession,
  adminRevokeSession,
  logoutAllUsers,

  getStatistics,

  getConsultantProfile,
  listConsultants,
  getConsultantPublicProfile,

  moderateReview,
};
```

Le service ne doit pas contenir de logique React.

------------------------------------------------------------------------

# 57. Hooks recommandés

Exemples :

``` ts
useCurrentUser()
useUpdateProfile()
useUpdateUserPhoto()

useUsers(query)
useUser(id)
useCreateUser()
useUpdateUser()
useToggleUserStatus()
usePromoteUser()
useRestoreUser()
useDeleteUser()
useResetUserPassword()

useUserSessions(userId)
useRevokeUserSession()
useAdminRevokeSession()
useLogoutAllUsers()

useUserStatistics()

useConsultants()
useConsultantProfile(id)
usePublicConsultantProfile(id)
useModerateReview()
```

Les hooks doivent rester fins et réutilisables.

------------------------------------------------------------------------

# 58. Tests frontend

Les tests doivent couvrir au minimum :

## Profil

-   [ ] chargement du profil ;
-   [ ] modification réussie ;
-   [ ] erreur de modification ;
-   [ ] upload photo ;
-   [ ] erreur upload.

## Administration

-   [ ] liste paginée ;
-   [ ] recherche ;
-   [ ] filtres ;
-   [ ] tri ;
-   [ ] détails ;
-   [ ] activation ;
-   [ ] désactivation ;
-   [ ] promotion ;
-   [ ] suppression ;
-   [ ] restauration ;
-   [ ] reset password.

## Sessions

-   [ ] affichage sessions ;
-   [ ] révocation ;
-   [ ] session actuelle ;
-   [ ] déconnexion globale.

## Consultant

-   [ ] liste semi-publique ;
-   [ ] profil public ;
-   [ ] disponibilités ;
-   [ ] statistiques ;
-   [ ] avis ;
-   [ ] réponse aux avis ;
-   [ ] modération.

## Temps réel

-   [ ] connexion ;
-   [ ] déconnexion ;
-   [ ] statut online ;
-   [ ] userUpdated ;
-   [ ] reconnexion contrôlée.

------------------------------------------------------------------------

# 59. Checklist d'implémentation

## Architecture

-   [ ] Pages séparées des composants.
-   [ ] Composants séparés des hooks.
-   [ ] Hooks séparés des services.
-   [ ] Services séparés de l'API Client.
-   [ ] Aucun appel API direct dans un composant.

## Profil

-   [ ] `GET /users/me`
-   [ ] `PUT /users/me`
-   [ ] `PUT /users/me/photo`
-   [ ] Cache profil correctement invalidé.

## Administration

-   [ ] Liste paginée.
-   [ ] Recherche serveur.
-   [ ] Filtres serveur.
-   [ ] Tri serveur.
-   [ ] Détails.
-   [ ] Création si exposée.
-   [ ] Modification.
-   [ ] Activation / désactivation.
-   [ ] Promotion consultant.
-   [ ] Suppression.
-   [ ] Restauration.
-   [ ] Reset password.
-   [ ] Statistiques.

## Sessions

-   [ ] Liste des sessions.
-   [ ] Révocation.
-   [ ] Révocation administrative.
-   [ ] Déconnexion globale.

## Consultants

-   [ ] Profil personnel.
-   [ ] Liste semi-publique.
-   [ ] Profil public.
-   [ ] Destinations.
-   [ ] Disponibilités.
-   [ ] Statistiques.
-   [ ] Avis.

## Temps réel

-   [ ] Namespace `/users`.
-   [ ] Authentification WebSocket.
-   [ ] Événement `identified`.
-   [ ] Événement `status`.
-   [ ] Événement `userUpdated`.
-   [ ] Reconnexion contrôlée.
-   [ ] Invalidation du cache après événement pertinent.

## Sécurité

-   [ ] Aucun token persistant.
-   [ ] Aucun mot de passe dans les logs.
-   [ ] Aucun secret dans les URLs.
-   [ ] Aucun contournement des autorisations.
-   [ ] Confirmation des actions sensibles.
-   [ ] Backend toujours considéré comme source de vérité.

------------------------------------------------------------------------

# 60. Règle finale

Le module Users doit suivre le principe :

``` text
UI
 ↓
Hook
 ↓
Users Service
 ↓
API Client
 ↓
Backend
 ↓
Source de vérité
```

Pour les données serveur :

``` text
Backend
 ↓
Cache serveur frontend
 ↓
Composants
```

Pour le temps réel :

``` text
Backend WebSocket
 ↓
Users Socket Service
 ↓
Invalidation / mise à jour du cache
 ↓
UI
```

Le frontend ne doit jamais devenir une seconde implémentation du module
Users.

Il doit orchestrer l'expérience utilisateur autour des capacités
exposées par le backend, tout en respectant strictement les
autorisations, les états et les invariants retournés par celui-ci.
