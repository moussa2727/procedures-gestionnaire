import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Mon profil - Paname Consulting',
  description: 'Consultez et modifiez vos informations personnelles, et gerez vos sessions actives.',
  robots: { index: false, follow: false },
    icons:{
        icon: '/favicon.ico',
    }
};

export default function MonProfilLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
