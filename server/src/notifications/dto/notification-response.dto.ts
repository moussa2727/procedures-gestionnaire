// notifications/dto/notification-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { NotificationType } from '@prisma/client';

export class NotificationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: NotificationType })
  type!: NotificationType;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  message!: string;

  @ApiProperty({ required: false, nullable: true })
  entity?: string | null;

  @ApiProperty({ required: false, nullable: true })
  entityId?: string | null;

  @ApiProperty()
  isRead!: boolean;

  @ApiProperty({ required: false, nullable: true })
  readAt?: Date | null;

  @ApiProperty()
  createdAt!: Date;
}
