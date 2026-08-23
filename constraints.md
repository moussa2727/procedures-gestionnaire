# 📋 Règles Métier - Système de Procédures

## 📌 Table des Matières
1. [Définitions](#définitions)
2. [Règles de Base](#règles-de-base)
3. [Gestion des Étapes](#gestion-des-étapes)
4. [Gestion des Rôles](#gestion-des-rôles)
5. [Contraintes Transactionnelles](#contraintes-transactionnelles)
6. [Système de Notifications](#système-de-notifications)
7. [Audit et Traçabilité](#audit-et-traçabilité)
8. [Verrouillage et Concurrence](#verrouillage-et-concurrence)

---

## 🎯 Définitions

### Statuts des Étapes
| Statut | Description |
|--------|-------------|
| `PENDING` | Étape en attente de traitement |
| `IN_PROGRESS` | Étape en cours de traitement |
| `COMPLETED` | Étape terminée avec succès |
| `REJECTED` | Étape rejetée ou annulée |

### Statuts des Procédures
| Statut | Description |
|--------|-------------|
| `IN_PROGRESS` | Procédure en cours |
| `COMPLETED` | Toutes les étapes terminées avec succès |
| `REJECTED` | Procédure rejetée |
| `CANCELLED` | Procédure annulée |

---

## 🔒 Règles de Base

### 1. Création d'une Procédure
```yaml
Conditions obligatoires:
  - Rendez-vous doit être CONFIRMED ou COMPLETED
  - Aucune procédure existante pour ce rendez-vous
  - Au moins une étape doit être définie
  - Seul un ADMIN ou CONSULTANT peut créer

Acteurs autorisés:
  - ✅ ADMIN
  - ✅ CONSULTANT (uniquement sur ses rendez-vous)
  - ❌ ETUDIANT


  Règles:
  - Les étapes sont créées dans l'ordre défini
  - Ordre = orderIndex (0, 1, 2, ...)
  - Statut initial = PENDING
  - Une étape ne peut pas être supprimée individuellement
  Règle d'Or: 
  Une étape ne peut être modifiée que si l'étape immédiatement précédente est COMPLETED

Vérifications obligatoires:
  1. ✅ Aucune étape précédente REJECTED
  2. ✅ L'étape immédiatement précédente est COMPLETED
  3. ✅ Aucune étape précédente PENDING ou IN_PROGRESS

  Règle: 
  Le rejet d'une étape annule uniquement les étapes suivantes

Comportement:
  - ✅ Étapes suivantes (orderIndex >) : Passent en REJECTED
  - ❌ Étapes précédentes (orderIndex <) : Statut préservé (historique réel)
  - ⚠️ Cascade uniquement sur PENDING/IN_PROGRESS

Justification:
  "Conserver le statut réel des étapes précédentes pour l'historique"

  ADMIN
yaml
Permissions:
  - Accès complet à toutes les procédures
  - Peut supprimer n'importe quel commentaire
  - Accès admin aux notifications en temps réel


  CONSULTANT
yaml
Permissions:
  - ✅ Créer des procédures sur ses rendez-vous
  - ✅ Modifier les étapes de ses procédures
  - ✅ Rejeter/clôturer ses procédures
✅ Procédure en IN_PROGRESS
    ✅ Étudiant ou ADMIN peut annuler
    ❌ Consultant ne peut pas annuler (utiliser rejet)
    - ❌ Accès uniquement à ses procédures
ETUDIANT
yaml
Permissions:
  - ✅ Consulter ses procédures
  - ✅ Annuler ses procédures
  - ✅ Ajouter/supprimer ses commentaires
  - ❌ NE PEUT PAS modifier les étapes
  - ❌ NE PEUT PAS clôturer/rejeter
  - ❌ Accès uniquement à ses procédures

  Règles Transactionnelles
yaml
Atomicité:
  - Toutes les opérations critiques sont dans des transactions
  - Rollback automatique en cas d'échec
  - Audit logs inclus dans les transactions

Isolation:
  - Verrouillage par étape pour les modifications
  - Verrouillage par procédure pour les lectures
  - Timeout de 10s pour les opérations d'étape
  - Timeout de 15s pour les opérations de procédure

Intégrité:
  - Validation des prérequis avant toute modification
  - Vérification du statut non-terminal
  - Cascade de rejet uniquement sur étapes éligibles

  États Terminaux
yaml
Procédure Terminale:
  - COMPLETED
  - REJECTED
  - CANCELLED

Comportement:
  - Aucune modification possible
  - Aucune cascade déclenchée
  - Seuls les commentaires sont autorisés

  Canaux de Notification
yaml
WebSocket:
  - Réel temps (instantané)
  - Basé sur les rooms utilisateur
  - Room admin pour les administrateurs
  - Events: procedure:*, admin:*

Email:
  - Asynchrone (queue)
  - Templates dédiés par événement
  - Non-bloquant pour l'opération principale

  Obligation:
  - ✅ Logs INDIVIDUELS par étape pour les cascades
  - ✅ Logs DÉTAILLÉS pour les annulations
  - ✅ EntityId spécifique (pas null)
  - ✅ Métadonnées enrichies

Champs Obligatoires:
  - userId: Acteur de l'action
  - action: CREATE | UPDATE | CANCEL | COMPLETE | DELETE
  - entity: Procedure | Step | ProcedureComment
  - entityId: Identifiant de l'entité
  - success: boolean
  - ipAddress: Source de la requête
  - userAgent: Browser/Client
  - metadata: JSON détaillé

  Stratégie de Verrouillage
yaml
Principe:
  - Granularité par ÉTAPE pour les modifications
  - Verrouillage par PROCÉDURE pour les lectures
  - Verrouillage pessimiste pour les opérations critiques

Clés de Verrouillage:
  - Étape: lock:procedure:{procedureId}:step:{stepId}
  - Procédure: lock:procedure:{procedureId}:read
  - Annulation: lock:procedure:{procedureId}:cancellation

Timeouts:
  - Opération d'étape: 10s
  - Opération de procédure: 15s
  - Annulation: 15s

  Opérations Concurrentes
yaml
Lecture:
  - Pas de verrouillage strict
  - Accès en lecture seule
  - Version de cohérence (optimistic)

Modification:
  - Verrouillage par étape
  - Vérification de l'état avant modification
  - Rollback en cas de conflit

Cascade:
  - Verrouillage sur toutes les étapes affectées
  - Atomicité de l'opération complète
  - Logs individuels pour traçabilité

Annulation:
  - Verrouillage global de la procédure
  - Traitement de toutes les étapes
  - Cascade des étapes non-terminées

  Règle d'Or: 
  "Une étape ne peut être modifiée que si l'étape immédiatement précédente 
  est COMPLETED"

Vérifications obligatoires avant modification:
  1. ✅ Aucune étape précédente ne doit être REJECTED
  2. ✅ L'étape immédiatement précédente doit être COMPLETED
  3. ✅ Aucune étape précédente ne doit être PENDING ou IN_PROGRESS
  4. ✅ La procédure ne doit pas être dans un état terminal
  5. ✅ L'utilisateur doit avoir les droits nécessaires

  graph LR
    subgraph "Cas 1: Modification Normale"
        A[Étape A - COMPLETED] --> B[Étape B - MODIFIABLE]
        B[Étape B - COMPLETED] --> C[Étape C - MODIFIABLE]
        C[Étape C - COMPLETED] --> D[Étape D - MODIFIABLE]
    end

    subgraph "Cas 2: Rejet en Cascade"
        E[Étape A - COMPLETED] --> F[Étape B - COMPLETED]
        F --> G[Étape C - REJECTED]
        G -.->|Cascade| H[Étape D - REJETÉE]
        G -.->|Cascade| I[Étape E - REJETÉE]
        E -->|Préservé| J[Historique Réel]
        F -->|Préservé| K[Historique Réel]
    end

    subgraph "Cas 3: Annulation Procédure"
        L[Étape A - COMPLETED] --> M[Étape B - PENDING]
        L --> N[Étape C - IN_PROGRESS]
        L --> O[Étape D - PENDING]
        M -.->|Annulation| P[REJECTED]
        N -.->|Annulation| Q[REJECTED]
        O -.->|Annulation| R[REJECTED]
    end

    Déroulement:
  1. Création procédure avec 4 étapes (A, B, C, D)
  2. Étape A: PENDING → IN_PROGRESS → COMPLETED
  3. Étape B: PENDING → IN_PROGRESS → COMPLETED
  4. Étape C: PENDING → IN_PROGRESS → COMPLETED
  5. Étape D: PENDING → IN_PROGRESS → COMPLETED
  6. Procédure: IN_PROGRESS → COMPLETED

Résultat:
  - ✅ Toutes les étapes COMPLETED
  - ✅ Procédure clôturée avec succès
  - ✅ Notifications à chaque étape sans être invasives

  Situation initiale:
  - Étape A: COMPLETED ✅
  - Étape B: COMPLETED ✅
  - Étape C: PENDING ⏳
  - Étape D: PENDING ⏳
  - Étape E: PENDING ⏳

Action: Consultant rejette l'étape C
  - Raison: "Documentation incomplète"

Résultat:
  - Étape A: COMPLETED ✅ (préservé)
  - Étape B: COMPLETED ✅ (préservé)
  - Étape C: REJECTED ❌ (source du rejet)
  - Étape D: REJECTED ❌ (cascade)
  - Étape E: REJECTED ❌ (cascade)

Bloqué:
  - ❌ Impossible de modifier D ou E (REJECTED)
  - ❌ Impossible de modifier C (REJECTED)
  - ❌ Impossible de modifier A ou B (précédentes)
  - ❌ Impossible de clôturer la procédure

Solutions possibles:
  1. Rejeter la procédure entièrement
  2. Annuler la procédure (si étudiant)
  3. Recommencer avec une nouvelle procédure



  Situation initiale:
  - Étape A: COMPLETED ✅
  - Étape B: PENDING ⏳
  - Étape C: PENDING ⏳

Action interdite: Consultant tente de modifier l'étape C

Vérifications échouées:
  ❌ Étape immédiatement précédente (B) n'est pas COMPLETED
  ❌ Étape précédente (B) est PENDING

Réponse système:
  "L'étape 'C' ne peut pas être modifiée car l'étape 'B' n'est pas encore terminée"

Solutions valides:
  ✅ Modifier d'abord l'étape B (passer en COMPLETED)
  ✅ Rejeter l'étape B (cascade sur C)


  Situation:
  - Étudiant connecté
  - Sa procédure en cours
  - Étape A: COMPLETED ✅
  - Étape B: IN_PROGRESS ⏳

Action interdite: Étudiant tente de modifier l'étape B

Vérifications:
  ❌ Rôle ETUDIANT non autorisé pour les modifications d'étapes

Réponse système:
  "Seul le consultant affecté ou un administrateur peut modifier 
  l'avancement d'une étape"

Actions autorisées pour étudiant:
  ✅ Consulter la procédure
  ✅ Annuler la procédure (si IN_PROGRESS)
  ✅ Ajouter des commentaires
  ✅ Supprimer ses propres commentaires


  Situation:
  - Étudiant connecté
  - Sa procédure en cours
  - Étape A: COMPLETED ✅
  - Étape B: IN_PROGRESS ⏳
  - Étape C: PENDING ⏳
  - Étape D: PENDING ⏳

Action: Étudiant annule la procédure
  - Motif: "Changement de projet"

Résultat:
  - Procédure: IN_PROGRESS → CANCELLED
  - Étape A: COMPLETED ✅ (préservé)
  - Étape B: IN_PROGRESS → REJECTED ❌
  - Étape C: PENDING → REJECTED ❌
  - Étape D: PENDING → REJECTED ❌

Notifications:
  - Étudiant: "Votre procédure a été annulée"
  - Consultant: "Procédure annulée par l'étudiant"
  - Admin: "Procédure annulée"

Effets secondaires:
  - Tous les rendez-vous de suivi sont annulés
  - Logs détaillés des étapes affectées
  - Email récapitulatif envoyé



  Situation:
  - Consultant connecté
  - Sa procédure en cours

Action interdite: Consultant tente d'annuler la procédure

Vérifications:
  ❌ Rôle CONSULTANT non autorisé pour l'annulation

Réponse système:
  "Un consultant ne peut pas annuler une procédure - 
  utilisez le rejet si nécessaire"

Actions autorisées pour consultant:
  ✅ Rejeter la procédure
  ✅ Rejeter/modifier les étapes
  ✅ Clôturer la procédure


  Situation:
  - Consultant connecté
  - Sa procédure en cours
  - Étape A: COMPLETED ✅
  - Étape B: REJECTED ❌

Action: Consultant rejette la procédure
  - Motif: "Dossier incomplet après rejet d'étape"

Résultat:
  - Procédure: IN_PROGRESS → REJECTED
  - Étape A: COMPLETED ✅ (préservé)
  - Étape B: REJECTED ❌ (préservé)

Effets:
  - Procédure en état terminal
  - Aucune modification ultérieure possible
  - Notification à l'étudiant
  - Email de rejet envoyé
  - Log d'audit détaillé

  Situation initiale:
  - Étape A: COMPLETED ✅
  - Étape B: COMPLETED ✅
  - Étape C: COMPLETED ✅
  - Étape D: COMPLETED ✅

Action: Consultant clôture la procédure

Vérifications réussies:
  ✅ Toutes les étapes sont COMPLETED
  ✅ Aucune étape REJECTED
  ✅ Procédure en IN_PROGRESS

Résultat:
  - Procédure: IN_PROGRESS → COMPLETED
  - Toutes les étapes préservées en COMPLETED
  - Aucune modification ultérieure possible
  - Notifications et email envoyés
  - Log d'audit de clôture

Tentative de modification ultérieure:
  ❌ IMPOSSIBLE - Procédure en état terminal
  Message: "Cette procédure est terminée et ne peut plus être modifiée"

  Situation:
  - Étape A: COMPLETED ✅
  - Étape B: PENDING ⏳
  - Étape C: REJECTED ❌

Action tentée: Consultant veut modifier l'étape B (précédente)

Pourquoi c'est interdit:
  1. B est précédée par A (COMPLETED) ✅
  2. B est suivie par C (REJECTED) ❌
  3. Une étape précédente modifiée affecterait l'historique

Règle métier:
  "On ne modifie JAMAIS une étape précédente après qu'une étape suivante 
  ait été traitée"

Pourquoi:
  - Historique réel des étapes
  - Traçabilité des rejets
  - Cohérence du workflow

Solution:
  - Rejeter la procédure entièrement
  - Annuler la procédure
  - Recommencer avec une nouvelle procédure
  - Ne pas modifier les étapes précédentes

  Règles d'or:
  "Une procédure en état terminal (COMPLETED/REJECTED/CANCELLED) 
  ne peut plus être modifiée"

Vérifications systématiques:
  1. Avant toute modification → Vérifier statut non-terminal
  2. Si terminal → Rejeter immédiatement l'action
  3. Erreur claire pour l'utilisateur

Exemples d'actions bloquées:
  - Modification d'étape sur procédure TERMINÉE
  - Ajout de commentaire sur procédure TERMINÉE
  - Rejet sur procédure déjà REJECTED
  - Annulation sur procédure déjà COMPLETED

  Situation:
  - Consultant A modifie l'étape B
  - Consultant B tente de modifier la même étape B en parallèle

Système:
  - Premier verrouillage réussi: stepLock = lock:procedure:123:step:456
  - Deuxième tentative: Attend 10s timeout

Résultat:
  - Consultant A: ✅ Modification réussie
  - Consultant B: ❌ Timeout - "Impossible de verrouiller l'étape"

Protection:
  - Verrouillage par étape
  - Timeout configurable (10s)
  - Logs des tentatives échouées
  - Pas de deadlock possible

  Situation:
  - Étape A: COMPLETED ✅
  - Étape B: REJECTED ❌
  - Étape C: PENDING ⏳

Action tentée: Consultant modifie l'étape C

Vérifications:
  ❌ Étape précédente (B) est REJECTED
  
Réponse système:
  "L'étape 'C' ne peut pas être modifiée car l'étape 'B' a été rejetée."

Solutions:
  1. Rejeter la procédure entièrement
  2. Annuler la procédure
  3. Créer une nouvelle procédure
  4. ❌ Impossible de "réactiver" l'étape B

  
   Modification d'Étape (Nom / Ordre)
Règle:
  "Une étape peut être modifiée (nom ou ordre) UNIQUEMENT si elle n'a 
   pas encore été traitée (statut PENDING) ET qu'aucune étape suivante 
   n'a été COMPLETED"

Conditions:
  1. ✅ L'étape doit être PENDING (pas encore commencée)
  2. ✅ Aucune étape suivante ne doit être COMPLETED
  3. ✅ La procédure ne doit pas être dans un état terminal
  4. ✅ L'utilisateur doit avoir les droits (admin/consultant)

Suppression d'une Étape
Règle:
  "Une étape peut être supprimée UNIQUEMENT si elle est PENDING 
   et qu'aucune étape suivante n'a été COMPLETED"

Règles de cascade:
  1. Si suppression d'une étape au milieu:
     - Les étapes suivantes sont réindexées (orderIndex - 1)
     - Les statuts suivants restent inchangés
     - Logs d'audit de la suppression

  2. Si suppression de la dernière étape:
     - Simplement retirée de la liste
     - Aucun impact sur les autres

  3. Si suppression de la première étape:
     - La nouvelle première étape devient le prérequis
     - Les étapes suivantes réindexées

Réorganisation de l'Ordre
Règle:
  "L'ordre des étapes PENDING peut être réorganisé tant qu'aucune 
   étape suivante n'a été COMPLETED"
ypes de réorganisation:
  1. Déplacement simple: C → B (ordre inversé)
  2. Insertion: Décalage des suivantes
  3. Réindexation complète des PENDING

Conditions:
  - Seules les étapes PENDING peuvent être déplacées
- Les étapes COMPLETED/REJECTED conservent leur position
  - Les étapes suivantes PENDING sont réindexées automatiquement
  - La continuité du workflow est préservée