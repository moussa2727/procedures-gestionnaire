import { Metadata } from 'next';

const SITE_NAME = 'Paname Consulting';
const SITE_URL = 'https://panameconsulting.com';
const DEFAULT_DESCRIPTION = 'Votre partenaire pour des études internationales réussies. Orientation, admission, visas et accompagnement personnalisé vers les meilleures universités en Europe, Russie, Chine et ailleurs.';

const SEO_KEYWORDS = [
  'études à l\'étranger',
  'études internationales',
  'orientation scolaire',
  'conseil en orientation',
  'admission université',
  'visa étudiant',
  'mobilité académique',
  'accompagnement étudiant',
  'études en France',
  'études en Russie',
  'études en Chine',
  'études en Espagne',
  'études au Maroc',
  'études en Algérie',
  'voyage en Europe',
  'voyage touristique',
  'study in France',
  'french studies',
  'russian studies',
  'chinese studies',
  'travel in Europe',
  'travel in French',
  'visa student application',
  'academic orientation',
  'student visa',
  'study abroad',
  'university admission',
  'international education',
  'Paname Consulting',
  'Paname',
];

const OG_IMAGE = '/favicon.ico';

export interface PageMetadataOptions {
  title: string;
  description?: string;
  path?: string;
  image?: string;
  noIndex?: boolean;
  noFollow?: boolean;
  keywords?: string[];
}

export function generateMetadata({
  title,
  description = DEFAULT_DESCRIPTION,
  path = '',
  image = OG_IMAGE,
  noIndex = false,
  noFollow = false,
  keywords = [],
}: PageMetadataOptions): Metadata {
  const fullTitle = title === SITE_NAME ? title : `${title} `;
  const url = path ? `${SITE_URL}${path}` : SITE_URL;
  const allKeywords = [...new Set([...SEO_KEYWORDS, ...keywords])];

  const metadata: Metadata = {
    title: fullTitle,
    description,
    keywords: allKeywords,
    robots: {
      index: !noIndex,
      follow: !noFollow,
    },
    icons: {
      icon: '/favicon.ico',
    },
    openGraph: {
      type: 'website',
      locale: 'fr_FR',
      url,
      siteName: SITE_NAME,
      title: fullTitle,
      description,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [image],
    },
  };

  return metadata;
}

export function getAdminMetadata(pageTitle: string, pageDescription?: string): Metadata {
  return generateMetadata({
    title: `Administration - ${pageTitle}`,
    description: pageDescription || `Administration et gestion de la plateforme ${SITE_NAME}.`,
    path: '/admin',
    noIndex: true,
    noFollow: true,
    keywords: ['admin', 'gestion', 'plateforme'],
  });
}

export function getAdminPageMetadata(
  pageTitle: string,
  pageDescription: string,
  path: string,
  extraKeywords: string[] = []
): Metadata {
  return generateMetadata({
    title: `Administration - ${pageTitle}`,
    description: pageDescription,
    path,
    noIndex: true,
    noFollow: true,
    keywords: ['admin', 'gestion', ...extraKeywords],
  });
}

export function getConsultantMetadata(pageTitle: string, pageDescription?: string): Metadata {
  return generateMetadata({
    title: `Espace consultant - ${pageTitle}`,
    description: pageDescription || `Espace consultant ${SITE_NAME}. Suivez vos rendez-vous, avis et procédures d'orientation.`,
    path: '/consultant',
    noIndex: true,
    noFollow: true,
    keywords: ['consultant', 'orientation', 'études'],
  });
}

export function getConsultantPageMetadata(
  pageTitle: string,
  pageDescription: string,
  path: string,
  extraKeywords: string[] = []
): Metadata {
  return generateMetadata({
    title: `Espace consultant - ${pageTitle}`,
    description: pageDescription,
    path,
    noIndex: true,
    noFollow: true,
    keywords: ['consultant', 'orientation', ...extraKeywords],
  });
}

export function getStudentMetadata(pageTitle: string, pageDescription?: string): Metadata {
  return generateMetadata({
    title: `Espace étudiant - ${pageTitle}`,
    description: pageDescription || `Espace étudiant ${SITE_NAME}. Gérez vos rendez-vous, procédures et consultations pour vos études à l'étranger.`,
    path: '/etudiant',
    noIndex: true,
    noFollow: true,
    keywords: ['étudiant', 'rendez-vous', 'procédure', 'consultation'],
  });
}

export function getStudentPageMetadata(
  pageTitle: string,
  pageDescription: string,
  path: string,
  extraKeywords: string[] = []
): Metadata {
  return generateMetadata({
    title: `Espace étudiant - ${pageTitle}`,
    description: pageDescription,
    path,
    noIndex: true,
    noFollow: true,
    keywords: ['étudiant', 'rendez-vous', 'procédure', ...extraKeywords],
  });
}

export function getPublicMetadata(pageTitle: string, pageDescription?: string, path = ''): Metadata {
  return generateMetadata({
    title: pageTitle,
    description: pageDescription || DEFAULT_DESCRIPTION,
    path: path || '/',
    noIndex: false,
  });
}
