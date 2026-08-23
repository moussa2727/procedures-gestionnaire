// web/src/lib/csrf.ts
// Gestion du jeton CSRF (double-submit cookie) côté client.
// Le backend génère un cookie `csrf_token` (non httpOnly) exposé par
// GET /csrf-token ; nous devons renvoyer la même valeur dans l'en-tête
// `x-csrf-token` sur chaque requête mutation (POST/PUT/PATCH/DELETE).

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10000/api/v1';

let csrfToken: string | null = null;
let inflight: Promise<string> | null = null;

export async function getCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;
  if (inflight) return inflight;

  inflight = fetch(`${API_BASE_URL}/csrf-token`, {
    credentials: 'include',
    cache: 'no-store',
  })
    .then((res) => res.json())
    .then((data: { csrfToken: string }) => {
      csrfToken = data.csrfToken;
      return csrfToken;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

export function clearCsrfToken(): void {
  csrfToken = null;
}
