// app/(main)/layout.tsx
import Footer from '@/src/components/main/shared/Footer';
import Header from '@/src/components/main/shared/Header';

import { getPublicMetadata } from '@/src/lib/metadata';

export const metadata = getPublicMetadata(
  'Paname Consulting - Le cap vers l\'excellence',
  'Votre partenaire pour des études internationales réussies. Voyage en Europe, études en France, Russie, Chine. Orientation, admission, visas et accompagnement personnalisé.',
  '/'
);

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="flex-1 pt-20 sm:pt-24" aria-label="Contenu principal">
        {children}
      </main>
      <Footer />
    </>
  );
}