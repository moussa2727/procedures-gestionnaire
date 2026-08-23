import { UserRole } from '@prisma/client';

export class UserResponseDto {
  id!: string;
  email!: string;
  firstName!: string;
  lastName!: string;
  phone?: string;
  photo!: string;
  photoPublicId?: string;
  role!: UserRole;
  isActive!: boolean;
  isDeleted!: boolean;
  isOnline!: boolean;
  lastSeen?: Date;
  createdAt!: Date;
  updatedAt!: Date;
}
