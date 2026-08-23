// app/sitemap.ts
import { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://panameconsulting.com';

// URLs statiques avec priorité et fréquence
const STATIC_PAGES = [
  { path: '', priority: 1.0, changefreq: 'daily' },           // Accueil
  { path: 'services', priority: 0.8, changefreq: 'weekly' },
  { path: 'contact', priority: 0.6, changefreq: 'monthly' },
];

// Interface pour les routes dynamiques (destinations, consultants)
interface DynamicRoute {
  path: string;
  lastModified?: string;
}

async function fetchDestinations(): Promise<DynamicRoute[]> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/destinations/all`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((dest: { id: string; updatedAt: string }) => ({
      path: `destinations/${dest.id}`,
      lastModified: dest.updatedAt,
    }));
  } catch {
    return [];
  }
}

async function fetchConsultantsPublic(): Promise<DynamicRoute[]> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/consultants`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((consultant: { id: string }) => ({
      path: `consultant/${consultant.id}/public`,
    }));
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [destinations, consultants] = await Promise.all([
    fetchDestinations(),
    fetchConsultantsPublic(),
  ]);

  const staticUrls: MetadataRoute.Sitemap = STATIC_PAGES.map(({ path, priority, changefreq }) => ({
    url: `${BASE_URL}/${path}`,
    lastModified: new Date(),
    changeFrequency: changefreq as MetadataRoute.Sitemap[number]['changeFrequency'],
    priority,
  }));

  const dynamicUrls: MetadataRoute.Sitemap = [
    ...destinations.map(({ path, lastModified }) => ({
      url: `${BASE_URL}/${path}`,
      lastModified: lastModified ? new Date(lastModified) : new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.7,
    })),
    ...consultants.map(({ path }) => ({
      url: `${BASE_URL}/${path}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    })),
  ];

  return [...staticUrls, ...dynamicUrls];
}