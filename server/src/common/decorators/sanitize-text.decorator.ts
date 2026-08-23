import { Transform } from 'class-transformer';
import { ValidationException } from '@/common/filters/validation.exception';

const DANGEROUS = [
  /<script\b/gi,
  /<iframe\b/gi,
  /<object\b/gi,
  /<embed\b/gi,
  /<svg\b/gi,
  /<style\b/gi,
  /<link\b/gi,
  /<meta\b/gi,
  /<base\b/gi,
  /<form\b/gi,
  /<img\b/gi,
  /<body\b/gi,
  /<html\b/gi,
  /javascript:/gi,
  /vbscript:/gi,
  /data:/gi,
  /on\w+\s*=/gi,
  /expression\s*\(/gi,
  /@import/gi,
];

// Strips the most dangerous HTML/markup tokens from user-supplied free text
// before persistence. The frontend renders this content via React (auto-escaped)
// which already neutralises stored XSS, but we sanitise at the edge as well so
// the data is safe no matter how it is later consumed.
export function SanitizeText() {
  return Transform(({ value }) => {
    if (typeof value !== 'string') {
      return value;
    }

    const cleaned = DANGEROUS.reduce(
      (acc, pattern) => acc.replace(pattern, ''),
      value,
    );

    if (cleaned !== value && DANGEROUS.some((p) => p.test(value))) {
      throw new ValidationException([
        'Le texte contient des balises ou attributs non autorisés',
      ]);
    }

    return cleaned.trim();
  });
}
