import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Mes procedures - Paname Consulting',
  description: 'Suivez l\'avancement de vos procedures d\'orientation et de mobilite internationale.',
  robots: { index: false, follow: false },
  icons:{
    icon: '/favicon.ico',
  }
};

export default function ProceduresLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}