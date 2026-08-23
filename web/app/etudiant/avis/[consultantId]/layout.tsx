import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Donner un avis - Paname Consulting',
  description: 'Donnez votre avis sur un consultant apres votre entretien d\'orientation.',
  robots: { index: false, follow: false },
   icons:{
    icon:'/favicon.ico'
  }
};

export default function AvisConsultantLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
