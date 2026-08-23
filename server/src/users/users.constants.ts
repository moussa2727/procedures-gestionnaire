// users/users.constants.ts
export const USER_CACHE_TTL = 300;
export const USER_STATS_CACHE_TTL = 600;
export const USER_PROFILE_CACHE_TTL = 300;
export const CONSULTANT_AVAILABILITY_DAYS_AHEAD = 7;
export const MIN_RATING_REQUIRING_COMMENT = 2;

export const USER_CACHE_KEYS = {
  // ALL supprimé (inutilisé)
  STATS: 'users:stats',
  PROFILE: (id: string) => `user:profile:${id}`,
  PUBLIC_PROFILE: (id: string) => `user:public:${id}`,
  CONSULTANT_STATS: (id: string) => `consultant:stats:${id}`,
} as const;
