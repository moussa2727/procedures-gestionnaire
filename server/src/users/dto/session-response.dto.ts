import { ApiProperty } from '@nestjs/swagger';

// Le token brut n'est jamais exposé — seules les métadonnées permettant à
// l'utilisateur d'identifier et de révoquer une session sont retournées.
export class SessionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ required: false, nullable: true })
  deviceInfo?: string | null;

  @ApiProperty({ required: false, nullable: true })
  ipAddress?: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  expiresAt!: Date;

  @ApiProperty({
    description: 'true si cette session correspond à la requête en cours',
  })
  isCurrent!: boolean;
}
