

import { Hero, AboutUs, Valeurs, Partners } from '@/src/components/main/accueil';
import { CtaSection } from '@/src/components/main/shared';
import { getPublicMetadata } from '@/src/lib/metadata';

export const metadata = getPublicMetadata(
  'Accueil - Paname Consulting',
  'Découvrez Paname Consulting, votre partenaire pour des études internationales réussies. Voyage en Europe, études en France, Russie, Chine. Orientation, admission, visas. Plus de 120 étudiants accompagnés.',
  '/'
);

export default function HomePage() {
  return (
    <>
      <Hero />
      <AboutUs />
      <Valeurs />
      <Partners />
      <CtaSection />
    </>
  );
}