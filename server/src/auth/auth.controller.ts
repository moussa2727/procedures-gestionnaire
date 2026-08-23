// auth/auth.controller.ts
import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from '@/common/guards/local-auth.guard';
import { RefreshGuard } from '@/common/guards/refresh.guard';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { Public } from '@/common/decorators/public.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { CurrentUser as ICurrentUser } from '@/common/interfaces/current-user.interface';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CookieOptionsFactory } from '@/config/auth.constants';
import { User } from '@prisma/client';
import { ThrottleGuard } from '@/common/guards/throttle.guard';
import { Throttle } from '@/common/decorators/throttle.decorator';
import { GoogleAuthGuard } from '@/common/guards/google-auth.guard';
import { GoogleProfile } from './strategies/google.strategy';
import { ConfigService } from '@nestjs/config';
import { RegisterDto, RegisterResponseDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cookieOptions: CookieOptionsFactory,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @UseGuards(ThrottleGuard)
  @Throttle({ limit: process.env.NODE_ENV === 'test' ? 10000 : 3, ttl: process.env.NODE_ENV === 'test' ? 1 : 3600 })
  @HttpCode(HttpStatus.CREATED)
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
  ): Promise<RegisterResponseDto> {
    const context = this.extractContext(req);
    const user = await this.authService.register(dto, context);

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone || undefined,
      role: user.role,
      createdAt: user.createdAt,
      isActive: user.isActive,
    };
  }

  @Public()
  @UseGuards(ThrottleGuard, LocalAuthGuard)
  @Throttle({ limit: process.env.NODE_ENV === 'test' ? 10000 : 5, ttl: process.env.NODE_ENV === 'test' ? 1 : 60 })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Req() req: Request & { user: User },
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const context = this.extractContext(req);
    const tokens = await this.authService.login(
      req.user,
      context,
      dto.rememberMe ?? false,
    );

    this.setAuthCookies(res, tokens);

    return {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
    };
  }

  @Public()
  @UseGuards(RefreshGuard)
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(
    @Req()
    req: Request & {
      user: { sub: string; sessionId: string; refreshTokenId: string };
    },
    @Res({ passthrough: true }) res: Response,
  ) {
    const context = this.extractContext(req);
    const tokens = await this.authService.refresh(
      req.user.sub,
      req.user.sessionId,
      req.user.refreshTokenId,
      context,
    );

    this.setAuthCookies(res, tokens);

    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(
    @CurrentUser() user: ICurrentUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const accessToken = req.cookies?.access_token;
    await this.authService.logout(user.id, user.sessionId, accessToken);

    this.clearAuthCookies(res);

    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('logout-all')
  async logoutAll(
    @CurrentUser() user: ICurrentUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logoutAllSessions(user.id);
    this.clearAuthCookies(res);
    return { success: true };
  }

  @Public()
  @UseGuards(ThrottleGuard)
  @Throttle({ limit: 3, ttl: 300 })
  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
    return {
      message:
        'Si un compte existe avec cet email, un lien de reinitialisation a ete envoye',
    };
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.newPassword);
    return { message: 'Mot de passe reinitialise avec succes' };
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('change-password')
  async changePassword(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
  ) {
    const accessToken = req.cookies?.access_token;
    await this.authService.changePassword(
      user.id,
      dto.currentPassword,
      dto.newPassword,
      user.sessionId,
      accessToken,
    );
    return { message: 'Mot de passe modifie avec succes' };
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('google/disconnect')
  async disconnectGoogle(
    @CurrentUser() user: ICurrentUser,
  ): Promise<{ success: boolean }> {
    await this.authService.disconnectGoogle(user.id);
    return { success: true };
  }

  @Public()
  @UseGuards(ThrottleGuard)
  @Throttle({ limit: 10, ttl: 60 })
  @UseGuards(GoogleAuthGuard)
  @Get('google')
  googleLogin(): void {
    // Redirection gérée par passport-google-oauth20, aucun corps de réponse.
  }

  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get('google/callback')
  async googleCallback(
    @Req() req: Request & { user: GoogleProfile },
    @Res() res: Response,
  ) {
    const context = this.extractContext(req);
    const tokens = await this.authService.loginWithGoogle(req.user, context);

    this.setAuthCookies(res, tokens);

    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const redirectUrl = frontendUrl || 'https://example.com';
    res.redirect(`${redirectUrl}/callback`);
  }

  private extractContext(req: Request) {
    return {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      deviceInfo: req.headers['user-agent'],
    };
  }

  private setAuthCookies(
    res: Response,
    tokens: {
      accessToken: string;
      refreshToken: string;
      accessTokenExpiresAt: Date;
      refreshTokenExpiresAt: Date;
    },
  ): void {
    res.cookie('access_token', tokens.accessToken, {
      ...this.cookieOptions.access(),
      expires: tokens.accessTokenExpiresAt,
    });

    res.cookie('refresh_token', tokens.refreshToken, {
      ...this.cookieOptions.refresh(),
      expires: tokens.refreshTokenExpiresAt,
    });
  }

  private clearAuthCookies(res: Response): void {
    res.clearCookie('access_token', this.cookieOptions.access());
    res.clearCookie('refresh_token', this.cookieOptions.refresh());
  }
}
