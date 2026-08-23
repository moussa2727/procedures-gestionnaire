// auth/auth.module.ts – inchangé (déjà minimal)
import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshStrategy } from './strategies/refresh.strategy';
import { WsJwtStrategy } from './strategies/ws-jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RefreshGuard } from '@/common/guards/refresh.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { WsAuthGuard } from '@/common/guards/ws-auth.guard';
import { ThrottleGuard } from '@/common/guards/throttle.guard';
import { GoogleAuthGuard } from '@/common/guards/google-auth.guard';
import { CookieOptionsFactory } from '@/config/auth.constants';
import { AuthJobsModule } from './jobs/auth-jobs.module';

@Global()
@Module({
  imports: [PassportModule, JwtModule.register({}), AuthJobsModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    SessionService,
    LocalStrategy,
    JwtStrategy,
    RefreshStrategy,
    WsJwtStrategy,
    GoogleStrategy,
    JwtAuthGuard,
    RefreshGuard,
    RolesGuard,
    WsAuthGuard,
    ThrottleGuard,
    GoogleAuthGuard,
    CookieOptionsFactory,
  ],
  exports: [
    AuthService,
    SessionService,
    JwtAuthGuard,
    RefreshGuard,
    RolesGuard,
    WsAuthGuard,
    ThrottleGuard,
    GoogleAuthGuard,
    WsJwtStrategy,
  ],
})
export class AuthModule {}
