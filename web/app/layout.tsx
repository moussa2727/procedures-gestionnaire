// app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/src/providers/(auth)/auth-provider';
import { WebSocketProvider } from '@/src/providers/(websockets)/websocket-provider';
import { QueryProvider } from '@/src/providers/query-provider';
import { ToastProvider } from '@/src/providers/toast-provider';

export const metadata: Metadata = {
  metadataBase: new URL('https://panameconsulting.com'),
  title: 'Paname Consulting',
  description: "Paname Consulting — Services d'accompagnement pour études à l'étranger, voyages d'affaires et demandes de visa et tourisme.",
  icons: {
    icon: '/favicon.ico',
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="flex min-h-screen flex-col antialiased">
        <QueryProvider>
          <AuthProvider>
            <WebSocketProvider>
              {children}
              <ToastProvider />
            </WebSocketProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}