// src/providers/(websockets)/student-websocket-provider.tsx
'use client';

import { useRendezVousRealtime } from '@/src/hooks/use-rendez-vous';
import { useFollowUpMeetingRealtime } from '@/src/hooks/use-follow-up-meeting';
import { useProcedureRealtime } from '@/src/hooks/use-procedure';
import { useNotificationsRealtime } from '@/src/hooks/use-notifications';
import { ReactNode } from 'react';

export function StudentWebSocketProvider({ children }: { children: ReactNode }) {
  // Rendez-vous étudiant
  useRendezVousRealtime();
  
  // Follow-up meetings étudiant
  useFollowUpMeetingRealtime();
  
  // Procédures étudiant
  useProcedureRealtime();

  // Notifications étudiant
  useNotificationsRealtime();

  return <>{children}</>;
}