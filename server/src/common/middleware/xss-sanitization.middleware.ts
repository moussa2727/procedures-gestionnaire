import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

// Blacklist of dangerous token patterns. Each entry is compiled fresh on every
// scan (no global flag) to avoid the classic `RegExp.prototype.test` stateful
// `lastIndex` bug that let one request out of two slip through.
const XSS_PATTERNS: RegExp[] = [
  /<script\b/gi,
  /<\/script\b/gi,
  /javascript:/gi,
  /vbscript:/gi,
  /data:/gi,
  /on\w+\s*=/gi,
  /<iframe\b/gi,
  /<object\b/gi,
  /<embed\b/gi,
  /<link\b/gi,
  /<style\b/gi,
  /<meta\b/gi,
  /<base\b/gi,
  /<svg\b/gi,
  /<math\b/gi,
  /<form\b/gi,
  /<img\b/gi,
  /<body\b/gi,
  /<html\b/gi,
  /<head\b/gi,
  /<title\b/gi,
  /expression\s*\(/gi,
  /@import/gi,
  /behavior\s*:/gi,
  /binding\s*:/gi,
  /-moz-binding/gi,
];

@Injectable()
export class XssSanitizationMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      this.sanitizeObject(req.body);
    }

    next();
  }

  private sanitizeObject(obj: unknown): void {
    if (!obj || typeof obj !== 'object') {
      return;
    }

    if (Array.isArray(obj)) {
      obj.forEach((item) => this.sanitizeObject(item));
      return;
    }

    for (const key in obj as Record<string, unknown>) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = (obj as Record<string, unknown>)[key];

        if (typeof value === 'string') {
          if (XSS_PATTERNS.some((pattern) => pattern.test(value))) {
            throw new BadRequestException('Contenu suspect détecté');
          }
        } else if (typeof value === 'object' && value !== null) {
          this.sanitizeObject(value);
        }
      }
    }
  }
}
