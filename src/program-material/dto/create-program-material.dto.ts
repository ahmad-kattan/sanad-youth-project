import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateProgramMaterialDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  programId: number;

  @IsString()
  @MinLength(3)
  @MaxLength(150)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}