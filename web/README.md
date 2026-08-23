# Plan d'implémentation - Optimisation Frontend (Auth & Espace Admin)

## Objectifs du projet
1. **Design Frontend (Auth)** : Sublimer les pages d'authentification (`/login`, `/register`, `/forgot-password`, `/reset-password`, `/callback`) selon les compétences `SKILLS/frontend-design` et `SKILLS/next-best-practices`. Réduire considérablement la hauteur (H) du formulaire global d'inscription (`/register`) grâce à une disposition compacte et ergonomique (2 colonnes / grilles condensées, intégration visuelle de l'indicateur de mot de passe, réduction des marges superflues).
2. **Routage Admin & Dashboard** : La route `/admin` doit rediriger directement vers `/admin/statistiques`. `/admin/statistiques` devient le véritable **Tableau de Bord Admin complet** intégrant sans exception toutes les métriques et sous-composants pertinents (`AdminDashboardStats`, `AdminDashboardAlerts`, `AdminQuickActions`, `AdminRecentActivity`, etc.).
3. **Notifications Administrateur** : La page `/admin/notifications` doit exploiter les composants dédiés (`AdminNotificationList`, `AdminNotificationFilters`, `AdminNotificationCard`) et cibler exclusivement les notifications système & administrateur (alertes système, messages contacts, sécurité, modération avis, suivi des dossiers, absences consultants, etc.).
4. **Exploitation optimale des sous-composants, hooks, types et schémas** : Remplacer tous les placeholders ou implémentations partielles sur les pages d'administration (`/admin/agenda`, `/admin/follow-up`, `/admin/contacts`, `/admin/destinations`, `/admin/utilisateurs`, `/admin/procedures`, `/admin/rendez-vous`, `/admin/notifications`, `/admin/statistiques`) par leurs composants et hooks riches déjà développés.
5. **Cohérence globale de design** : Harmoniser les styles (couleurs Slate/Sky/Emerald, badges de statuts unifiés, typographie raffinée, micro-animations Motion, gestion des états vides/chargement/erreur).

---

## 1. Composants et Pages d'Authentification `(auth)/*`

### Modifications de style et UX :
- **`AuthCard.tsx`** : Design moderne avec fond blanc translucide / micro-bordure Slate-200, ombre subtile, support responsive fluide.
- **`AuthInput.tsx` / `PasswordInput.tsx`** : Hauteur compacte (py-2 / h-10), transitions soignées sur le focus avec ring discret Sky-500, typographie nette.
- **`PasswordStrength.tsx`** : Barre ultra-fine et discrète avec label compact pour minimiser l'encombrement vertical.
- **`RegisterPage` (`app/(auth)/register/page.tsx`)** :
  - Restructuration en grille 2 colonnes sur desktop / tablettes (ex: Prénom + Nom, Email + Téléphone, Mot de passe + Confirmation avec jauge intégrée).
  - Réduction des paddings et espacements verticaux (`space-y-3` au lieu de `space-y-4` ou `space-y-6`), boutons et réseaux sociaux compacts.
  - La hauteur totale du formulaire tient facilement dans le viewport sans forcer un défilement excessif.
- **`LoginPage` (`app/(auth)/login/page.tsx`)** : Design épuré, centrage harmonieux, micro-interactions.
- **`ForgotPasswordPage` & `ResetPasswordPage` & `CallbackPage`** : Cohérence visuelle parfaite avec boutons de retour intégrés, alertes et feedback visuel instantané.

---

## 2. Espace Admin & Routage `/admin` -> `/admin/statistiques`

- **`app/(gestionnaire)/admin/page.tsx`** :
  - Redirection serveur immédiate `redirect('/admin/statistiques')` (évite une page d'accueil intermédiaire inutile et non souhaitée).
- **`app/(gestionnaire)/admin/layout.tsx`** :
  - Mise à jour de la barre de navigation : le lien principal "Tableau de bord" pointe vers `/admin/statistiques` (avec surbrillance active via Next.js `usePathname` ou navigation dynamique).
  - Utilisation de `Link` Next.js pour éviter les rechargements complets de page.
  - En-tête administrateur harmonieux avec `AdminNotificationDropdown` et profil.

---

## 3. Dashboard Admin Complet : `app/(gestionnaire)/admin/statistiques/page.tsx`

La page de statistiques devient le véritable centre de contrôle de l'administrateur :
- **Métriques complètes** via `AdminDashboardStats` :
  - Rendez-vous (Total, Aujourd'hui, Confirmés, En attente, Réalisés, Annulés)
  - Procédures (Total, En cours, Terminées, Rejetées, Annulées)
  - Utilisateurs (Total, Consultants, Étudiants, Admins, Actifs, Inactifs)
  - Messages & Contacts (Total, Non lus, Répondus, En attente, Archivés)
  - Destinations (Total, Actives, Archivées, Avec consultants assignés)
  - Suivis & Réunions (Total, En attente, Confirmés, Effectués, Annulés)
- **Alertes dynamiques** via `AdminDashboardAlerts` (messages non lus, rendez-vous du jour, procédures à traiter).
- **Actions rapides** via `AdminQuickActions` (nouveau RDV, nouvel utilisateur, nouvelle destination, voir agenda, etc.).
- **Activité récente** via `AdminRecentActivity` (timeline interactive des derniers événements système).

---

## 4. Page des Notifications Admin : `app/(gestionnaire)/admin/notifications/page.tsx`

- Implémentation complète via `AdminNotificationList`, `AdminNotificationFilters`, `AdminNotificationCard`.
- Filtrage exclusif des notifications de type **Système & Admin** :
  - `SYSTEM`, `ACCOUNT_PROMOTED`, `ACCOUNT_LOCKED`, `SESSION_REVOKED`
  - `CONTACT_NEW`, `CONTACT_REPLIED`
  - `DESTINATION_CREATED`, `DESTINATION_UPDATED`, `DESTINATION_SOFT_DELETED`, `DESTINATION_RESTORED`
  - `CONSULTANT_ABSENCE_DECLARED`, `REVIEW_RECEIVED`, `REVIEW_RESPONSE`
  - `RENDEZVOUS_CREATED`, `RENDEZVOUS_RESCHEDULED`, `RENDEZVOUS_CANCELLED`
  - `PROCEDURE_CREATED`, `PROCEDURE_STEP_COMPLETED`, `PROCEDURE_STEP_REJECTED`, `PROCEDURE_COMPLETED`, `PROCEDURE_REJECTED`
  - `FOLLOWUP_CREATED`, `FOLLOWUP_RESCHEDULED`, `FOLLOWUP_CANCELLED`, `FOLLOWUP_COMPLETED`
- Actions : Marquer comme lu individuellement, marquer tout comme lu, navigation directe vers l'entité concernée (RDV, procédure, utilisateur, contact).

---

## 5. Exploitation des sous-composants sur toutes les pages Admin

1. **Agenda (`/admin/agenda/page.tsx`)** :
   - Exploite `AdminAgendaView`, `AdminAgendaFilters`, `AdminAgendaSlot` avec gestion des créneaux, filtrage par consultant, date picker et actions.
2. **Suivi de réunions (`/admin/follow-up/page.tsx`)** :
   - Exploite `AdminFollowUpTable`, `useFollowUpMeeting` hooks, filtres et actions de replanification/annulation/complétion.
3. **Contacts (`/admin/contacts/page.tsx`)** :
   - Exploite `AdminContactList`, `AdminContactFilters`, `AdminContactStats`, `AdminContactCard`, `AdminContactReplyModal`.
4. **Destinations (`/admin/destinations/page.tsx`)** :
   - Exploite `AdminDestinationList`, `AdminDestinationFilters`, `AdminDestinationStats`, `CreateDestinationModal`, `UpdateDestinationModal`.
5. **Utilisateurs (`/admin/utilisateurs/page.tsx`)** :
   - Exploite `AdminUserList`, `AdminUserFilters`, `AdminUserStats`, `AdminUserCard`, `AdminUserCreateModal`, `AdminUserEditModal`.
6. **Procédures (`/admin/procedures/page.tsx`)** :
   - Exploite `AdminProcedureTable`, filtres avancés, visualiseur d'étapes et actions.
7. **Rendez-vous (`/admin/rendez-vous/page.tsx`)** :
   - Exploite `AdminRendezVousTable`, filtres avancés, modal de replanification/annulation et avis.
8. **Absences (`/admin/absences/page.tsx`)** :
   - Vérification et harmonisation des filtres et modales.
9. **Avis (`/admin/avis/page.tsx`)** :
   - Vérification et harmonisation de la modération.
10. **Sécurité (`/admin/securite/page.tsx`) & Mes sessions (`/admin/mes-sessions/page.tsx`) & Mon profil (`/admin/mon-profil/page.tsx`)** :
    - Cohérence visuelle et ergonomie maximale.

---

## Plan de Vérification

### Tests automatisés & Linting
- Exécution de `pnpm lint` ou build Next.js pour valider l'absence d'erreurs TypeScript et de syntaxe.

### Vérification Manuelle
- Vérification des formulaires d'authentification (hauteur compacte de `/register`, responsive sur mobile et desktop).
- Vérification de la redirection `/admin` -> `/admin/statistiques`.
- Vérification de la complétude du dashboard `/admin/statistiques`.
- Vérification des filtres et du flux de la page `/admin/notifications`.
- Vérification de l'interactivité et des sous-composants sur chacune des pages d'administration.
