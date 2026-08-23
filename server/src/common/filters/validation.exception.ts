import { BadRequestException } from '@nestjs/common';

// Thin wrapper so DTO-level transform guards can throw a 400 with the same
// `{ statusCode, message, errors }` shape the rest of the API uses.
export class ValidationException extends BadRequestException {
  constructor(public readonly errors?: string | string[]) {
    super(
      typeof errors === 'string'
        ? { statusCode: 400, message: errors, errors: [errors] }
        : { statusCode: 400, message: 'Données invalides', errors: errors ?? [] },
    );
  }
}
