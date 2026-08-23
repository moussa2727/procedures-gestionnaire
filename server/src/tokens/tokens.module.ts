// tokens/tokens.module.ts
import { Module, Global } from '@nestjs/common';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { ResetTokenRepository } from './repositories/reset-token.repository';
import { RevokedTokenRepository } from './repositories/revoked-token.repository';

@Global()
@Module({
  providers: [
    RefreshTokenRepository,
    ResetTokenRepository,
    RevokedTokenRepository,
  ],
  exports: [
    RefreshTokenRepository,
    ResetTokenRepository,
    RevokedTokenRepository,
  ],
})
export class TokensModule {}
