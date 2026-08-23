import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
    title: 'Mes rendez-vous - Paname Consulting',
    description: 'Consultez et gerez vos rendez-vous.',
    robots: { index: false, follow: false },
    icons:{
        icon: '/favicon.ico',
    }
};

export default function MesRendezVousLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}