// app/(main)/contact/page.tsx
import Faq from '@/src/components/main/contact/Faq';
import { ContactForm } from '@/src/components/main/shared/ContactForm';
import CtaSection from '@/src/components/main/shared/CtaSection';
import { Accessibility } from '@/src/components/main/contact/Accessibility';

import { getPublicMetadata } from '@/src/lib/metadata';

export const metadata = getPublicMetadata(
  'Contactez-nous - Paname Consulting',
  'Contactez Paname Consulting pour votre projet d\'études à l\'étranger. Téléphone, email, WhatsApp et formulaire de contact. Études en Europe, France, Russie, Chine.',
  '/contact'
);

export default function ContactPage() {
  return (
    <>
      <ContactForm />
      <Faq />
      <Accessibility />
      <CtaSection />
    </>
  );
}
