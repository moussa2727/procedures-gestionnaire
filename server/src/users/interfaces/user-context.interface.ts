import { UserRole } from '@prisma/client';

export interface UserDeviceContext {
  ipAddress?: string;
  userAgent?: string;
}

export interface CurrentUserContext {
  id: string;
  email: string;
  role: UserRole;
  sessionId: string;
}
