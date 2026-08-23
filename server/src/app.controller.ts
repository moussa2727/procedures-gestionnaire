// src/app.controller.ts
import { Controller, Get, Req, Res } from '@nestjs/common';
import type { Response } from 'express';
import { generateCsrfToken } from '@/common/middleware/csrf.middleware';

@Controller()
export class AppController {
  @Get()
  getRoot() {
    return { status: 'ok', service: 'Paname Consulting API' };
  }

  @Get('health')
  getHealth() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('csrf-token')
  getCsrfToken(@Res() res: Response) {
    const token = generateCsrfToken();
    res.cookie('csrf_token', token, {
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 3600000,
    });
    return { csrfToken: token };
  }
}