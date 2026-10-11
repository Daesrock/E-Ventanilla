import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { NewPassword } from './password-policy.js';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class RegisterDto {
  @Transform(trim)
  @IsString()
  @Length(1, 100)
  firstName!: string;

  @Transform(trim)
  @ValidateIf((data) => data.lastName !== undefined)
  @IsString()
  @Length(1, 150)
  lastName?: string;

  @Transform(trim)
  @ValidateIf(
    (data) =>
      data.lastName === undefined ||
      data.paternalLastName !== undefined ||
      data.maternalLastName !== undefined,
  )
  @IsString()
  @Length(1, 100)
  paternalLastName?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() || undefined : value))
  @IsOptional()
  @IsString()
  @Length(1, 100)
  maternalLastName?: string;

  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const text = value.trim();
    return /^[A-Za-z0-9]+$/.test(text) ? text.toUpperCase() : text;
  })
  @Matches(/^[A-Z][AEIOU][A-Z]{2}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/)
  curp!: string;
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  @MaxLength(254)
  email!: string;
  @NewPassword()
  password!: string;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @Length(1, 150)
  municipality?: string;

  @IsOptional()
  @IsString()
  @Matches(/^07\d{3}$/)
  municipalityCode?: string;
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{10}$/)
  phone?: string;
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const text = value.trim();
    if (!text) return undefined;
    return /^[A-Za-zÑñ&0-9]+$/.test(text) ? text.toUpperCase() : text;
  })
  @IsOptional()
  @Matches(/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/)
  rfc?: string;
}

export class LoginDto {
  @Transform(trim)
  @IsString()
  @Length(1, 254)
  identifier!: string;

  @IsString()
  @Length(1, 128)
  password!: string;

  @IsOptional()
  @IsBoolean()
  allowPendingVerification?: boolean;
}

export class IdentifierDto {
  @Transform(trim)
  @IsString()
  @Length(1, 254)
  identifier!: string;
}

export class VerifyDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  @MaxLength(254)
  email!: string;
  @Matches(/^[0-9]{8}$/)
  code!: string;
}

export class ResetCodeDto extends IdentifierDto {
  @Matches(/^[0-9]{8}$/)
  code!: string;
}

export class ResetDto extends ResetCodeDto {
  @NewPassword()
  password!: string;
}
