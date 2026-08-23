import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { LoggerService } from '../logger/logger.service';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext(PrismaExceptionFilter.name);
  }

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Erreur base de données';

    switch (exception.code) {
      case 'P2002':
        status = HttpStatus.CONFLICT;
        const target = exception.meta?.target as string[];
        message = `Un enregistrement avec ce ${target?.join(', ')} existe déjà`;
        break;
      case 'P2003':
        status = HttpStatus.BAD_REQUEST;
        message = 'Violation de contrainte de clé étrangère';
        break;
      case 'P2025':
        status = HttpStatus.NOT_FOUND;
        message = 'Enregistrement non trouvé';
        break;
      case 'P2014':
        status = HttpStatus.BAD_REQUEST;
        message = 'Violation de contrainte de relation';
        break;
      default:
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        message = `Erreur base de données: ${exception.code}`;
    }

    const errorResponse = {
      statusCode: status,
      message: message,
      code: exception.code,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
    };

    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${exception.code} - ${message}`,
    );

    response.status(status).json(errorResponse);
  }
}
