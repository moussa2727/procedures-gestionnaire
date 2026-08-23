import type { ReactNode } from 'react';

export const metadata = {
  title: 'Services - Paname Consulting',
  description: 'Nos services d\'accompagnement pour vos études à l\'étranger.',
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-6">
      {children}
    </div>
  );
}
