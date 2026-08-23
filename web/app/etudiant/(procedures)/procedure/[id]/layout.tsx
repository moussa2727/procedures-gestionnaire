import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Detail de la procedure - Paname Consulting',
  description: 'Consultez le detail de votre procedure d\'orientation et suivez l\'avancement de chaque etape.',
  robots: { index: false, follow: false },
    icons:{
        icon: '/favicon.ico',
    }
};

export default function ProcedureDetailLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}