export const LOCK_KEY_PREFIX = 'lock:booking';

// Durée de vie par défaut du verrou. Doit largement excéder la durée
// attendue d'une transaction de réservation (vérifications + écriture) tout
// en restant courte pour ne jamais bloquer durablement une ressource en cas
// de crash du process détenteur — le verrou expire alors de lui-même.
export const DEFAULT_LOCK_TTL_MS = 10_000;

// Nombre de tentatives d'acquisition avant abandon, avec un court délai
// entre chaque tentative pour absorber les contentions transitoires sans
// faire attendre l'appelant indéfiniment.
export const DEFAULT_ACQUIRE_RETRIES = 5;
export const DEFAULT_ACQUIRE_RETRY_DELAY_MS = 150;
