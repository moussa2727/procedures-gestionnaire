import { NotificationType } from '@prisma/client';

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  entity?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}
