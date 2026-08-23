// app/(main)/services/page.tsx
import ServicesGrid from '@/src/components/main/services/ServicesGrid';
import CtaSection from '@/src/components/main/shared/CtaSection';
import FrenchSchool from '@/src/components/main/services/FrenchSchool';
import Destinations from '@/src/components/main/services/Destinations';

import { getPublicMetadata } from '@/src/lib/metadata';

export const metadata = getPublicMetadata(
  'Nos Services - Paname Consulting',
  'Découvrez nos services d\'accompagnement : orientation, admission, visas, préparation aux entretiens et suivi post-admission. Études en Europe, France, Russie, Chine.',
  '/services'
);

export default function ServicesPage() {
  return (
    <>
      <ServicesGrid />
      <Destinations />
      <FrenchSchool />
      <CtaSection />
    </>
  );
}