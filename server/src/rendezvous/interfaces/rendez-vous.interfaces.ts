export interface RendezVousDeviceContext {
  ipAddress?: string;
  userAgent?: string;
}

// Délai minimal avant lequel une annulation est autorisée. Le README exige
// "le respect des délais d'annulation" sans en fixer la valeur numérique —
// ce paramètre est donc centralisé ici pour rester ajustable sans toucher
// à la logique métier.
export const CANCELLATION_MIN_HOURS_BEFORE = 2;
