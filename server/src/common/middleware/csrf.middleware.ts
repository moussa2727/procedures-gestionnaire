import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

const CSRF_COOKIE = 'csrf_token';
const CSRF_HEADER = 'x-csrf-token';
const CSRF_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    if (!CSRF_METHODS.includes(req.method)) {
      return next();
    }

    const cookieToken = req.cookies?.[CSRF_COOKIE];
    const headerToken = req.headers[CSRF_HEADER];

    if (!cookieToken || !headerToken) {
      throw new BadRequestException('Token CSRF manquant');
    }

    // Constant-time comparison to avoid timing attacks.
    const a = Buffer.from(String(cookieToken));
    const b = Buffer.from(String(headerToken));

    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      throw new BadRequestException('Token CSRF invalide');
    }

    next();
  }
}

export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
