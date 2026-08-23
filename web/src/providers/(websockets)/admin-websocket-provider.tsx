// src/providers/(websockets)/admin-websocket-provider.tsx
'use client';

import { useRendezVousRealtime } from '@/src/hooks/use-rendez-vous';
import { useFollowUpMeetingRealtime } from '@/src/hooks/use-follow-up-meeting';
import { useProcedureRealtime } from '@/src/hooks/use-procedure';
import { useContactsRealtime } from '@/src/hooks/use-contacts';
import { useConsultantUnavailabilityRealtime } from '@/src/hooks/use-consultant-unavailability';
import { useUsersRealtime } from '@/src/hooks/use-users';
import { useNotificationsRealtime } from '@/src/hooks/use-notifications';
import { ReactNode } from 'react';

export function AdminWebSocketProvider({ children }: { children: ReactNode }) {
  // Rendez-vous (tous)
  useRendezVousRealtime();
  
  // Follow-up meetings (tous)
  useFollowUpMeetingRealtime();
  
  // Procédures (toutes)
  useProcedureRealtime();
  
  // Contacts (admin)
  useContactsRealtime();
  
  // Absences consultants
  useConsultantUnavailabilityRealtime();
  
  // Utilisateurs (en ligne)
  useUsersRealtime();

  // Notifications admin
  useNotificationsRealtime();

  return <>{children}</>;
}