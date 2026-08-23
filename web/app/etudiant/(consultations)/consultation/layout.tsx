import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Detail de la consultation - Paname Consulting',
  description: 'Consultez le detail de votre consultation de suivi de procedure.',
  robots: { index: false, follow: false },
};

export default function ConsultationLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}