import { IsEmail, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { NewPassword } from './password-policy.js';

const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;

export class RegisterDto {
  @Transform(trim) @IsString() @Length(1, 100) firstName!: string;
  @Transform(trim) @IsString() @Length(1, 150) lastName!: string;
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toUpperCase() : value)
  @Matches(/^[A-Z][AEIOU][A-Z]{2}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/) curp!: string;
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsEmail() @MaxLength(254) email!: string;
  @NewPassword() password!: string;
  @Transform(trim) @IsOptional() @IsString() @Length(1, 150) municipality?: string;
  @IsOptional() @IsString() @Matches(/^07\d{3}$/) municipalityCode?: string;
  @Transform(trim) @IsOptional() @IsString() @Length(1, 25) phone?: string;
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toUpperCase() : value)
  @IsOptional() @Matches(/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/) rfc?: string;
}

export class LoginDto {
  @Transform(trim) @IsString() @Length(1, 254) identifier!: string;
  @IsString() @Length(1, 128) password!: string;
}

export class IdentifierDto {
  @Transform(trim) @IsString() @Length(1, 254) identifier!: string;
}

export class VerifyDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsEmail() @MaxLength(254) email!: string;
  @Matches(/^\d{8}$/) code!: string;
}

export class ResetDto extends IdentifierDto {
  @Matches(/^\d{8}$/) code!: string;
  @NewPassword() password!: string;
}
