import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  IsBoolean,
} from 'class-validator';

// Le rôle n'est jamais modifiable ici — la promotion ETUDIANT->CONSULTANT
// passe exclusivement par l'endpoint dédié promoteToConsultant(), aucune
// route n'atteint jamais UserRole.ADMIN.
export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  @MaxLength(100)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
