// app/(gestionnaire)/admin/agenda/page.tsx
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { AdminAgendaView } from '@/src/components/admin/agenda';
import type { RendezVousResponse } from '@/src/types/rendez-vous';

export default function AdminAgendaPage() {
  const router = useRouter();

  const handleViewAppointment = (appointment: RendezVousResponse) => {
    router.push(`/admin/rendez-vous/${appointment.id}`);
  };

  return (
    <div className="space-y-6">
      <AdminAgendaView
        onViewAppointment={handleViewAppointment}
      />
    </div>
  );
}

