import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateMyProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  publicBio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  publicPreferences?: string;

  @IsOptional()
  @IsBoolean()
  showAvatar?: boolean;

  @IsOptional()
  @IsBoolean()
  showPublicBio?: boolean;

  @IsOptional()
  @IsBoolean()
  showPublicPreferences?: boolean;
}
