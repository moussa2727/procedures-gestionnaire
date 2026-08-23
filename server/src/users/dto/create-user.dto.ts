import {
  IsEmail,
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsBoolean,
  IsEnum,
} from 'class-validator';
import { UserRole } from '@prisma/client';

export class CreateUserDto {
  @IsEmail({}, { message: 'Email invalide' })
  @MaxLength(100)
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(255)
  password!: string;

  @IsString()
  @MaxLength(50)
  firstName!: string;

  @IsString()
  @MaxLength(50)
  lastName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  // ADMIN n'est jamais accepté ici — invariant README : "un seul compte
  // ADMIN existe dans tout le système", exclusivement créé par le seed.
  @IsEnum([UserRole.CONSULTANT, UserRole.ETUDIANT])
  role!: UserRole;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
