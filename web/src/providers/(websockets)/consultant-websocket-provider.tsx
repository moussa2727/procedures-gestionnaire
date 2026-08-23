// src/providers/(websockets)/consultant-websocket-provider.tsx
'use client';

import { useRendezVousRealtime } from '@/src/hooks/use-rendez-vous';
import { useFollowUpMeetingRealtime } from '@/src/hooks/use-follow-up-meeting';
import { useProcedureRealtime } from '@/src/hooks/use-procedure';
import { useConsultantUnavailabilityRealtime } from '@/src/hooks/use-consultant-unavailability';
import { useNotificationsRealtime } from '@/src/hooks/use-notifications';
import { ReactNode } from 'react';

export function ConsultantWebSocketProvider({ children }: { children: ReactNode }) {
  // Rendez-vous consultant
  useRendezVousRealtime();
  
  // Follow-up meetings consultant
  useFollowUpMeetingRealtime();
  
  // Procédures consultant
  useProcedureRealtime();
  
  // Absences consultant
  useConsultantUnavailabilityRealtime();

  // Notifications consultant
  useNotificationsRealtime();

  return <>{children}</>;
}