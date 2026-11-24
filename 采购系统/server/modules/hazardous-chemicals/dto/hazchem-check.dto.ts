import { IsOptional, IsString } from 'class-validator';
import type { HazchemCheckRequest } from '@shared/api.interface';

export class HazchemCheckDto implements HazchemCheckRequest {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  cas?: string;
}
