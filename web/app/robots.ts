import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/consultant', '/etudiant', '/login', '/register', '/forgot-password', '/reset-password'],
    },
  };
}