```markdown
# Invariants métier

Les invariants métier constituent les contraintes fondamentales du système.

Ils doivent toujours être respectés, quelles que soient les fonctionnalités présentes ou futures.

Une violation d'un invariant constitue une erreur métier bloquante.

## Utilisateurs

- Un seul compte ADMIN existe dans tout le système.
- L'adresse email de l'administrateur est obligatoirement égale à `ADMIN_EMAIL`.
- Les rôles autorisés sont uniquement :
  - ADMIN
  - CONSULTANT
  - ETUDIANT
- Tout utilisateur appartient obligatoirement à l'un de ces rôles.

## Sessions

Tous les utilisateurs sont limités à un maximum de **2 sessions simultanées**.

Cette contrainte s'applique à :

- ADMIN
- CONSULTANT
- ETUDIANT

Toute tentative de création d'une troisième session doit être refusée conformément aux règles métier.

## Destinations

Une destination ne peut jamais exister sans consultant affecté.

Par conséquent :

- la création d'une destination est autorisée uniquement si un ou plusieurs consultants lui sont affectés dans la même transaction ;
- il est interdit de créer une destination sans consultant ;
- il est interdit de retirer le dernier consultant d'une destination tant qu'aucun autre consultant ne lui est affecté ;
- toute modification des affectations doit préserver cette contrainte.

## Affectations

Les affectations Consultant ↔ Destination :

- sont réalisées exclusivement par l'administrateur ;
- ne peuvent jamais être modifiées par un consultant ;
- déterminent exclusivement toutes les autorisations du consultant.

## Disponibilités

Toutes les destinations partagent le même planning de travail.

Le planning est défini par :

- les jours ouvrables : lundi à vendredi ;
- l'énumération TimeSlot.

Les disponibilités sont calculées dynamiquement.

Aucune disponibilité ne doit être stockée en base de données.

## Ressources

Une réservation validée rend immédiatement indisponible le créneau correspondant pour le consultant concerné.

Deux réservations incompatibles ne peuvent jamais exister simultanément pour un même consultant.

Cette règle est valable quel que soit :

- le type de rendez-vous ;
- la destination ;
- la procédure concernée.

## Transactions

Toutes les opérations critiques sont atomiques.

Aucun état intermédiaire ne doit être observable.

Toutes les contraintes métier doivent rester vraies avant, pendant et après chaque transaction.

---

# Etats finaux

Les états suivants sont considérés comme définitifs.

## Procédure

Une procédure :

- TERMINEE
- ANNULEE
- REJETEE

devient non modifiable.

Il est interdit de :

- modifier son statut ;
- modifier ses étapes ;
- ajouter ou supprimer des commentaires si les règles métier ne l'autorisent pas ;
- modifier ses informations.

Toute tentative doit être refusée.

---

## Rendez-vous

Un rendez-vous :

- TERMINE
- ANNULE

devient non modifiable.

Il est interdit de :

- modifier sa date ;
- modifier son créneau ;
- modifier son consultant ;
- modifier son statut sauf opération explicitement autorisée.

---

## FollowUpMeeting

Un FollowUpMeeting :

- TERMINE
- ANNULE

devient non modifiable.

Il est interdit de :

- modifier sa date ;
- modifier son créneau ;
- modifier son consultant ;
- modifier son statut sauf opération explicitement autorisée.

---

# Transactions

Toutes les opérations modifiant plusieurs agrégats métier doivent obligatoirement être exécutées dans une unique transaction Prisma.

Aucune opération critique ne doit effectuer plusieurs écritures indépendantes.

Les transactions concernent notamment, sans s'y limiter :

- création d'une destination ;
- affectation des consultants ;
- création d'un rendez-vous ;
- création d'un FollowUpMeeting ;
- création d'une procédure ;
- réplanification ;
- annulation ;
- suppression ;
- mise à jour des étapes ;
- changement de statut ;
- création des notifications ;
- réservation ou libération d'un créneau ;
- toute future opération modifiant plusieurs ressources métier.

Toutes les écritures doivent être validées ensemble ou annulées ensemble.

---

# Vérification des disponibilités

Une vérification complète des disponibilités est obligatoire avant :

- toute création d'un rendez-vous ;
- toute création d'un FollowUpMeeting ;
- toute réplanification ;
- toute opération susceptible de modifier la réservation d'un consultant.

La vérification comprend notamment :

- l'existence de la destination ;
- l'existence du consultant ;
- le rattachement du consultant à la destination ;
- la disponibilité du consultant ;
- l'absence de réservation concurrente ;
- le respect du planning de travail ;
- le respect des délais d'annulation ;
- le respect de toutes les règles métier actuelles et futures.

---

# Réservation atomique

La réservation du créneau du consultant et la création du rendez-vous doivent appartenir à la même transaction.

Le même principe s'applique aux FollowUpMeeting.

La réservation ne peut jamais être effectuée séparément.

Il ne doit jamais exister d'état intermédiaire où :

- le rendez-vous existe sans réservation ;
- la réservation existe sans rendez-vous.

---

# Réplanification

Toute réplanification est atomique.

Elle comprend obligatoirement :

- la vérification du nouveau créneau ;
- la libération de l'ancien créneau ;
- la réservation du nouveau créneau ;
- la mise à jour du rendez-vous ;
- la mise à jour des notifications si nécessaire.

Si l'une de ces opérations échoue :

- aucune modification n'est conservée ;
- l'ancien créneau reste réservé ;
- le rendez-vous reste inchangé.

---

# Gestion des erreurs métier

Toute violation d'une règle métier doit obligatoirement provoquer :

- le rollback complet de la transaction ;
- l'absence totale de modification persistée ;
- la libération des éventuels verrous acquis ;
- le retour d'une erreur métier explicite.

Aucun état intermédiaire ne doit subsister.

---

# Verrou logique

Le verrou logique constitue une contrainte métier.

Il garantit qu'une même ressource ne puisse jamais être réservée simultanément.

Le verrou logique ne peut pas être modélisé directement dans Prisma.

Son implémentation relève du service applicatif.

Il doit obligatoirement être utilisé avant toute opération de réservation.

---

# Cycle obligatoire d'une réservation

Toute réservation doit respecter strictement le cycle suivant.

Début de transaction

↓

Acquisition du verrou logique

↓

Lecture des ressources

↓

Validation des règles métier

↓

Validation des autorisations

↓

Validation des disponibilités

↓

Validation des contraintes métier

↓

Création ou mise à jour des données métier

↓

Création ou suppression de la réservation du consultant

↓

Création des notifications éventuelles

↓

Libération du verrou logique

↓

Commit

---

En cas d'erreur :

Début du rollback

↓

Annulation complète des écritures

↓

Libération immédiate du verrou logique

↓

Retour d'une erreur métier

---

# Concurrence

Le système doit empêcher toute double réservation.

Cette garantie doit être assurée même :

- avec plusieurs utilisateurs ;
- avec plusieurs requêtes simultanées ;
- avec plusieurs instances de l'application ;
- avec plusieurs serveurs ;
- avec plusieurs traitements parallèles.

Une réservation concurrente ne doit jamais conduire à deux rendez-vous incompatibles.

---

# Garanties métier

Le système garantit en permanence que :

- une destination possède toujours au moins un consultant ;
- un consultant n'agit que sur les destinations qui lui sont affectées ;
- un étudiant ne crée que ses propres rendez-vous ;
- toutes les disponibilités sont recalculées dynamiquement ;
- aucune disponibilité n'est stockée ;
- deux rendez-vous incompatibles ne peuvent jamais être validés simultanément ;
- toutes les opérations critiques sont transactionnelles ;
- toute violation d'une règle métier provoque un rollback complet ;
- aucun verrou logique ne reste acquis après la fin d'une transaction ;
- aucune fonctionnalité actuelle ou future ne peut contourner ces contraintes fondamentales.
```
Un ConsultantBooking appartient obligatoirement à un seul rendez-vous.
Une procédure possède toujours exactement un étudiant.

Une procédure possède toujours exactement un consultant.

Une procédure possède toujours exactement une destination.

Toutes les autorisations sont évaluées au moment de l'action.

Aucune autorisation ne peut être déduite d'un état précédemment mémorisé.

Il ne peut jamais référencer simultanément :

- un RendezVous ;
- un FollowUpMeeting.

Une réservation orpheline est interdite.

Toute suppression du rendez-vous associé doit entraîner la suppression ou la libération de la réservation dans la même transaction.
Un FollowUpMeeting ne peut être créé que si :

- la procédure existe ;
- elle n'est pas supprimée ;
- elle n'est pas annulée ;
- elle n'est pas rejetée ;
- elle appartient à l'étudiant concerné ;
- elle est rattachée à la destination concernée.
Ordre obligatoire des validations

1. Authentification
2. Autorisation
3. Existence des ressources
4. Cohérence des relations
5. Contraintes métier
6. Disponibilités
7. Verrou logique
8. Transaction
9. Écriture
10. Notifications
11. Commit

Toute suppression doit préserver l'intégrité référentielle.

Aucune suppression ne peut produire :

- une réservation orpheline ;
- une procédure orpheline ;
- un commentaire orphelin ;
- une notification invalide ;
- une relation ConsultantDestination invalide.

Les notifications ne constituent jamais la source de vérité.

Elles reflètent uniquement l'état métier.

Si une transaction échoue :

- aucune notification ne doit être créée ;
- aucune notification ne doit être envoyée.

Les statistiques sont toujours calculées à partir des données métier.

Elles ne doivent jamais constituer une source de vérité.

Il est interdit :



- de créer un rendez-vous dans le passé ;

- de réplanifier dans le passé ;

- de créer un FollowUpMeeting ou réplanifier dans le passé. 

Une modification des affectations Consultant ↔ Destination ne doit jamais rendre incohérents les rendez-vous ou procédures existants.



Toute modification doit respecter les contraintes métier existantes. 

Toute nouvelle fonctionnalité devra respecter l'ensemble des invariants métier décrits dans ce document.



Aucune évolution ne pourra contourner :



- les transactions ;

- les autorisations ;

- les disponibilités ;

- les verrous logiques ;

- les contraintes d'intégrité ;

- les règles de sécurité.



Toute nouvelle règle métier devra compléter ces invariants sans les contredire.


# Emails Transactionnels

## Objectif

Le système envoie des emails uniquement lorsqu'ils apportent une réelle valeur métier ou de sécurité.

Les emails sont :
- informatifs ;
- transactionnels ;
- déclenchés automatiquement par le backend ;
- indépendants des notifications internes.

> **Principe :** 
    Aucun email ne doit être envoyé pour une simple consultation ou une action sans impact métier.
    Tous les templates sont centralisés dans email/templates par dossier selon le module.
    Tous les services utilise queue pour le mailing de manière centralisé au travers de email.service dans email/.
    Le service de mailing est resend
    Les emails sont mis en file (Queue).

    L'envoi d'un email ne doit jamais bloquer une transaction métier.

    L'échec d'envoi d'un email ne remet jamais en cause une transaction déjà validée.

    Les emails sont envoyés de manière asynchrone après le commit de la transaction.

---

# 1. Bienvenue

**Template**

```text
welcome.hbs
```

### Déclencheur

Création réussie d'un nouveau compte.

### Pourquoi ?

Souhaiter la bienvenue à l'utilisateur et confirmer que son compte est opérationnel.

### Contenu

- prénom et nom ;
- message de bienvenue ;
- bouton vers :

```text
{{FRONTEND_URL}}
```

---

# 2. Mot de passe oublié

**Template**

```text
forgot-password.hbs
```

### Déclencheur

Demande de réinitialisation du mot de passe.

### Pourquoi ?

Permettre à l'utilisateur de définir un nouveau mot de passe de manière sécurisée.

### Contenu

- prénom ;
- rappel de sécurité ;
- date d'expiration du lien ;
- bouton vers :

```text
{{RESET_PASSWORD_URL}}
```

---

# 3. Mot de passe réinitialisé

**Template**

```text
password-reset-success.hbs
```

### Déclencheur

Réinitialisation du mot de passe réussie.

### Pourquoi ?

Informer l'utilisateur que son mot de passe a été modifié.

### Contenu

- prénom ;
- date et heure de modification ;
- conseil de sécurité.

---

# 4. Mot de passe modifié

**Template**

```text
password-changed.hbs
```

### Déclencheur

Modification volontaire du mot de passe depuis le compte.

### Pourquoi ?

Permettre à l'utilisateur de détecter une modification non autorisée.

### Contenu

- prénom ;
- date ;
- heure.

---

# 5. Rendez-vous créé

**Template**

```text
appointment-created.hbs
```

### Déclencheur

Création d'un rendez-vous informatif.

### Pourquoi ?

Confirmer la réservation.

### Contenu

- destination ;
- consultant ;
- date ;
- heure.

---

# 6. Rendez-vous replanifié

**Template**

```text
appointment-rescheduled.hbs
```

### Déclencheur

Réplanification d'un rendez-vous.

### Pourquoi ?

Informer l'étudiant des nouvelles informations.

### Contenu

- ancienne date ;
- nouvelle date ;
- nouvelle heure.

---

# 7. Rendez-vous annulé

**Template**

```text
appointment-cancelled.hbs
```

### Déclencheur

Annulation d'un rendez-vous.

### Pourquoi ?

Informer l'étudiant que le rendez-vous n'aura pas lieu.

### Contenu

- date ;
- heure ;
- motif d'annulation.

---

# 8. Rendez-vous de suivi créé

**Template**

```text
followup-created.hbs
```

### Déclencheur

Création d'un FollowUpMeeting.

### Pourquoi ?

Informer l'étudiant de son nouveau rendez-vous de suivi.

### Contenu

- procédure ;
- date ;
- heure ;
- consultant.

---

# 9. Rendez-vous de suivi replanifié

**Template**

```text
followup-rescheduled.hbs
```

### Déclencheur

Modification de la date ou de l'heure d'un FollowUpMeeting.

### Pourquoi ?

Informer l'étudiant des nouvelles informations.

### Contenu

- ancienne date ;
- nouvelle date ;
- nouvelle heure.

---

# 10. Rendez-vous de suivi annulé

**Template**

```text
followup-cancelled.hbs
```

### Déclencheur

Annulation d'un FollowUpMeeting.

### Pourquoi ?

Informer l'étudiant.

### Contenu

- date ;
- heure ;
- motif.

---

# 11. Nouvelle procédure

**Template**

```text
procedure-created.hbs
```

### Déclencheur

Création d'une nouvelle procédure.

### Pourquoi ?

Informer l'étudiant que sa procédure est désormais ouverte.

### Contenu

- destination ;
- consultant ;
- num de dossier
- date de création.

---

# 12. Étape validée

**Template**

```text
procedure-step-completed.hbs
```

### Déclencheur

Validation d'une étape.

### Pourquoi ?

Informer l'étudiant de l'avancement de sa procédure.

### Contenu

- nom de l'étape ;
- date.
- num de dossier

---

# 13. Étape rejetée

**Template**

```text
procedure-step-rejected.hbs
```

### Déclencheur

Rejet d'une étape.

### Pourquoi ?

Informer l'étudiant qu'une action est nécessaire.

### Contenu

- nom de l'étape ;
- num de dossier
- motif.

---

# 14. Procédure terminée

**Template**

```text
procedure-completed.hbs
```

### Déclencheur

Statut de la procédure passé à **TERMINÉE**.

### Pourquoi ?

Informer l'étudiant de la fin de sa procédure.

### Contenu

- destination ;
- numéro de dossier
- date de clôture.

---

# 15. Procédure rejetée

**Template**

```text
procedure-rejected.hbs
```

### Déclencheur

Procédure rejetée.

### Pourquoi ?

Informer l'étudiant.

### Contenu

- motif ;
- date.

---

# 16. Procédure annulée

**Template**

```text
procedure-cancelled.hbs
```

### Déclencheur

Annulation d'une procédure par étudiant.

### Pourquoi ?

Informer l'étudiant.

### Contenu

- motif ;
- date.

---

# 17. Réponse au formulaire de contact

**Template**

```text
contact-replied.hbs
```

### Déclencheur

Réponse envoyée par un administrateur.

### Pourquoi ?

Notifier l'utilisateur qu'une réponse est disponible.

### Contenu

- rappel du sujet ;
- réponse.

---

# 18. Rappel de rendez-vous

**Template**

```text
appointment-reminder.hbs
```

### Déclencheur

24 heures avant le rendez-vous.

### Pourquoi ?

Limiter les absences.

### Contenu

- destination ;
- consultant ;
- date ;
- heure.

---

# 19. Rappel de rendez-vous de suivi

**Template**

```text
followup-reminder.hbs
```

### Déclencheur

24 heures avant un FollowUpMeeting.

### Pourquoi ?

Rappeler le rendez-vous de suivi.

### Contenu

- procédure ;
- date ;
- heure.

---

# 20. Compte verrouillé

**Template**

```text
account-locked.hbs
```

### Déclencheur

Le compte est temporairement verrouillé après plusieurs tentatives de connexion échouées.

### Pourquoi ?

Informer l'utilisateur et renforcer la sécurité.

### Contenu

- raison du verrouillage ;
- durée du verrouillage.

---

# 21. Nouveau consultant créé

**Template**

```text
consultant-account-created.hbs
```

### Déclencheur

Création d'un compte consultant.

### Pourquoi ?

Informer le consultant que son compte est disponible.

### Contenu

- prénom ;
- email ;
- rôle ;
- bouton vers :

```text
{{FRONTEND_URL}}/consultant
```

---

# Règles générales

- Tous les emails sont envoyés automatiquement par le backend.
- Les emails sont envoyés uniquement après validation complète de la transaction métier.
- Aucun email n'est envoyé si la transaction est annulée (rollback).
- Les emails ne contiennent jamais de mot de passe, de jeton JWT, de Refresh Token ni d'informations sensibles.
- Les liens présents dans les emails sont limités à :
  - `{{FRONTEND_URL}}` ;
  - `{{RESET_PASSWORD_URL}}` (uniquement pour l'email **Mot de passe oublié**).
- Les modèles Handlebars (`.hbs`) doivent être réutilisables, responsives et compatibles avec les principaux clients de messagerie aussi respecter tous le même thème et l'encodage des caractère.
````


Au vu de mon architecture (NestJS, Prisma, Redis, WebSockets et des règles de ton README), BullMQ est un très bon choix, mais il doit rester un outil pour les traitements asynchrones. Toute la logique métier critique (création de rendez-vous, réservation de créneau, changement de statut, etc.) doit continuer à s'exécuter dans des transactions Prisma, tandis que les effets secondaires (emails, rappels, nettoyage) sont délégués aux queues. C'est une séparation des responsabilités robuste et évolutive.


## Retrait
bcrypt n'est plus utilisé — AuthService utilise argon2 (argon2id), plus robuste
contre les attaques GPU. Si bcrypt est déjà présent ailleurs dans le projet,
il peut être retiré des dépendances liées à l'authentification.


contrainte métier à appliquer absoluement après migration de zero

ALTER TABLE "ConsultantBooking"
ADD CONSTRAINT "booking_xor_target"
CHECK (
  ("rendezVousId" IS NOT NULL AND "followUpMeetingId" IS NULL) OR
  ("rendezVousId" IS NULL AND "followUpMeetingId" IS NOT NULL)
);