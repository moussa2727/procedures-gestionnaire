import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Notifications - Paname Consulting',
  description: 'Consultez et gerez vos notifications.',
  robots: { index: false, follow: false },
  icons:{
    icon:'/favicon.ico'
  }
};

export default function NotificationsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
