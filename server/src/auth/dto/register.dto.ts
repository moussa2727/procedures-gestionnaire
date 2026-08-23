// auth/dto/register.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserRole } from '@prisma/client';

export class RegisterDto {
  @ApiProperty()
  @IsEmail()
  @MaxLength(100)
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  @MaxLength(255)
  password!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  firstName!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  lastName!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;
}

// L'inscription publique ne crée jamais que des ETUDIANT — devenir
// CONSULTANT passe exclusivement par UsersService.promoteToConsultant(),
// devenir ADMIN n'est jamais possible via aucune route.
export class RegisterResponseDto {
  id!: string;
  email!: string;
  firstName!: string;
  lastName!: string;
  phone?: string;
  role!: UserRole;
  createdAt!: Date;
  isActive!: boolean;
}
