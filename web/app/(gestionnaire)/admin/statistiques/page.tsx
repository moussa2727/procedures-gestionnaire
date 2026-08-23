// app/(gestionnaire)/admin/statistiques/page.tsx
'use client';

import React, { useMemo, useCallback } from 'react';
import { RefreshCw, LayoutDashboard, Calendar, Users, FileText, Mail, Shield } from 'lucide-react';
import { LoadingState } from '@/src/components/common';
import {
  AdminDashboardStats,
  AdminDashboardAlerts,
  AdminQuickActions,
  AdminRecentActivity,
  getDefaultAlerts,
  type DashboardStats,
  type ActivityItem,
} from '@/src/components/admin/dashboard';
import { useUserStatistics, useUsersRealtime } from '@/src/hooks/use-users';
import { useContactStatistics, useContactsRealtime } from '@/src/hooks/use-contacts';
import { useAllRendezVousAdmin, useRendezVousRealtime } from '@/src/hooks/use-rendez-vous';
import { useAllProceduresAdmin, useProcedureRealtime } from '@/src/hooks/use-procedure';
import { useDestinations, useDestinationsRealtime } from '@/src/hooks/use-destinations';
import { useMyNotifications, useNotificationsRealtime } from '@/src/hooks/use-notifications';
import { RendezvousStatus, ProcedureStatus, ContactStatus } from '@/src/types/enums';

export default function AdminDashboardStatistiquesPage() {
  // 1. Activer les WebSockets pour synchronisation temps réel
  useUsersRealtime();
  useContactsRealtime();
  useRendezVousRealtime();
  useProcedureRealtime();
  useDestinationsRealtime();
  useNotificationsRealtime();

  // 2. Récupérer toutes les données administratives
  const { data: userStats, isLoading: isLoadingUsers, refetch: refetchUsers } = useUserStatistics();
  const { data: contactStats, isLoading: isLoadingContacts, refetch: refetchContacts } = useContactStatistics();
  const { data: rendezVousData, isLoading: isLoadingRendezVous, refetch: refetchRendezVous } = useAllRendezVousAdmin();
  const { data: proceduresData, isLoading: isLoadingProcedures, refetch: refetchProcedures } = useAllProceduresAdmin();
  const { data: destinationsData, isLoading: isLoadingDestinations, refetch: refetchDestinations } = useDestinations();
  const { data: notificationsData, isLoading: isLoadingNotifications, refetch: refetchNotifications } = useMyNotifications(1, 20);

  const handleRefreshAll = useCallback(() => {
    refetchUsers();
    refetchContacts();
    refetchRendezVous();
    refetchProcedures();
    refetchDestinations();
    refetchNotifications();
  }, [
    refetchUsers,
    refetchContacts,
    refetchRendezVous,
    refetchProcedures,
    refetchDestinations,
    refetchNotifications,
  ]);

  // 3. Normalisation et calcul de l'ensemble des métriques sans exception
  const stats: DashboardStats = useMemo(() => {
    // Rendez-vous
    const rvList = Array.isArray(rendezVousData) ? rendezVousData : (rendezVousData as any)?.data || [];
    const todayStr = new Date().toISOString().split('T')[0];
    const rvToday = rvList.filter((r: any) => r.date === todayStr).length;
    const rvPending = rvList.filter((r: any) => r.status === RendezvousStatus.PENDING).length;
    const rvConfirmed = rvList.filter((r: any) => r.status === RendezvousStatus.CONFIRMED).length;
    const rvCompleted = rvList.filter((r: any) => r.status === RendezvousStatus.COMPLETED).length;
    const rvCancelled = rvList.filter((r: any) => r.status === RendezvousStatus.CANCELLED).length;

    // Procédures
    const procList = Array.isArray(proceduresData) ? proceduresData : (proceduresData as any)?.data || [];
    const procInProgress = procList.filter((p: any) => p.status === ProcedureStatus.IN_PROGRESS).length;
    const procCompleted = procList.filter((p: any) => p.status === ProcedureStatus.COMPLETED).length;
    const procRejected = procList.filter((p: any) => p.status === ProcedureStatus.REJECTED).length;
    const procCancelled = procList.filter((p: any) => p.status === ProcedureStatus.CANCELLED).length;

    // Destinations
    const destList = Array.isArray(destinationsData) ? destinationsData : (destinationsData as any)?.data || [];
    const destActive = destList.filter((d: any) => !d.isDeleted).length;
    const destArchived = destList.filter((d: any) => d.isDeleted).length;

    // Contacts
    const totalContacts = contactStats?.total || 0;
    const unreadContacts = contactStats?.pending || contactStats?.unread || 0;
    const repliedContacts = contactStats?.replied || 0;
    const archivedContacts = contactStats?.archived || 0;

    return {
      rendezvous: {
        total: rvList.length,
        today: rvToday,
        pending: rvPending,
        confirmed: rvConfirmed,
        completed: rvCompleted,
        cancelled: rvCancelled,
      },
      procedures: {
        total: procList.length,
        inProgress: procInProgress,
        completed: procCompleted,
        rejected: procRejected,
        cancelled: procCancelled,
      },
      users: {
        total: userStats?.total || 0,
        consultants: userStats?.byRole?.CONSULTANT || 0,
        students: userStats?.byRole?.ETUDIANT || 0,
        admins: userStats?.byRole?.ADMIN || 0,
        active: userStats?.active || 0,
        newThisMonth: 0,
      },
      contacts: {
        total: totalContacts,
        unread: unreadContacts,
        replied: repliedContacts,
        pending: unreadContacts,
      },
      destinations: {
        total: destList.length,
        active: destActive,
        archived: destArchived,
        withConsultants: destActive,
      },
      followups: {
        total: 0,
        pending: 0,
        confirmed: 0,
        completed: 0,
        cancelled: 0,
      },
    };
  }, [rendezVousData, proceduresData, destinationsData, userStats, contactStats]);

  // 4. Alertes dynamiques pour l'administrateur
  const alerts = useMemo(() => {
    return getDefaultAlerts({
      contactsUnread: stats.contacts.unread,
      rendezvousToday: stats.rendezvous.today,
      rendezvousPending: stats.rendezvous.pending,
      proceduresInProgress: stats.procedures.inProgress,
    });
  }, [stats]);

  // 5. Activité récente basée sur les notifications administratives et flux
  const activities: ActivityItem[] = useMemo(() => {
    const rawNotifs = notificationsData
      ? Array.isArray(notificationsData)
        ? notificationsData
        : (notificationsData as any).items || []
      : [];

    return rawNotifs.slice(0, 8).map((notif: any) => {
      let type: ActivityItem['type'] = 'rendezvous';
      let action: ActivityItem['action'] = 'created';
      let link: string | undefined = undefined;

      if (notif.type.includes('RENDEZVOUS')) {
        type = 'rendezvous';
        action = notif.type.includes('CANCELLED') ? 'cancelled' : notif.type.includes('RESCHEDULED') ? 'updated' : 'created';
        link = notif.entityId ? `/admin/rendez-vous/${notif.entityId}` : '/admin/rendez-vous';
      } else if (notif.type.includes('PROCEDURE')) {
        type = 'procedure';
        action = notif.type.includes('COMPLETED') ? 'completed' : notif.type.includes('REJECTED') ? 'cancelled' : 'created';
        link = notif.entityId ? `/admin/procedures/${notif.entityId}` : '/admin/procedures';
      } else if (notif.type.includes('CONTACT')) {
        type = 'contact';
        action = notif.type.includes('REPLIED') ? 'replied' : 'created';
        link = notif.entityId ? `/admin/contacts/${notif.entityId}` : '/admin/contacts';
      } else if (notif.type.includes('DESTINATION')) {
        type = 'destination';
        action = 'created';
        link = notif.entityId ? `/admin/destinations/${notif.entityId}` : '/admin/destinations';
      } else if (notif.type.includes('ACCOUNT') || notif.type.includes('USER')) {
        type = 'user';
        action = 'registered';
        link = notif.entityId ? `/admin/utilisateurs/${notif.entityId}` : '/admin/utilisateurs';
      }

      return {
        id: notif.id,
        type,
        action,
        title: notif.title,
        description: notif.message,
        timestamp: notif.createdAt,
        link,
      };
    });
  }, [notificationsData]);

  const isLoading =
    isLoadingUsers ||
    isLoadingContacts ||
    isLoadingRendezVous ||
    isLoadingProcedures ||
    isLoadingDestinations;

  if (isLoading) {
    return <LoadingState message="Chargement du tableau de bord..." />;
  }

  return (
    <div className="space-y-6">
      {/* En-tête du Dashboard */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-700">Administration centrale</p>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2.5">
            <LayoutDashboard className="w-7 h-7 text-sky-600" />
            Tableau de bord
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Vue d'ensemble complète et pilotage en temps réel des indicateurs clés de la plateforme.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefreshAll}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white border border-slate-300 hover:border-sky-400 text-slate-700 text-xs font-semibold rounded-xl transition-all shadow-xs hover:bg-slate-50 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Actualiser</span>
          </button>
        </div>
      </div>

      {/* Alertes prioritaires */}
      {alerts.length > 0 && (
        <section aria-label="Alertes prioritaires">
          <AdminDashboardAlerts alerts={alerts} />
        </section>
      )}

      {/* Métriques et KPI globaux */}
      <section aria-label="Statistiques clés">
        <AdminDashboardStats stats={stats} />
      </section>

      {/* Grille Actions Rapides & Activité Récente */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section aria-label="Actions rapides">
          <AdminQuickActions />
        </section>

        <section aria-label="Activité récente">
          <AdminRecentActivity
            activities={activities}
            isLoading={isLoadingNotifications}
          />
        </section>
      </div>
    </div>
  );
}

