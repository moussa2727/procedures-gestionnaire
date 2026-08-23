import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RedisService } from '@/redis/redis.service';
import {
  DEFAULT_ACQUIRE_RETRIES,
  DEFAULT_ACQUIRE_RETRY_DELAY_MS,
  DEFAULT_LOCK_TTL_MS,
  LOCK_KEY_PREFIX,
} from './locking.constants';

export interface AcquiredLock {
  key: string;
  token: string;
}

// Script Lua garantissant qu'un verrou n'est libéré que par son détenteur
// légitime — élimine la course où le processus A libèrerait un verrou déjà
// expiré et réacquis entre-temps par le processus B.
const RELEASE_LOCK_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
else
  return 0
end
`;

// Implémentation du verrou logique exigé par le README : "Le verrou
// logique constitue une contrainte métier. Il garantit qu'une même
// ressource ne puisse jamais être réservée simultanément [...] Il doit
// obligatoirement être utilisé avant toute opération de réservation."
//
// Utilise SET key value NX PX ttl — atomique par nature sur Redis, donc
// sûr même avec plusieurs instances de l'application (README, section
// Concurrence : "avec plusieurs instances de l'application ; avec
// plusieurs serveurs"). Pour un déploiement multi-noeuds Redis en
// cluster/sentinel avec tolérance de panne stricte, migrer vers Redlock ;
// une seule instance Redis (le cas courant ici) rend SET NX PX suffisant.
@Injectable()
export class LockingService {
  private readonly logger = new Logger(LockingService.name);

  constructor(private readonly redisService: RedisService) {}

  // Construit la clé de verrou correspondant à un créneau consultant
  // unique — la granularité du verrou doit correspondre exactement à la
  // granularité de la contrainte @@unique([consultantId, date, time]) sur
  // ConsultantBooking pour empêcher toute double réservation du même
  // triplet.
  buildSlotLockKey(consultantId: string, date: Date, time: string): string {
    const dateKey = date.toISOString().slice(0, 10);
    return `${LOCK_KEY_PREFIX}:${consultantId}:${dateKey}:${time}`;
  }

  async acquire(
    key: string,
    ttlMs: number = DEFAULT_LOCK_TTL_MS,
    retries: number = DEFAULT_ACQUIRE_RETRIES,
  ): Promise<AcquiredLock> {
    const token = randomUUID();
    const client = this.redisService.getClient();

    for (let attempt = 0; attempt <= retries; attempt++) {
      const result = await client.set(key, token, 'PX', ttlMs, 'NX');

      if (result === 'OK') {
        return { key, token };
      }

      if (attempt < retries) {
        await this.delay(DEFAULT_ACQUIRE_RETRY_DELAY_MS);
      }
    }

    this.logger.warn(
      `Echec d'acquisition du verrou logique après ${retries + 1} tentatives : ${key}`,
    );
    throw new ServiceUnavailableException(
      'Ce créneau est en cours de réservation par un autre utilisateur, veuillez réessayer',
    );
  }

  async release(lock: AcquiredLock): Promise<void> {
    const client = this.redisService.getClient();

    try {
      await client.eval(RELEASE_LOCK_SCRIPT, 1, lock.key, lock.token);
    } catch (error) {
      // La libération du verrou logique ne doit jamais faire échouer une
      // transaction déjà validée (README : "aucun verrou logique ne reste
      // acquis après la fin d'une transaction" est une garantie, mais une
      // erreur de libération après un commit réussi ne doit pas être
      // remontée comme un échec métier — le TTL nettoie in fine).
      this.logger.error(
        `Echec de libération du verrou logique ${lock.key} : ${(error as Error).message}`,
      );
    }
  }

  // Exécute une opération sous verrou logique, avec libération garantie
  // même en cas d'exception — implémente directement le cycle obligatoire
  // du README : acquisition du verrou avant toute opération, libération
  // immédiate en cas d'erreur, libération après commit en cas de succès.
  async withLock<T>(
    key: string,
    operation: () => Promise<T>,
    ttlMs: number = DEFAULT_LOCK_TTL_MS,
  ): Promise<T> {
    const lock = await this.acquire(key, ttlMs);

    try {
      return await operation();
    } finally {
      await this.release(lock);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
