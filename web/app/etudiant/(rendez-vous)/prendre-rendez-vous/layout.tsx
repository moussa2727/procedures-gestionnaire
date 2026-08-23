import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Prendre un rendez-vous - Paname Consulting',
  description: 'Reservez votre entretien d\'orientation avec un consultant expert en mobilite internationale.',
  robots: { index: false, follow: false },
  icons:{
    icon: '/favicon.ico',
  }
};

export default function PrendreRendezVousLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}