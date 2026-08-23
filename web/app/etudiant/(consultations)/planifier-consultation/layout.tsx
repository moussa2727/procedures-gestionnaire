import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Planifier une consultation - Paname Consulting',
  description: 'Planifiez une consultation de suivi avec votre consultant pour faire avancer votre procedure.',
  robots: { index: false, follow: false },
};

export default function PlanifierConsultationLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
