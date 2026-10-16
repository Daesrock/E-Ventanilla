/**
 * Contratos de entrada del panel administrativo. Los mensajes por campo se
 * resuelven en `core/validation/validation.ts`; aquí solo se valida la forma.
 */
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
  ValidateIf,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { NewPassword } from '../auth/password-policy.js';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const emptyToUndefined = ({ value }: { value: unknown }) =>
  value === '' ? undefined : typeof value === 'string' ? value.trim() : value;
const upper = ({ value }: { value: unknown }) =>
  typeof value === 'string' && /^[A-Za-z0-9Ññ]+$/.test(value.trim())
    ? value.trim().toUpperCase()
    : value;

export class BranchCreateDto {
  @Transform(trim) @IsString() @Length(1, 150) name!: string;
  @Transform(upper) @IsIn(['VUGE', 'VIM']) type!: string;
  @IsString() @Matches(/^07\d{3}$/) municipalityCode!: string;
  @Transform(emptyToUndefined)
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MaxLength(150)
  street?: string;
  @Transform(emptyToUndefined)
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MaxLength(20)
  exteriorNumber?: string;
  @Transform(emptyToUndefined)
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MaxLength(20)
  interiorNumber?: string;
  @Transform(emptyToUndefined)
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MaxLength(150)
  neighborhood?: string;
  @Transform(emptyToUndefined)
  @ValidateIf((_, value) => value !== undefined)
  @Matches(/^\d{5}$/)
  postalCode?: string;
  @Transform(emptyToUndefined)
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MaxLength(300)
  address?: string;
  @Transform(emptyToUndefined)
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MaxLength(150)
  phone?: string;
  @Transform(emptyToUndefined)
  @ValidateIf((_, value) => value !== undefined)
  @IsEmail()
  @MaxLength(254)
  email?: string;
  @Transform(emptyToUndefined)
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MaxLength(200)
  officeHours?: string;
  @IsOptional() @IsNumber() @Min(-90) @Max(90) latitude?: number | null;
  @IsOptional() @IsNumber() @Min(-180) @Max(180) longitude?: number | null;
  @ValidateIf((_, value) => value !== undefined) @IsBoolean() published?: boolean;
  @Transform(emptyToUndefined)
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @Length(1, 100)
  sourceKey?: string;
  @Transform(emptyToUndefined)
  @ValidateIf((_, value) => value !== undefined)
  @Matches(/^https:\/\/\S+$/)
  sourceUrl?: string;
  @Transform(emptyToUndefined)
  @ValidateIf((_, value) => value !== undefined)
  @Matches(/^[a-f0-9]{64}$/)
  sourceSha256?: string;
  @ValidateIf((_, value) => value !== undefined)
  @IsISO8601({ strict: true })
  sourceCheckedAt?: string;
}

export class BranchUpdateDto {
  @Transform(trim)
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @Length(1, 150)
  name?: string;
  @Transform(upper)
  @ValidateIf((_, value) => value !== undefined)
  @IsIn(['VUGE', 'VIM'])
  type?: string;
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @Matches(/^07\d{3}$/)
  municipalityCode?: string;
  @Transform(emptyToUndefined) @IsOptional() @IsString() @MaxLength(150) street?: string | null;
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(20)
  exteriorNumber?: string | null;
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(20)
  interiorNumber?: string | null;
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(150)
  neighborhood?: string | null;
  @Transform(emptyToUndefined) @IsOptional() @Matches(/^\d{5}$/) postalCode?: string | null;
  @Transform(emptyToUndefined) @IsOptional() @IsString() @MaxLength(300) address?: string | null;
  @Transform(emptyToUndefined) @IsOptional() @IsString() @MaxLength(150) phone?: string | null;
  @Transform(emptyToUndefined) @IsOptional() @IsEmail() @MaxLength(254) email?: string | null;
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(200)
  officeHours?: string | null;
  @IsOptional() @IsNumber() @Min(-90) @Max(90) latitude?: number | null;
  @IsOptional() @IsNumber() @Min(-180) @Max(180) longitude?: number | null;
  @ValidateIf((_, value) => value !== undefined) @IsBoolean() published?: boolean;
  @ValidateIf((_, value) => value !== undefined) @IsBoolean() active?: boolean;
  @Transform(emptyToUndefined)
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @Length(1, 100)
  sourceKey?: string;
  @Transform(emptyToUndefined)
  @ValidateIf((_, value) => value !== undefined)
  @Matches(/^https:\/\/\S+$/)
  sourceUrl?: string;
  @Transform(emptyToUndefined)
  @ValidateIf((_, value) => value !== undefined)
  @Matches(/^[a-f0-9]{64}$/)
  sourceSha256?: string;
  @ValidateIf((_, value) => value !== undefined)
  @IsISO8601({ strict: true })
  sourceCheckedAt?: string;
}

export class BranchHeadDto {
  @IsOptional() @IsUUID() counterHeadId?: string | null;
}

export class ProcedureCreateDto {
  @Transform(trim) @IsString() @Length(1, 200) name!: string;
  @Transform(emptyToUndefined)
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MaxLength(150)
  category?: string;
  @Transform(emptyToUndefined)
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MaxLength(2000)
  description?: string;
  @Transform(emptyToUndefined)
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MaxLength(4000)
  requirements?: string;
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(9_999_999_999.99)
  cost?: number | null;
  @IsOptional() @IsInt() @Min(1) @Max(1440) estimatedMinutes?: number | null;
  @ValidateIf((_, value) => value !== undefined) @IsBoolean() published?: boolean;
  @Transform(emptyToUndefined)
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @Length(1, 100)
  sourceKey?: string;
  @Transform(emptyToUndefined)
  @ValidateIf((_, value) => value !== undefined)
  @Matches(/^https:\/\/\S+$/)
  sourceUrl?: string;
  @Transform(emptyToUndefined)
  @ValidateIf((_, value) => value !== undefined)
  @Matches(/^[a-f0-9]{64}$/)
  sourceSha256?: string;
  @ValidateIf((_, value) => value !== undefined)
  @IsISO8601({ strict: true })
  sourceCheckedAt?: string;
}

export class ProcedureUpdateDto {
  @Transform(trim)
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @Length(1, 200)
  name?: string;
  @Transform(emptyToUndefined) @IsOptional() @IsString() @MaxLength(150) category?: string | null;
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  requirements?: string | null;
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(9_999_999_999.99)
  cost?: number | null;
  @IsOptional() @IsInt() @Min(1) @Max(1440) estimatedMinutes?: number | null;
  @ValidateIf((_, value) => value !== undefined) @IsBoolean() published?: boolean;
  @ValidateIf((_, value) => value !== undefined) @IsBoolean() active?: boolean;
  @Transform(emptyToUndefined)
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @Length(1, 100)
  sourceKey?: string;
  @Transform(emptyToUndefined)
  @ValidateIf((_, value) => value !== undefined)
  @Matches(/^https:\/\/\S+$/)
  sourceUrl?: string;
  @Transform(emptyToUndefined)
  @ValidateIf((_, value) => value !== undefined)
  @Matches(/^[a-f0-9]{64}$/)
  sourceSha256?: string;
  @ValidateIf((_, value) => value !== undefined)
  @IsISO8601({ strict: true })
  sourceCheckedAt?: string;
}

export class OfferItemDto {
  @IsUUID() procedureId!: string;
  @IsBoolean() active!: boolean;
}

export class OfferUpdateDto {
  @IsArray()
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => OfferItemDto)
  items!: OfferItemDto[];
}

export class SlotCreateDto {
  @IsISO8601({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string;
  @Matches(/^([01][0-9]|2[0-3]):[0-5][0-9]$/) startsAt!: string;
  @Matches(/^([01][0-9]|2[0-3]):[0-5][0-9]$/) endsAt!: string;
  @IsInt() @Min(1) @Max(100000) capacity!: number;
}

export class SlotUpdateDto {
  @ValidateIf((_, value) => value !== undefined)
  @Matches(/^([01][0-9]|2[0-3]):[0-5][0-9]$/)
  startsAt?: string;
  @ValidateIf((_, value) => value !== undefined)
  @Matches(/^([01][0-9]|2[0-3]):[0-5][0-9]$/)
  endsAt?: string;
  @ValidateIf((_, value) => value !== undefined) @IsInt() @Min(1) @Max(100000) capacity?: number;
  @ValidateIf((_, value) => value !== undefined) @IsBoolean() active?: boolean;
}

export class StaffCreateDto {
  @Transform(trim) @IsString() @Length(1, 100) firstName!: string;
  @Transform(trim) @IsString() @Length(1, 100) paternalLastName!: string;
  @Transform(emptyToUndefined)
  @ValidateIf((_, value) => value !== undefined)
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
  @NewPassword() password!: string;
  @IsString() @Matches(/^07\d{3}$/) municipalityCode!: string;
  @Transform(({ value }) => (value === '' ? undefined : value))
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @Matches(/^[0-9]{10}$/)
  phone?: string;
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const text = value.trim();
    if (!text) return undefined;
    return /^[A-Za-zÑñ&0-9]+$/.test(text) ? text.toUpperCase() : text;
  })
  @ValidateIf((_, value) => value !== undefined)
  @Matches(/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/)
  rfc?: string;
  @IsIn(['DEPARTMENT_HEAD', 'COUNTER_HEAD']) role!: string;
  @ValidateIf((_, value) => value !== undefined) @IsBoolean() counterStaff?: boolean;
  @Transform(emptyToUndefined)
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MaxLength(150)
  street?: string;
  @Transform(emptyToUndefined)
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MaxLength(20)
  exteriorNumber?: string;
  @Transform(emptyToUndefined)
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MaxLength(20)
  interiorNumber?: string;
  @Transform(emptyToUndefined)
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MaxLength(150)
  neighborhood?: string;
  @Transform(emptyToUndefined)
  @ValidateIf((_, value) => value !== undefined)
  @Matches(/^\d{5}$/)
  postalCode?: string;
  @Transform(emptyToUndefined)
  @ValidateIf((_, value) => value !== undefined)
  @Matches(/^\d{11}$/)
  socialSecurityNumber?: string;
}

export class StaffUpdateDto {
  @ValidateIf((_, value) => value !== undefined) @IsBoolean() active?: boolean;
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{10}$/)
  phone?: string | null;
  @Transform(emptyToUndefined) @IsOptional() @IsString() @MaxLength(150) street?: string | null;
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(20)
  exteriorNumber?: string | null;
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(20)
  interiorNumber?: string | null;
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(150)
  neighborhood?: string | null;
  @Transform(emptyToUndefined)
  @IsOptional()
  @Matches(/^\d{5}$/)
  postalCode?: string | null;
  @Transform(emptyToUndefined)
  @IsOptional()
  @Matches(/^\d{11}$/)
  socialSecurityNumber?: string | null;
  @ValidateIf((_, value) => value !== undefined) @IsBoolean() counterStaff?: boolean;
}

export class AttendanceDto {
  @IsIn(['arrive', 'start', 'end']) action!: 'arrive' | 'start' | 'end';
  @ValidateIf((_, value) => value !== undefined) @IsUUID() counterId?: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @Length(1, 200) qrToken?: string;
  @ValidateIf((_, value) => value !== undefined) @IsBoolean() late?: boolean;
}
