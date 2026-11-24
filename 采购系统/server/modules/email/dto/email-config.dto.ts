import {
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  Max,
  IsBoolean,
  IsEmail,
} from 'class-validator';
import type {
  SaveEmailConfigRequest,
  TestEmailRequest,
} from '@shared/api.interface';

export class SaveEmailConfigDto implements SaveEmailConfigRequest {
  @IsString()
  @IsNotEmpty()
  smtpHost!: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  smtpPort!: number;

  @IsString()
  @IsNotEmpty()
  smtpUser!: string;

  @IsString()
  @IsNotEmpty()
  smtpPass!: string;

  @IsBoolean()
  smtpSecure!: boolean;

  @IsString()
  @IsNotEmpty()
  senderName!: string;

  @IsBoolean()
  isActive!: boolean;
}

export class TestEmailDto implements TestEmailRequest {
  @IsEmail()
  @IsNotEmpty()
  toEmail!: string;
}
