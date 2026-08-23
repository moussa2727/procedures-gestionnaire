import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
    title: 'Mon rendez-vous - Paname Consulting',
    description: 'Consultez et gerez votre rendez-vous.',
    robots: { index: false, follow: false },
    icons:{
        icon: '/favicon.ico',
    }
};

export default function RendezVousDetailLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}