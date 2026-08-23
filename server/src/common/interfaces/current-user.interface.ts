import { UserRole } from '@prisma/client';

export interface CurrentUser {
  id: string;
  email: string;
  role: UserRole;
  sessionId: string;
}
